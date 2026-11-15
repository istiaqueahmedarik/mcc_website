import sql from '../db'

export type GlobalFormReportEligibility = {
    mode: 'all' | 'campaign';
    campaignId: string | null;
    campaignTitle: string | null;
    campaignStatus: string | null;
    membershipRevision: number | null;
    selectionVersion: number;
    responseCount: number;
    eligibleUserIds: string[];
}

function canonicalStudentId(identityKey: unknown) {
    const match = String(identityKey || '').trim().match(/^student:([0-9a-f-]{36})$/i)
    return match?.[1]?.toLowerCase() || null
}

function fallbackParticipantKey(team: any) {
    const handles = [
        ...(Array.isArray(team?.sourceHandles) ? team.sourceHandles : []),
        team?.username,
        team?.realName,
    ].map((value) => String(value || '').trim().toLowerCase()).filter(Boolean)
    return String(team?.identityKey || '').trim().toLowerCase() || handles[0] || null
}

export function applyGlobalFormEligibilityToRankData(
    rankDataByItemId: Map<string, any>,
    eligibility: GlobalFormReportEligibility,
) {
    if (eligibility.mode === 'all') {
        return {
            rankDataByItemId,
            summary: {
                mode: 'all' as const,
                campaignId: null,
                campaignTitle: null,
                campaignStatus: null,
                membershipRevision: null,
                selectionVersion: eligibility.selectionVersion,
                responseCount: 0,
                eligibleCount: 0,
                excludedCount: 0,
                unmappedCount: 0,
                linkedTfcCohortFixed: false,
            },
        }
    }

    const eligibleIds = new Set(eligibility.eligibleUserIds.map((id) => id.toLowerCase()))
    const included = new Set<string>()
    const excluded = new Set<string>()
    const unmapped = new Set<string>()
    const filtered = new Map<string, any>()

    rankDataByItemId.forEach((rankData, itemId) => {
        const teams = Array.isArray(rankData?.teams) ? rankData.teams : []
        const keptTeams = teams.filter((team: any) => {
            const studentId = canonicalStudentId(team?.identityKey)
            if (!studentId) {
                const key = fallbackParticipantKey(team)
                if (key) unmapped.add(key)
                return false
            }
            if (!eligibleIds.has(studentId)) {
                excluded.add(studentId)
                return false
            }
            included.add(studentId)
            return true
        })
        filtered.set(itemId, { ...rankData, teams: keptTeams })
    })

    return {
        rankDataByItemId: filtered,
        summary: {
            mode: 'campaign' as const,
            campaignId: eligibility.campaignId,
            campaignTitle: eligibility.campaignTitle,
            campaignStatus: eligibility.campaignStatus,
            membershipRevision: eligibility.membershipRevision,
            selectionVersion: eligibility.selectionVersion,
            responseCount: eligibility.responseCount,
            eligibleCount: included.size,
            excludedCount: excluded.size,
            unmappedCount: unmapped.size,
            linkedTfcCohortFixed: false,
        },
    }
}

export async function loadGlobalFormReportEligibility(
    roomId: string,
    database: any = sql,
): Promise<GlobalFormReportEligibility> {
    const rows = await database`
        SELECT eligibility.campaign_id,
               eligibility.selection_version,
               campaign.title,
               campaign.status,
               campaign.revision
        FROM public.global_contest_report_eligibility eligibility
        LEFT JOIN public.global_form_campaigns campaign ON campaign.id = eligibility.campaign_id
        WHERE eligibility.room_id = ${roomId}
        LIMIT 1
    `
    const selected = rows[0]
    if (!selected?.campaign_id) {
        return {
            mode: 'all',
            campaignId: null,
            campaignTitle: null,
            campaignStatus: null,
            membershipRevision: null,
            selectionVersion: Number(selected?.selection_version || 0),
            responseCount: 0,
            eligibleUserIds: [],
        }
    }
    if (!selected.title) {
        throw Object.assign(new Error('Selected form campaign no longer exists'), { statusCode: 409 })
    }
    const responseRows = await database`
        SELECT user_id
        FROM public.global_form_responses
        WHERE campaign_id = ${String(selected.campaign_id)}
        ORDER BY submitted_at ASC, id ASC
    `
    return {
        mode: 'campaign',
        campaignId: String(selected.campaign_id),
        campaignTitle: String(selected.title),
        campaignStatus: String(selected.status),
        membershipRevision: Number(selected.revision || 0),
        selectionVersion: Number(selected.selection_version || 0),
        responseCount: responseRows.length,
        eligibleUserIds: responseRows.map((row: any) => String(row.user_id)),
    }
}

export async function listGlobalFormReportCampaigns(database: any = sql) {
    const rows = await database`
        SELECT campaign.id,
               campaign.title,
               campaign.status,
               campaign.revision,
               count(response.id)::integer AS response_count
        FROM public.global_form_campaigns campaign
        LEFT JOIN public.global_form_responses response ON response.campaign_id = campaign.id
        GROUP BY campaign.id
        ORDER BY campaign.created_at DESC, campaign.id DESC
    `
    return rows.map((row: any) => ({
        id: String(row.id),
        title: String(row.title),
        status: String(row.status),
        revision: Number(row.revision || 0),
        responseCount: Number(row.response_count || 0),
    }))
}

export async function setGlobalFormReportEligibility(input: {
    roomId: string;
    campaignId: string | null;
    actorId: string;
}) {
    return sql.begin(async (tx) => {
        const rooms = await tx`
            SELECT id FROM public."Contest_report_room" WHERE id = ${input.roomId}
        `
        if (rooms.length === 0) {
            throw Object.assign(new Error('Contest room not found'), { statusCode: 404 })
        }
        const campaigns = input.campaignId ? await tx`
            SELECT id, revision
            FROM public.global_form_campaigns
            WHERE id = ${input.campaignId}
            FOR SHARE
        ` : []
        if (input.campaignId && campaigns.length === 0) {
            throw Object.assign(new Error('Form campaign not found'), { statusCode: 404 })
        }
        const membershipRevision = input.campaignId ? Number(campaigns[0].revision || 0) : null
        await tx`
            INSERT INTO public.global_contest_report_eligibility (
                room_id, campaign_id, selection_version, membership_revision, updated_by, updated_at
            )
            VALUES (${input.roomId}, ${input.campaignId}, 1, ${membershipRevision}, ${input.actorId}, now())
            ON CONFLICT (room_id) DO UPDATE SET
                campaign_id = EXCLUDED.campaign_id,
                selection_version = public.global_contest_report_eligibility.selection_version + 1,
                membership_revision = EXCLUDED.membership_revision,
                updated_by = EXCLUDED.updated_by,
                updated_at = now()
        `
        await tx`
            UPDATE public."Public_contest_report"
            SET is_stale = true, "Updated_at" = now()
            WHERE "Shared_contest_id" = ${input.roomId} AND is_stale = false
        `
        return loadGlobalFormReportEligibility(input.roomId, tx)
    })
}
