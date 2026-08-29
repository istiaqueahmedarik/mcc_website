import sql from '../db'
import { fetchVjudgeContestRank } from '../services/vjudgeContestService'
import {
    BASE_SCORING_VARIABLES,
    buildScoredContestReport,
    DEFAULT_COMPOSITE_FORMULA,
    DEFAULT_COMPOSITE_PENALTY_FORMULA,
    defaultScoringConfigForScope,
    normalizeScoringConfig,
    SORTABLE_SCORING_KEYS,
    type ContestScoringConfigInput,
    type ContestSourceInput,
} from '../services/contestScoringService'
import { isValidFormulaIdentifier, parseFormula } from '../services/contestFormula'
import { getVjudgeSession } from '../utils/vjudgeSession'

function normalizeText(value: unknown, maxLength = 500) {
    return String(value ?? '').trim().slice(0, maxLength)
}

function parseJsonArray(value: unknown): any[] {
    if (Array.isArray(value)) return value
    if (typeof value !== 'string') return []
    try {
        const parsed = JSON.parse(value)
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}

function normalizeFormulaKey(value: unknown): string | null {
    const key = normalizeText(value, 48).toLowerCase()
    return isValidFormulaIdentifier(key) ? key : null
}

function normalizeScorePrecision(value: unknown, fallback = 2): number {
    const numeric = Math.floor(Number(value))
    if (!Number.isFinite(numeric)) return fallback
    if (numeric < 0) return 0
    if (numeric > 4) return 4
    return numeric
}

function normalizeDropWorstCount(value: unknown, fallback = 0): number {
    const numeric = Math.floor(Number(value))
    if (!Number.isFinite(numeric) || numeric < 0) return fallback
    return numeric
}

function normalizeSortRules(value: unknown, fallback: any[] = []) {
    const raw = parseJsonArray(value)
    const source = raw.length > 0 ? raw : fallback
    return source.slice(0, 8).map((rule: any) => ({
        key: normalizeText(rule?.key, 80),
        direction: rule?.direction === 'asc' ? 'asc' : 'desc',
    })).filter((rule: any) => rule.key)
}

const formulaKeyForContest = (contestId: string) => {
    const normalized = `c${contestId}`.replace(/[^a-z0-9_]/gi, '_').toLowerCase().slice(0, 48)
    return isValidFormulaIdentifier(normalized) ? normalized : 'contest'
}

async function readJsonBody(c: any): Promise<any> {
    return c.req.json().catch(() => ({}))
}

async function getAdminActor(c: any) {
    const { id, email } = c.get('jwtPayload') || {}
    if (!id || !email) {
        return { error: 'Unauthorized', status: 401 as const }
    }
    const user = await sql`select id, email, admin from users where id = ${id} and email = ${email} and admin = true`
    if (user.length === 0) {
        return { error: 'Unauthorized', status: 401 as const }
    }
    return { id: String(id), email: String(email) }
}

const normalizeContestType = (value: any) => {
    const normalized = String(value || '').trim().toUpperCase()
    if (normalized === 'TSC' || normalized === 'TPC' || normalized === 'TFC') return normalized
    return 'TFC'
}

const clampPercentage = (value: any, fallback: number) => {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) return fallback
    if (numeric < 0) return 0
    if (numeric > 100) return 100
    return numeric
}

const resolveRoomSettings = async (payload: any, existingRow: any = null, roomIdForUpdate: string | null = null) => {
    const contestType = normalizeContestType(payload?.contest_type ?? existingRow?.contest_type)

    let tfcRoomRaw = payload?.tfc_room_id
    if (tfcRoomRaw === undefined) tfcRoomRaw = existingRow?.tfc_room_id ?? null
    const tfcRoomId = typeof tfcRoomRaw === 'string' && tfcRoomRaw.trim().length > 0
        ? tfcRoomRaw.trim()
        : null

    const tfcPercentage = clampPercentage(
        payload?.tfc_percentage ?? existingRow?.tfc_percentage ?? 0,
        0
    )
    const defaultTsc = 100 - tfcPercentage
    const tscPercentage = clampPercentage(
        payload?.tsc_percentage ?? existingRow?.tsc_percentage ?? defaultTsc,
        defaultTsc
    )

    if (contestType !== 'TSC') {
        return {
            contestType,
            tfcRoomId: null,
            tfcPercentage: 0,
            tscPercentage: 100,
            error: null,
        }
    }

    if (roomIdForUpdate && tfcRoomId && String(tfcRoomId) === String(roomIdForUpdate)) {
        return {
            contestType,
            tfcRoomId,
            tfcPercentage,
            tscPercentage,
            error: 'A TSC room cannot reference itself as TFC room',
        }
    }

    if (tfcPercentage > 0 && !tfcRoomId) {
        return {
            contestType,
            tfcRoomId,
            tfcPercentage,
            tscPercentage,
            error: 'tfc_room_id is required when tfc_percentage is greater than 0',
        }
    }

    if (!tfcRoomId) {
        return {
            contestType,
            tfcRoomId: null,
            tfcPercentage,
            tscPercentage,
            error: null,
        }
    }

    const linked = await sql`SELECT id, contest_type FROM public."Contest_report_room" WHERE id=${tfcRoomId} LIMIT 1`
    if (linked.length === 0) {
        return {
            contestType,
            tfcRoomId,
            tfcPercentage,
            tscPercentage,
            error: 'Selected TFC room not found',
        }
    }

    if (normalizeContestType(linked[0].contest_type) !== 'TFC') {
        return {
            contestType,
            tfcRoomId,
            tfcPercentage,
            tscPercentage,
            error: 'Selected reference room must be of type TFC',
        }
    }

    return {
        contestType,
        tfcRoomId,
        tfcPercentage,
        tscPercentage,
        error: null,
    }
}

function sourceHandlesForGlobalRow(row: any) {
    return [
        ...(Array.isArray(row?.sourceHandles) ? row.sourceHandles : []),
        row?.username,
        row?.realName,
    ].map((value) => normalizeText(value, 160).toLowerCase()).filter(Boolean)
}

function applyGlobalDemeritsToRankData(rankData: any, contestDemerits: any[]) {
    const cloned = JSON.parse(JSON.stringify(rankData || {}))
    const demeritsByHandle = new Map<string, any[]>()
    contestDemerits.forEach((demerit: any) => {
        const handle = normalizeText(demerit?.vjudge_id, 160).toLowerCase()
        if (!handle) return
        const rows = demeritsByHandle.get(handle) || []
        rows.push(demerit)
        demeritsByHandle.set(handle, rows)
    })

    if (!Array.isArray(cloned.teams)) cloned.teams = []
    cloned.teams.forEach((team: any) => {
        const handles = new Set(sourceHandlesForGlobalRow(team))
        const userDemerits = Array.from(new Set(
            Array.from(handles).flatMap((handle) => demeritsByHandle.get(handle) || []),
        ))
        const points = userDemerits.reduce((sum, item: any) => sum + Number(item?.demerit_point || 0), 0)
        team.identityKey = team.identityKey || normalizeText(team.username, 180).toLowerCase()
        team.sourceHandles = Array.from(handles)
        team.demeritPoints = Number(team.demeritPoints || 0) + points
        team.demerits = userDemerits
        if (points > 0) {
            team.originalFinalScore = Number(team.finalScore || 0)
            team.finalScore = Math.max(0, Number(team.finalScore || 0) - points)
            team.penalty = Number(team.penalty || 0) + points * 100
        }
    })

    return cloned
}

function parsePublicReportData(row: any) {
    const value = row?.JSON_string
    if (!value) return null
    if (typeof value === 'object') return value
    try {
        return JSON.parse(value)
    } catch {
        return null
    }
}

function buildGlobalTfcScoreMap(referenceReport: any) {
    const scoreByTeam = new Map<string, number>()
    const data = parsePublicReportData(referenceReport)
    const users = Array.isArray(data?.users) ? data.users : []
    users.forEach((user: any) => {
        const score = Number(user?.score ?? user?.effectiveTotalScore ?? user?.effectiveSolved ?? user?.totalScore ?? 0)
        const normalizedScore = Number.isFinite(score) ? score : 0
        const aliases = [
            user?.identityKey,
            user?.username,
            user?.realName,
            ...(Array.isArray(user?.sourceHandles) ? user.sourceHandles : []),
        ]
        aliases.forEach((key) => {
            const normalized = normalizeText(key, 180).toLowerCase()
            if (normalized) scoreByTeam.set(normalized, normalizedScore)
        })
    })
    return scoreByTeam
}

async function loadGlobalRoom(roomId: string) {
    const rows = await sql`
        SELECT *
        FROM public."Contest_report_room"
        WHERE id = ${roomId}
        LIMIT 1
    `
    return rows[0] || null
}

async function loadGlobalRoomItems(roomId: string) {
    return sql`
        SELECT id, room_id, contest_id, contest_name, weight, formula_key, merge_group_id, created_at
        FROM public."Contest_room_contests"
        WHERE room_id = ${roomId}
        ORDER BY created_at ASC, id ASC
    `
}

function globalItemsToScoringSources(items: any[], rankDataByItemId: Map<string, any> | null = null): ContestSourceInput[] {
    return items.map((item: any, index: number) => {
        const contestId = normalizeText(item.contest_id, 80)
        const title = normalizeText(item.contest_name, 180) || `Contest ${contestId}`
        const rankData = rankDataByItemId?.get(String(item.id)) || {
            contestInfo: {
                id: contestId,
                title,
                provider: 'vjudge',
                externalContestId: contestId,
            },
            teams: [],
        }
        return {
            itemId: String(item.id),
            contestKey: contestId || String(index + 1),
            formulaKey: item.formula_key || formulaKeyForContest(contestId),
            title,
            provider: 'vjudge',
            externalContestId: contestId,
            weight: Number(item.weight || 1),
            sortOrder: index,
            rankData,
            demerits: [],
        }
    })
}

async function loadGlobalScoringGroups(roomId: string) {
    const rows = await sql`
        SELECT merge_group.*,
               COALESCE(
                 jsonb_agg(contest.id ORDER BY contest.created_at ASC, contest.id ASC)
                   FILTER (WHERE contest.id IS NOT NULL),
                 '[]'::jsonb
               ) AS contest_item_ids
        FROM public.contest_report_merge_groups merge_group
        LEFT JOIN public."Contest_room_contests" contest
          ON contest.merge_group_id = merge_group.id
         AND contest.room_id = merge_group.room_id
        WHERE merge_group.room_id = ${roomId}
        GROUP BY merge_group.id
        ORDER BY MIN(contest.created_at) ASC NULLS LAST, merge_group.created_at ASC, merge_group.id ASC
    `

    return rows.map((row: any) => ({
        id: String(row.id),
        name: row.name,
        formulaKey: row.formula_key,
        formula: row.formula || row.solved_score_formula || DEFAULT_COMPOSITE_FORMULA,
        solvedScoreFormula: row.formula || row.solved_score_formula || DEFAULT_COMPOSITE_FORMULA,
        penaltyScoreFormula: row.penalty_score_formula || DEFAULT_COMPOSITE_PENALTY_FORMULA,
        contestItemIds: parseJsonArray(row.contest_item_ids).map(String),
    }))
}

function rowToGlobalScoringConfig(row: any, groups: any[], fallback: ContestScoringConfigInput): Required<ContestScoringConfigInput> {
    if (!row) {
        return normalizeScoringConfig({ ...fallback, groups, version: 0 }, fallback)
    }
    return normalizeScoringConfig({
        groups,
        formula: row.formula || row.solved_score_formula,
        solvedScoreFormula: row.formula || row.solved_score_formula,
        penaltyScoreFormula: row.penalty_score_formula,
        scorePrecision: Number(row.score_precision),
        sortRules: parseJsonArray(row.sort_rules),
        excludedUnitKeys: parseJsonArray(row.excluded_unit_keys),
        dropWorstCount: Number(row.drop_worst_count || 0),
        version: Number(row.version || 0),
    }, fallback)
}

async function loadGlobalScoringConfig(roomId: string, roomType: string, items: any[]) {
    const [groups, configRows] = await Promise.all([
        loadGlobalScoringGroups(roomId),
        sql`
            SELECT *
            FROM public.contest_report_scoring_configs
            WHERE room_id = ${roomId}
            LIMIT 1
        `,
    ])
    const unitKeys = items.map((item: any) => item.formula_key || formulaKeyForContest(String(item.contest_id || '')))
    const fallback = defaultScoringConfigForScope('global', roomType, unitKeys)
    const config = rowToGlobalScoringConfig(configRows[0] || null, groups, fallback)
    return { config, groups, version: Number(configRows[0]?.version || 0), exists: configRows.length > 0 }
}

function normalizeGlobalScoringGroupPayload(group: any) {
    const name = normalizeText(group?.name, 160)
    const formulaKey = normalizeFormulaKey(group?.formulaKey ?? group?.formula_key)
    const solvedScoreFormula = normalizeText(group?.solvedScoreFormula ?? group?.solved_score_formula ?? group?.formula, 1000) || DEFAULT_COMPOSITE_FORMULA
    const penaltyScoreFormula = normalizeText(group?.penaltyScoreFormula ?? group?.penalty_score_formula, 1000) || DEFAULT_COMPOSITE_PENALTY_FORMULA
    const contestItemIds = parseJsonArray(group?.contestItemIds ?? group?.contest_item_ids)
        .map((item) => normalizeText(item, 80))
        .filter(Boolean)

    if (!name) throw new Error('Composite name is required')
    if (!formulaKey) throw new Error('Composite key must match ^[a-z][a-z0-9_]{0,47}$')
    parseFormula(solvedScoreFormula)
    parseFormula(penaltyScoreFormula)
    if (contestItemIds.length < 2) throw new Error(`Composite "${name}" must include at least two contests`)

    return {
        name,
        formulaKey,
        formula: solvedScoreFormula,
        solvedScoreFormula,
        penaltyScoreFormula,
        contestItemIds: Array.from(new Set(contestItemIds)),
    }
}

function normalizeGlobalScoringPayload(body: any, fallback: ContestScoringConfigInput): ContestScoringConfigInput {
    const source = body?.config && typeof body.config === 'object' ? body.config : body || {}
    const groups = parseJsonArray(source.groups).map(normalizeGlobalScoringGroupPayload)
    const solvedScoreFormula = normalizeText(source.solvedScoreFormula ?? source.solved_score_formula ?? source.formula ?? fallback.solvedScoreFormula ?? fallback.formula, 1000)
    const penaltyScoreFormula = normalizeText(source.penaltyScoreFormula ?? source.penalty_score_formula ?? fallback.penaltyScoreFormula, 1000)
    parseFormula(solvedScoreFormula)
    parseFormula(penaltyScoreFormula)

    return {
        groups,
        formula: solvedScoreFormula,
        solvedScoreFormula,
        penaltyScoreFormula,
        scorePrecision: normalizeScorePrecision(source.scorePrecision ?? source.score_precision, fallback.scorePrecision),
        sortRules: normalizeSortRules(source.sortRules ?? source.sort_rules, fallback.sortRules || []),
        excludedUnitKeys: parseJsonArray(source.excludedUnitKeys ?? source.excluded_unit_keys)
            .map((key) => normalizeFormulaKey(key))
            .filter(Boolean) as string[],
        dropWorstCount: normalizeDropWorstCount(source.dropWorstCount ?? source.drop_worst_count, fallback.dropWorstCount),
    }
}

async function buildGlobalScoredReportSnapshot(
    roomId: string,
    vjudgeSession: string | undefined,
    configOverride: ContestScoringConfigInput | null = null,
    options: { contestId?: string | null } = {},
) {
    const room = await loadGlobalRoom(roomId)
    if (!room) throw Object.assign(new Error('Contest room not found'), { statusCode: 404 })
    if (!vjudgeSession) {
        throw Object.assign(new Error('VJudge session not provided'), {
            statusCode: 401,
            code: 'NO_VJUDGE_SESSION',
        })
    }

    const allItems = await loadGlobalRoomItems(roomId)
    const requestedContestId = normalizeText(options.contestId, 80)
    const items = requestedContestId
        ? allItems.filter((item: any) => String(item.contest_id) === requestedContestId)
        : allItems
    if (items.length === 0) {
        throw Object.assign(new Error('No contests found in this room'), { statusCode: 404 })
    }

    const rankDataByItemId = new Map<string, any>()
    const missingContests: any[] = []
    for (const item of items) {
        const contestId = normalizeText(item.contest_id, 80)
        const title = normalizeText(item.contest_name, 180) || `Contest ${contestId}`
        const demerits = await sql`
            SELECT *
            FROM public."Demerit"
            WHERE contest_id = ${contestId}
            ORDER BY created_at DESC
        `
        const fetched = await fetchVjudgeContestRank(contestId, vjudgeSession, undefined)
        if (fetched.statusCode !== 200 || !Array.isArray(fetched.body?.teams)) {
            missingContests.push({
                id: item.id,
                contestId,
                title,
                statusCode: fetched.statusCode,
                error: fetched.body?.message || fetched.body?.error || 'Failed to fetch contest rank',
            })
            continue
        }
        rankDataByItemId.set(String(item.id), applyGlobalDemeritsToRankData({
            ...(fetched.body || {}),
            provider: 'vjudge',
            contestInfo: {
                ...(fetched.body?.contestInfo || {}),
                id: contestId,
                provider: 'vjudge',
                externalContestId: contestId,
                title,
            },
        }, demerits))
    }

    if (rankDataByItemId.size === 0) {
        throw Object.assign(new Error('Fetch at least one contest before generating a report'), {
            statusCode: 400,
            missingContests,
        })
    }

    const roomType = normalizeContestType(room.contest_type)
    const sources = globalItemsToScoringSources(items, rankDataByItemId)
    const saved = requestedContestId
        ? {
            config: defaultScoringConfigForScope('global', roomType, sources.map((source) => String(source.formulaKey || ''))),
            version: 0,
        }
        : await loadGlobalScoringConfig(roomId, roomType, items)
    let legacyTsc: {
        tfcScoreByParticipant?: Map<string, number>;
        tfcPercentage?: number;
        tscPercentage?: number;
    } | null = null

    if (!requestedContestId && roomType === 'TSC') {
        const referenceRows = room.tfc_room_id
            ? await sql`
                SELECT *
                FROM public."Public_contest_report"
                WHERE "Shared_contest_id" = ${room.tfc_room_id}
                ORDER BY created_at DESC
                LIMIT 1
            `
            : []
        const tfcPercentage = clampPercentage(room.tfc_percentage, 0)
        legacyTsc = {
            tfcScoreByParticipant: buildGlobalTfcScoreMap(referenceRows[0] || null),
            tfcPercentage,
            tscPercentage: clampPercentage(room.tsc_percentage, 100 - tfcPercentage),
        }
    }

    const config = configOverride
        ? normalizeScoringConfig(configOverride, saved.config)
        : saved.config
    const scored = buildScoredContestReport({
        roomId,
        roomName: room['Room Name'],
        roomType,
        scope: 'global',
        sources,
        config,
        defaultConfig: defaultScoringConfigForScope('global', roomType, sources.map((source) => String(source.formulaKey || ''))),
        legacyTsc,
        missingContests,
    })

    return {
        room,
        items,
        scored,
        config,
        configVersion: saved.version,
        missingContests,
    }
}

export const insertContestRoom = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    const user = await sql`select * from users where id = ${id} and email = ${email} and admin = true`
    if (user.length === 0) {
        return c.json({ error: 'Unauthorized' }, 401)
    }

    const payload = await c.req.json()
    const { room_name } = payload
    if (!room_name || !String(room_name).trim()) {
        return c.json({ error: 'room_name required' }, 400)
    }

    const settings = await resolveRoomSettings(payload)
    if (settings.error) {
        return c.json({ error: settings.error }, 400)
    }

    try {
        const result = await sql`
            INSERT INTO "Contest_report_room" ("Room Name", contest_type, tfc_room_id, tfc_percentage, tsc_percentage)
            VALUES (${String(room_name).trim()}, ${settings.contestType}, ${settings.tfcRoomId}, ${settings.tfcPercentage}, ${settings.tscPercentage})
            RETURNING *
        `
        return c.json({ result, success: true })
    } catch (error) {
        return c.json({ error: 'error' }, 400)
    }
}

export const getAllContestRooms = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    const user = await sql`select * from users where id = ${id} and email = ${email} and admin = true`
    if (user.length === 0) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    try {
        const result = await sql`SELECT * FROM "Contest_report_room" ORDER BY created_at DESC`
        return c.json({ result, success: true })
    } catch (error) {
        return c.json({ error: 'error' }, 400)
    }
}

export const getContestRoom = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    const user = await sql`select * from users where id = ${id} and email = ${email} and admin = true`
    if (user.length === 0) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    const { room_id } = await c.req.json()
    try {
        const result = await sql`SELECT * FROM "Contest_report_room" WHERE id = ${room_id}`
        return c.json({ result, success: true })
    } catch (error) {
        return c.json({ error: 'Room not found' }, 400)
    }
}

export const updateContestRoom = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    const user = await sql`select * from users where id = ${id} and email = ${email} and admin = true`
    if (user.length === 0) {
        return c.json({ error: 'Unauthorized' }, 401)
    }

    const payload = await c.req.json()
    const { room_id, room_name } = payload
    if (!room_id) {
        return c.json({ error: 'room_id required' }, 400)
    }

    const currentRows = await sql`SELECT * FROM "Contest_report_room" WHERE id = ${room_id} LIMIT 1`
    if (currentRows.length === 0) {
        return c.json({ error: 'Room not found' }, 404)
    }

    const currentRow = currentRows[0]
    const nextRoomName = typeof room_name === 'string' && room_name.trim().length > 0
        ? room_name.trim()
        : currentRow['Room Name']

    const settings = await resolveRoomSettings(payload, currentRow, room_id)
    if (settings.error) {
        return c.json({ error: settings.error }, 400)
    }

    try {
        const result = await sql`
            UPDATE "Contest_report_room"
            SET
                "Room Name" = ${nextRoomName},
                contest_type = ${settings.contestType},
                tfc_room_id = ${settings.tfcRoomId},
                tfc_percentage = ${settings.tfcPercentage},
                tsc_percentage = ${settings.tscPercentage}
            WHERE id = ${room_id}
            RETURNING *
        `
        return c.json({ result, success: true })
    } catch (error) {
        return c.json({ error: 'error' }, 400)
    }
}

export const deleteContestRoom = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    const user = await sql`select * from users where id = ${id} and email = ${email} and admin = true`
    if (user.length === 0) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    const { room_id } = await c.req.json()

    if (!room_id) {
        return c.json({ error: 'room_id required' }, 400)
    }

    try {
        const linkedCollection = await sql`
            SELECT id
            FROM public.team_collections
            WHERE room_id=${room_id}
            LIMIT 1
        `
        if (linkedCollection.length > 0) {
            return c.json({ error: 'Cannot delete room with existing team collections. Delete those collections first.' }, 400)
        }

        await sql`DELETE FROM "Contest_room_contests" WHERE room_id=${room_id}`
        await sql`DELETE FROM public."Public_contest_report" WHERE "Shared_contest_id"=${room_id}`

        const result = await sql`DELETE FROM "Contest_report_room" WHERE id = ${room_id} RETURNING *`
        return c.json({ result, success: true })
    } catch (error: any) {
        return c.json({ error: error?.message || 'Something went wrong' }, 400)
    }
}

export const getContestRoomScoring = async (c: any) => {
    const actor = await getAdminActor(c)
    if ('error' in actor) return c.json({ error: actor.error }, actor.status)

    try {
        const roomId = c.req.param('roomId') || normalizeText(c.req.query('roomId'), 80)
        if (!roomId) return c.json({ error: 'roomId required' }, 400)
        const room = await loadGlobalRoom(roomId)
        if (!room) return c.json({ error: 'Contest room not found' }, 404)

        const items = await loadGlobalRoomItems(roomId)
        const scoring = await loadGlobalScoringConfig(roomId, normalizeContestType(room.contest_type), items)
        const previewSources = globalItemsToScoringSources(items)
        const scaffold = previewSources.length > 0
            ? buildScoredContestReport({
                roomId,
                roomName: room['Room Name'],
                roomType: normalizeContestType(room.contest_type),
                scope: 'global',
                sources: previewSources,
                config: scoring.config,
                defaultConfig: defaultScoringConfigForScope(
                    'global',
                    normalizeContestType(room.contest_type),
                    previewSources.map((source) => String(source.formulaKey || '')),
                ),
            })
            : null

        return c.json({
            success: true,
            config: scoring.config,
            expectedVersion: scoring.version,
            variables: scaffold?.scoring?.variables || BASE_SCORING_VARIABLES,
            sortKeys: scaffold?.scoring?.sortKeys || SORTABLE_SCORING_KEYS,
            metrics: scaffold?.scoring?.metrics || [],
            filterFields: scaffold?.scoring?.filterFields || [],
            functions: scaffold?.scoring?.functions || [],
            resultUnits: scaffold?.scoring?.resultUnits || [],
        })
    } catch (error: any) {
        console.error('Error reading contest room scoring config:', error)
        return c.json({ error: error?.message || 'Failed to read scoring config' }, 500)
    }
}

export const previewContestRoomScoring = async (c: any) => {
    const actor = await getAdminActor(c)
    if ('error' in actor) return c.json({ error: actor.error }, actor.status)

    try {
        const roomId = c.req.param('roomId')
        const body = await readJsonBody(c)
        const room = await loadGlobalRoom(roomId)
        if (!room) return c.json({ error: 'Contest room not found' }, 404)
        const items = await loadGlobalRoomItems(roomId)
        if (items.length === 0) return c.json({ error: 'Add at least one contest before previewing scoring' }, 400)
        const saved = await loadGlobalScoringConfig(roomId, normalizeContestType(room.contest_type), items)
        const requestedConfig = normalizeGlobalScoringPayload(body?.config ? body : { config: body }, saved.config)

        const snapshot = await buildGlobalScoredReportSnapshot(
            roomId,
            getVjudgeSession(c),
            { ...requestedConfig, version: saved.version },
        )
        return c.json({
            success: true,
            preview: snapshot.scored,
            config: snapshot.config,
            expectedVersion: saved.version,
        })
    } catch (error: any) {
        console.error('Error previewing contest room scoring:', error)
        return c.json({
            error: error?.message || 'Failed to preview scoring config',
            code: error?.code,
            missingContests: error?.missingContests,
        }, error?.statusCode || 400)
    }
}

export const updateContestRoomScoring = async (c: any) => {
    const actor = await getAdminActor(c)
    if ('error' in actor) return c.json({ error: actor.error }, actor.status)

    try {
        const roomId = c.req.param('roomId')
        const room = await loadGlobalRoom(roomId)
        if (!room) return c.json({ error: 'Contest room not found' }, 404)

        const items = await loadGlobalRoomItems(roomId)
        if (items.length === 0) return c.json({ error: 'Add at least one contest before configuring scoring' }, 400)

        const saved = await loadGlobalScoringConfig(roomId, normalizeContestType(room.contest_type), items)
        const body = await readJsonBody(c)
        const expectedVersion = Number(body?.expectedVersion ?? body?.expected_version ?? saved.version)
        const requestedConfig = normalizeGlobalScoringPayload(body?.config ? body : { config: body }, saved.config)

        buildScoredContestReport({
            roomId,
            roomName: room['Room Name'],
            roomType: normalizeContestType(room.contest_type),
            scope: 'global',
            sources: globalItemsToScoringSources(items),
            config: requestedConfig,
            defaultConfig: saved.config,
        })

        const result = await sql.begin(async (tx) => {
            const lockedRows = await tx`
                SELECT version
                FROM public.contest_report_scoring_configs
                WHERE room_id = ${roomId}
                FOR UPDATE
            `
            const currentVersion = Number(lockedRows[0]?.version || 0)
            if (expectedVersion !== currentVersion) {
                return { conflict: true, currentVersion }
            }

            const nextVersion = currentVersion + 1
            await tx`
                UPDATE public."Contest_room_contests"
                SET merge_group_id = null
                WHERE room_id = ${roomId}
            `
            await tx`
                DELETE FROM public.contest_report_merge_groups
                WHERE room_id = ${roomId}
            `

            for (const group of requestedConfig.groups || []) {
                const inserted = await tx`
                    INSERT INTO public.contest_report_merge_groups (
                        room_id,
                        name,
                        formula_key,
                        formula,
                        solved_score_formula,
                        penalty_score_formula,
                        created_by,
                        updated_by
                    )
                    VALUES (
                        ${roomId},
                        ${group.name},
                        ${group.formulaKey},
                        ${group.solvedScoreFormula || group.formula || DEFAULT_COMPOSITE_FORMULA},
                        ${group.solvedScoreFormula || group.formula || DEFAULT_COMPOSITE_FORMULA},
                        ${group.penaltyScoreFormula || DEFAULT_COMPOSITE_PENALTY_FORMULA},
                        ${actor.id},
                        ${actor.id}
                    )
                    RETURNING id
                `
                await tx`
                    UPDATE public."Contest_room_contests"
                    SET merge_group_id = ${inserted[0].id}
                    WHERE room_id = ${roomId}
                      AND id = ANY(${group.contestItemIds})
                `
            }

            await tx`
                INSERT INTO public.contest_report_scoring_configs (
                    room_id,
                    formula,
                    solved_score_formula,
                    penalty_score_formula,
                    score_precision,
                    sort_rules,
                    excluded_unit_keys,
                    drop_worst_count,
                    version,
                    created_by,
                    updated_by
                )
                VALUES (
                    ${roomId},
                    ${requestedConfig.formula},
                    ${requestedConfig.solvedScoreFormula},
                    ${requestedConfig.penaltyScoreFormula},
                    ${requestedConfig.scorePrecision},
                    ${tx.json(requestedConfig.sortRules || [])},
                    ${tx.json(requestedConfig.excludedUnitKeys || [])},
                    ${requestedConfig.dropWorstCount || 0},
                    ${nextVersion},
                    ${actor.id},
                    ${actor.id}
                )
                ON CONFLICT (room_id)
                DO UPDATE SET
                    formula = EXCLUDED.formula,
                    solved_score_formula = EXCLUDED.solved_score_formula,
                    penalty_score_formula = EXCLUDED.penalty_score_formula,
                    score_precision = EXCLUDED.score_precision,
                    sort_rules = EXCLUDED.sort_rules,
                    excluded_unit_keys = EXCLUDED.excluded_unit_keys,
                    drop_worst_count = EXCLUDED.drop_worst_count,
                    version = EXCLUDED.version,
                    updated_by = EXCLUDED.updated_by,
                    updated_at = now()
            `
            await tx`
                UPDATE public."Public_contest_report"
                SET is_stale = true,
                    "Updated_at" = now()
                WHERE "Shared_contest_id" = ${roomId}
            `

            return { conflict: false, version: nextVersion }
        })

        if (result.conflict) {
            return c.json({
                error: 'Scoring config changed while you were editing',
                expectedVersion,
                currentVersion: result.currentVersion,
            }, 409)
        }

        const refreshedItems = await loadGlobalRoomItems(roomId)
        const refreshed = await loadGlobalScoringConfig(roomId, normalizeContestType(room.contest_type), refreshedItems)
        return c.json({
            success: true,
            config: refreshed.config,
            expectedVersion: refreshed.version,
        })
    } catch (error: any) {
        console.error('Error saving contest room scoring config:', error)
        return c.json({ error: error?.message || 'Failed to save scoring config' }, 400)
    }
}

export const generateContestRoomReport = async (c: any) => {
    const actor = await getAdminActor(c)
    if ('error' in actor) return c.json({ error: actor.error }, actor.status)

    try {
        const roomId = c.req.param('roomId')
        const body = await readJsonBody(c)
        const snapshot = await buildGlobalScoredReportSnapshot(
            roomId,
            getVjudgeSession(c),
            null,
            { contestId: body?.contestId ?? body?.contest_id },
        )
        return c.json({
            success: true,
            merged: snapshot.scored,
            missingContests: snapshot.missingContests,
        })
    } catch (error: any) {
        console.error('Error generating contest room report:', error)
        return c.json({
            error: error?.message || 'Failed to generate contest room report',
            code: error?.code,
            missingContests: error?.missingContests,
        }, error?.statusCode || 500)
    }
}

export const publishContestRoomReport = async (c: any) => {
    const actor = await getAdminActor(c)
    if ('error' in actor) return c.json({ error: actor.error }, actor.status)

    try {
        const roomId = c.req.param('roomId')
        const snapshot = await buildGlobalScoredReportSnapshot(
            roomId,
            getVjudgeSession(c),
        )
        const jsonString = JSON.stringify(snapshot.scored)
        const result = await sql.begin(async (tx) => {
            const existing = await tx`
                SELECT id
                FROM public."Public_contest_report"
                WHERE "Shared_contest_id" = ${roomId}
                ORDER BY created_at DESC
                LIMIT 1
                FOR UPDATE
            `
            if (existing.length > 0) {
                return tx`
                    UPDATE public."Public_contest_report"
                    SET "JSON_string" = ${jsonString},
                        scoring_config_version = ${snapshot.configVersion},
                        is_stale = false,
                        "Updated_at" = now()
                    WHERE id = ${existing[0].id}
                    RETURNING *
                `
            }
            return tx`
                INSERT INTO public."Public_contest_report" (
                    "Shared_contest_id",
                    "JSON_string",
                    scoring_config_version,
                    is_stale
                )
                VALUES (
                    ${roomId},
                    ${jsonString},
                    ${snapshot.configVersion},
                    false
                )
                RETURNING *
            `
        })

        return c.json({
            success: true,
            result,
            report: result[0] || null,
            merged: snapshot.scored,
            missingContests: snapshot.missingContests,
        })
    } catch (error: any) {
        console.error('Error publishing contest room report:', error)
        return c.json({
            error: error?.message || 'Failed to publish contest room report',
            code: error?.code,
            missingContests: error?.missingContests,
        }, error?.statusCode || 500)
    }
}
