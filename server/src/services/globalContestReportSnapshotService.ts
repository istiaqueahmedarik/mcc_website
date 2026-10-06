import sql from '../db'

export type GlobalContestReportSnapshot = {
    id: string;
    roomId: string;
    contestItemId: string | null;
    report: any;
    sourceSnapshots: Record<string, any>;
    missingContests: any[];
    scoringConfigVersion: number;
    isStale: boolean;
    generatedAt: string;
}

function parseJsonValue(value: unknown, fallback: any) {
    if (value && typeof value === 'object') return value
    if (typeof value !== 'string' || value.length === 0) return fallback
    try {
        return JSON.parse(value)
    } catch {
        return fallback
    }
}

export function globalContestReportSnapshotFromRow(row: any): GlobalContestReportSnapshot | null {
    if (!row) return null
    const report = parseJsonValue(row.snapshot, null)
    if (!report || typeof report !== 'object' || Array.isArray(report)) return null
    const missingContests = parseJsonValue(row.missing_contests, [])
    const sourceSnapshots = parseJsonValue(row.source_snapshots, {})
    return {
        id: String(row.id),
        roomId: String(row.room_id),
        contestItemId: row.contest_item_id ? String(row.contest_item_id) : null,
        report,
        sourceSnapshots: sourceSnapshots && typeof sourceSnapshots === 'object' && !Array.isArray(sourceSnapshots)
            ? sourceSnapshots
            : {},
        missingContests: Array.isArray(missingContests) ? missingContests : [],
        scoringConfigVersion: Number(row.scoring_config_version || 0),
        isStale: Boolean(row.is_stale),
        generatedAt: new Date(row.generated_at).toISOString(),
    }
}

export async function loadGlobalContestReportSnapshot(
    roomId: string,
    contestItemId: string | null,
): Promise<GlobalContestReportSnapshot | null> {
    const rows = contestItemId
        ? await sql`
            SELECT id, room_id, contest_item_id, snapshot, source_snapshots, missing_contests,
                   scoring_config_version, is_stale, generated_at
            FROM public.global_contest_report_snapshots
            WHERE room_id = ${roomId}
              AND contest_item_id = ${contestItemId}
            LIMIT 1
        `
        : await sql`
            SELECT id, room_id, contest_item_id, snapshot, source_snapshots, missing_contests,
                   scoring_config_version, is_stale, generated_at
            FROM public.global_contest_report_snapshots
            WHERE room_id = ${roomId}
              AND contest_item_id IS NULL
            LIMIT 1
        `
    return globalContestReportSnapshotFromRow(rows[0])
}

export async function saveGlobalContestReportSnapshot(input: {
    roomId: string;
    contestItemId: string | null;
    report: any;
    sourceSnapshots?: Record<string, any>;
    missingContests: any[];
    scoringConfigVersion: number;
    generatedBy: string;
}): Promise<GlobalContestReportSnapshot> {
    const rows = input.contestItemId
        ? await sql`
            INSERT INTO public.global_contest_report_snapshots (
                room_id,
                contest_item_id,
                snapshot,
                source_snapshots,
                missing_contests,
                scoring_config_version,
                is_stale,
                generated_by,
                generated_at
            )
            VALUES (
                ${input.roomId},
                ${input.contestItemId},
                ${sql.json(input.report)},
                ${sql.json(input.sourceSnapshots || {})},
                ${sql.json(input.missingContests || [])},
                ${input.scoringConfigVersion},
                false,
                ${input.generatedBy},
                now()
            )
            ON CONFLICT (room_id, contest_item_id) WHERE contest_item_id IS NOT NULL
            DO UPDATE SET
                snapshot = EXCLUDED.snapshot,
                source_snapshots = EXCLUDED.source_snapshots,
                missing_contests = EXCLUDED.missing_contests,
                scoring_config_version = EXCLUDED.scoring_config_version,
                is_stale = false,
                generated_by = EXCLUDED.generated_by,
                generated_at = now()
            RETURNING id, room_id, contest_item_id, snapshot, source_snapshots, missing_contests,
                      scoring_config_version, is_stale, generated_at
        `
        : await sql`
            INSERT INTO public.global_contest_report_snapshots (
                room_id,
                contest_item_id,
                snapshot,
                source_snapshots,
                missing_contests,
                scoring_config_version,
                is_stale,
                generated_by,
                generated_at
            )
            VALUES (
                ${input.roomId},
                NULL,
                ${sql.json(input.report)},
                ${sql.json(input.sourceSnapshots || {})},
                ${sql.json(input.missingContests || [])},
                ${input.scoringConfigVersion},
                false,
                ${input.generatedBy},
                now()
            )
            ON CONFLICT (room_id) WHERE contest_item_id IS NULL
            DO UPDATE SET
                snapshot = EXCLUDED.snapshot,
                source_snapshots = EXCLUDED.source_snapshots,
                missing_contests = EXCLUDED.missing_contests,
                scoring_config_version = EXCLUDED.scoring_config_version,
                is_stale = false,
                generated_by = EXCLUDED.generated_by,
                generated_at = now()
            RETURNING id, room_id, contest_item_id, snapshot, source_snapshots, missing_contests,
                      scoring_config_version, is_stale, generated_at
        `
    const snapshot = globalContestReportSnapshotFromRow(rows[0])
    if (!snapshot) throw new Error('Failed to save the generated report snapshot')
    return snapshot
}

export async function markGlobalContestReportsStale(database: any, roomIds: string[]) {
    const normalizedRoomIds = Array.from(new Set(roomIds.map(String).filter(Boolean)))
    if (normalizedRoomIds.length === 0) return
    await database`
        UPDATE public.global_contest_report_snapshots
        SET is_stale = true
        WHERE room_id = ANY(${normalizedRoomIds})
          AND is_stale = false
    `
    await database`
        UPDATE public."Public_contest_report"
        SET is_stale = true,
            "Updated_at" = now()
        WHERE "Shared_contest_id" = ANY(${normalizedRoomIds})
          AND is_stale = false
    `
}

export async function markGlobalContestReportsStaleForVjudgeContests(database: any, contestIds: string[]) {
    const normalizedContestIds = Array.from(new Set(contestIds.map(String).filter(Boolean)))
    if (normalizedContestIds.length === 0) return
    const roomRows = await database`
        SELECT DISTINCT room_id
        FROM public."Contest_room_contests"
        WHERE provider = 'vjudge'
          AND contest_id = ANY(${normalizedContestIds})
    `
    await markGlobalContestReportsStale(database, roomRows.map((row: any) => String(row.room_id)))
}
