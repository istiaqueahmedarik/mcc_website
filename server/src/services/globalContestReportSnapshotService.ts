import sql from '../db'

export type GlobalContestReportSnapshot = {
    id: string;
    roomId: string;
    contestItemId: string | null;
    report: any;
    sourceSnapshots: Record<string, any>;
    missingContests: any[];
    scoringConfigVersion: number;
    eligibilityCampaignId: string | null;
    eligibilityMembershipRevision: number | null;
    eligibilitySelectionVersion: number;
    eligibilityIsCurrent: boolean;
    isStale: boolean;
    sourceIsStale: boolean;
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
    const eligibilityCampaignId = row.eligibility_campaign_id ? String(row.eligibility_campaign_id) : null
    const eligibilityMembershipRevision = eligibilityCampaignId
        ? Number(row.eligibility_membership_revision || 0)
        : null
    const eligibilitySelectionVersion = Number(row.eligibility_selection_version || 0)
    const currentCampaignId = row.current_eligibility_campaign_id
        ? String(row.current_eligibility_campaign_id)
        : null
    const currentSelectionVersion = Number(row.current_eligibility_selection_version || 0)
    const currentMembershipRevision = currentCampaignId
        ? Number(row.current_eligibility_membership_revision || 0)
        : null
    const eligibilityIsCurrent = eligibilityCampaignId === currentCampaignId
        && eligibilitySelectionVersion === currentSelectionVersion
        && eligibilityMembershipRevision === currentMembershipRevision
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
        eligibilityCampaignId,
        eligibilityMembershipRevision,
        eligibilitySelectionVersion,
        eligibilityIsCurrent,
        sourceIsStale: Boolean(row.is_stale),
        isStale: Boolean(row.is_stale) || !eligibilityIsCurrent,
        generatedAt: new Date(row.generated_at).toISOString(),
    }
}

export async function loadGlobalContestReportSnapshot(
    roomId: string,
    contestItemId: string | null,
    database: any = sql,
    lock = false,
): Promise<GlobalContestReportSnapshot | null> {
    const rows = contestItemId
        ? lock ? await database`
            SELECT snapshot.id, snapshot.room_id, snapshot.contest_item_id, snapshot.snapshot,
                   snapshot.source_snapshots, snapshot.missing_contests, snapshot.scoring_config_version,
                   snapshot.eligibility_campaign_id, snapshot.eligibility_membership_revision,
                   snapshot.eligibility_selection_version, snapshot.is_stale, snapshot.generated_at,
                   eligibility.campaign_id AS current_eligibility_campaign_id,
                   COALESCE(eligibility.selection_version, 0) AS current_eligibility_selection_version,
                   campaign.revision AS current_eligibility_membership_revision
            FROM public.global_contest_report_snapshots snapshot
            LEFT JOIN public.global_contest_report_eligibility eligibility ON eligibility.room_id = snapshot.room_id
            LEFT JOIN public.global_form_campaigns campaign ON campaign.id = eligibility.campaign_id
            WHERE snapshot.room_id = ${roomId}
              AND snapshot.contest_item_id = ${contestItemId}
            LIMIT 1
            FOR SHARE OF snapshot
        ` : await database`
            SELECT snapshot.id, snapshot.room_id, snapshot.contest_item_id, snapshot.snapshot,
                   snapshot.source_snapshots, snapshot.missing_contests, snapshot.scoring_config_version,
                   snapshot.eligibility_campaign_id, snapshot.eligibility_membership_revision,
                   snapshot.eligibility_selection_version, snapshot.is_stale, snapshot.generated_at,
                   eligibility.campaign_id AS current_eligibility_campaign_id,
                   COALESCE(eligibility.selection_version, 0) AS current_eligibility_selection_version,
                   campaign.revision AS current_eligibility_membership_revision
            FROM public.global_contest_report_snapshots snapshot
            LEFT JOIN public.global_contest_report_eligibility eligibility ON eligibility.room_id = snapshot.room_id
            LEFT JOIN public.global_form_campaigns campaign ON campaign.id = eligibility.campaign_id
            WHERE snapshot.room_id = ${roomId}
              AND snapshot.contest_item_id = ${contestItemId}
            LIMIT 1
        `
        : lock ? await database`
            SELECT snapshot.id, snapshot.room_id, snapshot.contest_item_id, snapshot.snapshot,
                   snapshot.source_snapshots, snapshot.missing_contests, snapshot.scoring_config_version,
                   snapshot.eligibility_campaign_id, snapshot.eligibility_membership_revision,
                   snapshot.eligibility_selection_version, snapshot.is_stale, snapshot.generated_at,
                   eligibility.campaign_id AS current_eligibility_campaign_id,
                   COALESCE(eligibility.selection_version, 0) AS current_eligibility_selection_version,
                   campaign.revision AS current_eligibility_membership_revision
            FROM public.global_contest_report_snapshots snapshot
            LEFT JOIN public.global_contest_report_eligibility eligibility ON eligibility.room_id = snapshot.room_id
            LEFT JOIN public.global_form_campaigns campaign ON campaign.id = eligibility.campaign_id
            WHERE snapshot.room_id = ${roomId}
              AND snapshot.contest_item_id IS NULL
            LIMIT 1
            FOR SHARE OF snapshot
        ` : await database`
            SELECT snapshot.id, snapshot.room_id, snapshot.contest_item_id, snapshot.snapshot,
                   snapshot.source_snapshots, snapshot.missing_contests, snapshot.scoring_config_version,
                   snapshot.eligibility_campaign_id, snapshot.eligibility_membership_revision,
                   snapshot.eligibility_selection_version, snapshot.is_stale, snapshot.generated_at,
                   eligibility.campaign_id AS current_eligibility_campaign_id,
                   COALESCE(eligibility.selection_version, 0) AS current_eligibility_selection_version,
                   campaign.revision AS current_eligibility_membership_revision
            FROM public.global_contest_report_snapshots snapshot
            LEFT JOIN public.global_contest_report_eligibility eligibility ON eligibility.room_id = snapshot.room_id
            LEFT JOIN public.global_form_campaigns campaign ON campaign.id = eligibility.campaign_id
            WHERE snapshot.room_id = ${roomId}
              AND snapshot.contest_item_id IS NULL
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
    inputRevision?: number;
    eligibilityCampaignId: string | null;
    eligibilityMembershipRevision: number | null;
    eligibilitySelectionVersion: number;
}): Promise<GlobalContestReportSnapshot> {
    return sql.begin(async (tx) => {
        if (input.inputRevision !== undefined) {
            const rooms = await tx`
                SELECT report_input_revision FROM public."Contest_report_room"
                WHERE id = ${input.roomId} FOR SHARE
            `
            if (!rooms[0] || Number(rooms[0].report_input_revision) !== input.inputRevision) {
                throw Object.assign(new Error('Report inputs changed while generating; refresh the report again'), {
                    statusCode: 409, code: 'REPORT_INPUTS_CHANGED',
                })
            }
        }
        const selectionHint = await tx`
            SELECT campaign_id
            FROM public.global_contest_report_eligibility
            WHERE room_id = ${input.roomId}
        `
        const hintedCampaignId = selectionHint[0]?.campaign_id ? String(selectionHint[0].campaign_id) : null
        let currentMembershipRevision: number | null = null
        if (hintedCampaignId) {
            const campaignRows = await tx`
                SELECT revision FROM public.global_form_campaigns WHERE id = ${hintedCampaignId} FOR SHARE
            `
            currentMembershipRevision = Number(campaignRows[0]?.revision || 0)
        }
        const selectionRows = await tx`
            SELECT campaign_id, selection_version
            FROM public.global_contest_report_eligibility
            WHERE room_id = ${input.roomId}
            FOR SHARE
        `
        const currentCampaignId = selectionRows[0]?.campaign_id ? String(selectionRows[0].campaign_id) : null
        const currentSelectionVersion = Number(selectionRows[0]?.selection_version || 0)
        if (
            currentCampaignId !== hintedCampaignId
            || currentCampaignId !== input.eligibilityCampaignId
            || currentSelectionVersion !== input.eligibilitySelectionVersion
            || currentMembershipRevision !== input.eligibilityMembershipRevision
        ) {
            throw Object.assign(new Error('Campaign respondents changed while the report was generated; generate it again'), {
                statusCode: 409,
                code: 'REPORT_ELIGIBILITY_CHANGED',
            })
        }

        const rows = input.contestItemId
        ? await tx`
            INSERT INTO public.global_contest_report_snapshots (
                room_id,
                contest_item_id,
                snapshot,
                source_snapshots,
                missing_contests,
                scoring_config_version,
                eligibility_campaign_id,
                eligibility_membership_revision,
                eligibility_selection_version,
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
                ${input.eligibilityCampaignId},
                ${input.eligibilityMembershipRevision},
                ${input.eligibilitySelectionVersion},
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
                eligibility_campaign_id = EXCLUDED.eligibility_campaign_id,
                eligibility_membership_revision = EXCLUDED.eligibility_membership_revision,
                eligibility_selection_version = EXCLUDED.eligibility_selection_version,
                is_stale = false,
                generated_by = EXCLUDED.generated_by,
                generated_at = now()
            RETURNING id, room_id, contest_item_id, snapshot, source_snapshots, missing_contests,
                      scoring_config_version, eligibility_campaign_id, eligibility_membership_revision,
                      eligibility_selection_version, is_stale, generated_at
        `
        : await tx`
            INSERT INTO public.global_contest_report_snapshots (
                room_id,
                contest_item_id,
                snapshot,
                source_snapshots,
                missing_contests,
                scoring_config_version,
                eligibility_campaign_id,
                eligibility_membership_revision,
                eligibility_selection_version,
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
                ${input.eligibilityCampaignId},
                ${input.eligibilityMembershipRevision},
                ${input.eligibilitySelectionVersion},
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
                eligibility_campaign_id = EXCLUDED.eligibility_campaign_id,
                eligibility_membership_revision = EXCLUDED.eligibility_membership_revision,
                eligibility_selection_version = EXCLUDED.eligibility_selection_version,
                is_stale = false,
                generated_by = EXCLUDED.generated_by,
                generated_at = now()
            RETURNING id, room_id, contest_item_id, snapshot, source_snapshots, missing_contests,
                      scoring_config_version, eligibility_campaign_id, eligibility_membership_revision,
                      eligibility_selection_version, is_stale, generated_at
        `
        const snapshot = globalContestReportSnapshotFromRow({
            ...rows[0],
            current_eligibility_campaign_id: currentCampaignId,
            current_eligibility_selection_version: currentSelectionVersion,
            current_eligibility_membership_revision: currentMembershipRevision,
        })
        if (!snapshot) throw new Error('Failed to save the generated report snapshot')
        return snapshot
    })
}

export async function markGlobalContestReportsStale(database: any, roomIds: string[]) {
    const normalizedRoomIds = Array.from(new Set(roomIds.map(String).filter(Boolean)))
    if (normalizedRoomIds.length === 0) return
    await database`
        UPDATE public."Contest_report_room"
        SET report_input_revision = report_input_revision + 1
        WHERE id = ANY(${normalizedRoomIds})
    `
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
