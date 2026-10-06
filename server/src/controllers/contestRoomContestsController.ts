import sql from '../db'
import { isValidFormulaIdentifier } from '../services/contestFormula'
import {
    contestProviderLabel,
    isValidExternalContestId,
    normalizeContestProvider,
    normalizeExternalContestIdForProvider,
    type ClassroomContestProvider,
} from '../services/classroomContestRankService'
import {
    CODEFORCES_GROUP_IDENTITY_MODES,
    CODEFORCES_SOURCE_TYPES,
    normalizeCodeforcesSourceForType,
    parseCodeforcesIdentityCsv,
    type CodeforcesGroupIdentityMode,
    type CodeforcesIdentityCsvRow,
    type CodeforcesSourceType,
} from '../services/codeforcesIdentityService'
import { markGlobalContestReportsStale } from '../services/globalContestReportSnapshotService'

const normalizeText = (value: unknown, maxLength = 500) => String(value ?? '').trim().slice(0, maxLength)

function normalizeCodeforcesSourceType(value: unknown): CodeforcesSourceType | null {
    const type = normalizeText(value, 20).toLowerCase()
    return CODEFORCES_SOURCE_TYPES.includes(type as CodeforcesSourceType) ? type as CodeforcesSourceType : null
}

function normalizeGroupIdentityMode(value: unknown): CodeforcesGroupIdentityMode | null {
    const mode = normalizeText(value, 40).toLowerCase()
    return CODEFORCES_GROUP_IDENTITY_MODES.includes(mode as CodeforcesGroupIdentityMode)
        ? mode as CodeforcesGroupIdentityMode
        : null
}

async function resolveCsvStudentAccounts(rows: CodeforcesIdentityCsvRow[]) {
    const studentIds = rows.map((row) => row.studentId)
    const accounts = await sql`
        SELECT id, mist_id
        FROM public.users
        WHERE mist_id::text = ANY(${studentIds})
          AND COALESCE(admin, false) = false
          AND COALESCE(trainer, false) = false
          AND COALESCE(is_pre_enrolled, false) = false
          AND mist_id IS NOT NULL
          AND NULLIF(btrim(full_name), '') IS NOT NULL
    `
    const grouped = new Map<string, any[]>()
    accounts.forEach((account: any) => {
        const studentId = String(account.mist_id)
        grouped.set(studentId, [...(grouped.get(studentId) || []), account])
    })
    return rows.map((row) => {
        const matches = grouped.get(row.studentId) || []
        if (matches.length === 0) throw new Error(`Row ${row.rowNumber}: no eligible MCC account has student ID ${row.studentId}`)
        if (matches.length > 1) throw new Error(`Row ${row.rowNumber}: student ID ${row.studentId} matches multiple MCC accounts`)
        return { ...row, studentUserId: String(matches[0].id) }
    })
}

async function replaceCodeforcesMappings(
    tx: any,
    contestItemId: string,
    actorId: string,
    rows: Array<CodeforcesIdentityCsvRow & { studentUserId: string }>,
) {
    await tx`
        DELETE FROM public.contest_report_codeforces_identity_mappings
        WHERE contest_item_id = ${contestItemId}
    `
    if (rows.length === 0) return
    const inserts = rows.map((row) => ({
        contest_item_id: contestItemId,
        provider_username: row.username,
        provider_username_normalized: row.normalizedUsername,
        student_user_id: row.studentUserId,
        created_by: actorId,
        updated_by: actorId,
    }))
    await tx`
        INSERT INTO public.contest_report_codeforces_identity_mappings
        ${tx(inserts, 'contest_item_id', 'provider_username', 'provider_username_normalized', 'student_user_id', 'created_by', 'updated_by')}
    `
}

const formulaKeyForContest = (provider: ClassroomContestProvider, contestId: string) => {
    const prefix = provider === 'codeforces' ? 'cf_' : 'c'
    const normalized = `${prefix}${contestId}`.replace(/[^a-z0-9_]/gi, '_').toLowerCase().slice(0, 48)
    return isValidFormulaIdentifier(normalized) ? normalized : 'contest'
}

async function nextContestFormulaKey(roomId: string, provider: ClassroomContestProvider, contestId: string) {
    const base = formulaKeyForContest(provider, contestId)
    const rows = await sql`
        SELECT formula_key
        FROM public."Contest_room_contests"
        WHERE room_id = ${roomId}
          AND formula_key LIKE ${`${base}%`}
        UNION
        SELECT formula_key
        FROM public.contest_report_merge_groups
        WHERE room_id = ${roomId}
          AND formula_key LIKE ${`${base}%`}
    `
    const used = new Set(rows.map((row: any) => String(row.formula_key)))
    if (!used.has(base)) return base
    for (let index = 2; index < 1000; index += 1) {
        const suffix = `_${index}`
        const candidate = `${base.slice(0, 48 - suffix.length)}${suffix}`
        if (!used.has(candidate)) return candidate
    }
    throw new Error('Unable to allocate a contest formula key')
}

export const insertContestRoomContest = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    const user = await sql`select * from users where id = ${id} and email = ${email} and admin = true`
    if (user.length === 0) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    const {
        room_id,
        contest_id,
        name,
        provider: providerValue,
        codeforces_source_type: sourceTypeValue,
        codeforces_group_identity_mode: groupModeValue,
        mapping_csv: mappingCsv,
    } = await c.req.json()

    const normalizedRoomId = String(room_id || '').trim()
    const provider = normalizeContestProvider(providerValue)
    const codeforcesSourceType = provider === 'codeforces' ? normalizeCodeforcesSourceType(sourceTypeValue) : null
    if (provider === 'codeforces' && !codeforcesSourceType) {
        return c.json({ error: 'Choose whether this is a Public, Gym, Group, or EDU Codeforces contest' }, 400)
    }
    const normalizedContestId = provider === 'codeforces'
        ? normalizeCodeforcesSourceForType(codeforcesSourceType!, contest_id)
        : normalizeExternalContestIdForProvider(provider, contest_id)
    const normalizedName = normalizeText(name, 180)
    const groupIdentityMode = codeforcesSourceType === 'group' ? normalizeGroupIdentityMode(groupModeValue) : null

    if (provider === 'codeforces' && !normalizedContestId) {
        const guidance = codeforcesSourceType === 'group'
            ? 'Paste the full Codeforces group contest URL'
            : codeforcesSourceType === 'edu'
                ? 'Paste the full Codeforces EDU standings URL'
                : `Enter a numeric ${codeforcesSourceType === 'gym' ? 'Gym' : 'Public contest'} ID or matching URL`
        return c.json({ error: guidance }, 400)
    }

    if (codeforcesSourceType === 'group' && !groupIdentityMode) {
        return c.json({ error: 'Choose how group usernames map to MCC student IDs' }, 400)
    }

    let resolvedMappings: Array<CodeforcesIdentityCsvRow & { studentUserId: string }> = []
    if (groupIdentityMode === 'csv') {
        try {
            resolvedMappings = await resolveCsvStudentAccounts(parseCodeforcesIdentityCsv(mappingCsv))
        } catch (error: any) {
            return c.json({ error: error?.message || 'The group identity CSV is invalid' }, 400)
        }
    }

    if (!normalizedRoomId || !normalizedContestId || !normalizedName) {
        return c.json({ error: 'room_id, contest_id and name are required' }, 400)
    }

    if (!isValidExternalContestId(provider, normalizedContestId)) {
        return c.json({
            error: `${contestProviderLabel(provider)} source must be a numeric contest id${provider === 'codeforces' ? ', full group contest URL, or EDU lesson standings URL' : ''}`,
        }, 400)
    }

    try {
        const roomExists = await sql`SELECT id FROM "Contest_report_room" WHERE id=${normalizedRoomId} LIMIT 1`
        if (roomExists.length === 0) {
            return c.json({ error: 'Room not found' }, 404)
        }

        const existing = await sql`
            SELECT *
            FROM "Contest_room_contests"
            WHERE room_id = ${normalizedRoomId}
              AND provider = ${provider}
              AND contest_id = ${normalizedContestId}
            LIMIT 1
        `
        if (existing.length > 0) {
            return c.json({ result: existing, success: true })
        }

        const formulaKey = await nextContestFormulaKey(normalizedRoomId, provider, normalizedContestId)
        const result = await sql.begin(async (tx) => {
            const inserted = await tx`
                INSERT INTO "Contest_room_contests" (
                    room_id,
                    provider,
                    contest_id,
                    contest_name,
                    formula_key,
                    codeforces_source_type,
                    codeforces_group_identity_mode
                )
                VALUES (
                    ${normalizedRoomId},
                    ${provider},
                    ${normalizedContestId},
                    ${normalizedName},
                    ${formulaKey},
                    ${codeforcesSourceType},
                    ${groupIdentityMode}
                )
                RETURNING *
            `
            if (groupIdentityMode === 'csv') {
                await replaceCodeforcesMappings(tx, String(inserted[0].id), String(id), resolvedMappings)
            }
            await markGlobalContestReportsStale(tx, [normalizedRoomId])
            return inserted
        })
        return c.json({ result, success: true })
    } catch (error: any) {
        const message = error?.message || 'Failed to insert contest'
        return c.json({ error: message }, 400)
    }
}

export const getAllContestRoomContests = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    const user = await sql`select * from users where id = ${id} and email = ${email} and admin = true`
    if (user.length === 0) {
        return c.json({ error: 'Unauthorized' }, 401)
    }

    try {
        const result = await sql`SELECT * FROM "Contest_room_contests" ORDER BY created_at DESC`
        return c.json({ result, success: true })
    } catch (error) {
        return c.json({ error: 'error' }, 400)
    }
}

export const getContestRoomContest = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    const user = await sql`select * from users where id = ${id} and email = ${email} and admin = true`
    if (user.length === 0) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    const { contest_room_contest_id } = await c.req.json()
    try {
        const room_res = await sql`SELECT * FROM "Contest_report_room" WHERE id = ${contest_room_contest_id}`
        if (room_res.length === 0) {
            return c.json({ error: 'Room not found' }, 400)
        }
        const room = room_res[0]
        const name = room['Room Name']
        const result = await sql`
            SELECT item.*,
                   COALESCE(mapping.mapping_count, 0)::int AS codeforces_mapping_count
            FROM "Contest_room_contests" item
            LEFT JOIN LATERAL (
                SELECT count(*) AS mapping_count
                FROM public.contest_report_codeforces_identity_mappings mapping
                WHERE mapping.contest_item_id = item.id
            ) mapping ON true
            WHERE item.room_id = ${contest_room_contest_id}
            ORDER BY item.created_at ASC
        `
        return c.json({ result, success: true, name, room })
    } catch (error) {
        return c.json({ error: 'Not found' }, 400)
    }
}

export const replaceContestCodeforcesIdentityMapping = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) return c.json({ error: 'Unauthorized' }, 401)
    const user = await sql`SELECT id FROM public.users WHERE id=${id} AND email=${email} AND admin=true LIMIT 1`
    if (user.length === 0) return c.json({ error: 'Unauthorized' }, 401)

    const body = await c.req.json()
    const contestItemId = normalizeText(body?.contest_room_contest_id, 80)
    const mode = normalizeGroupIdentityMode(body?.codeforces_group_identity_mode)
    if (!contestItemId || !mode) return c.json({ error: 'Contest and group identity rule are required' }, 400)

    const items = await sql`
        SELECT id, room_id
        FROM public."Contest_room_contests"
        WHERE id=${contestItemId}
          AND provider='codeforces'
          AND codeforces_source_type='group'
        LIMIT 1
    `
    if (items.length === 0) return c.json({ error: 'Codeforces group contest not found' }, 404)

    try {
        const resolvedMappings = mode === 'csv'
            ? await resolveCsvStudentAccounts(parseCodeforcesIdentityCsv(body?.mapping_csv))
            : []
        await sql.begin(async (tx) => {
            await tx`
                UPDATE public."Contest_room_contests"
                SET codeforces_group_identity_mode=${mode}
                WHERE id=${contestItemId}
            `
            await replaceCodeforcesMappings(tx, contestItemId, String(id), resolvedMappings)
            await markGlobalContestReportsStale(tx, [String(items[0].room_id)])
        })
        return c.json({ success: true, mappingCount: resolvedMappings.length, mode })
    } catch (error: any) {
        return c.json({ error: error?.message || 'Failed to replace the Codeforces identity mapping' }, 400)
    }
}

// export const getContestDetal

export const updateContestRoomContest = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    const user = await sql`select * from users where id = ${id} and email = ${email} and admin = true`
    if (user.length === 0) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    const { contest_room_contest_id, room_id, contest_id, weight } = await c.req.json()

    try {
        const result = await sql.begin(async (tx) => {
            const current = await tx`
                SELECT room_id
                FROM public."Contest_room_contests"
                WHERE id = ${contest_room_contest_id}
                FOR UPDATE
            `
            if (current.length === 0) return []
            const updated = await tx`
                UPDATE "Contest_room_contests"
                SET room_id = ${room_id}, contest_id = ${contest_id}, weight = ${weight}
                WHERE id = ${contest_room_contest_id}
                RETURNING *
            `
            if (String(current[0].room_id) !== String(room_id)) {
                await tx`
                    DELETE FROM public.global_contest_report_snapshots
                    WHERE contest_item_id = ${contest_room_contest_id}
                `
            }
            await markGlobalContestReportsStale(tx, [String(current[0].room_id), String(room_id)])
            return updated
        })
        return c.json({ result, success: true })
    } catch (error) {
        return c.json({ error: 'error' }, 400)
    }
}

export const deleteContestRoomContest = async (c: any) => {
    const { id, email } = c.get('jwtPayload')
    if (!id || !email) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    const user = await sql`select * from users where id = ${id} and email = ${email} and admin = true`
    if (user.length === 0) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    const { contest_room_contest_id } = await c.req.json()
    try {
        const result = await sql.begin(async (tx) => {
            const deleted = await tx`
                DELETE FROM "Contest_room_contests"
                WHERE id = ${contest_room_contest_id}
                RETURNING *
            `
            if (deleted.length > 0) {
                await markGlobalContestReportsStale(tx, [String(deleted[0].room_id)])
            }
            return deleted
        })
        return c.json({ result, success: true })
    } catch (error) {
        return c.json({ error: 'Something went wrong' }, 400)
    }
}
