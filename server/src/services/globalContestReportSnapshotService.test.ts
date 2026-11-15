import { describe, expect, test } from 'bun:test'
import { globalContestReportSnapshotFromRow } from './globalContestReportSnapshotService'

describe('global contest report snapshot cache', () => {
    test('normalizes a persisted JSONB snapshot for the report response', () => {
        const snapshot = globalContestReportSnapshotFromRow({
            id: '17',
            room_id: '11111111-1111-4111-8111-111111111111',
            contest_item_id: null,
            snapshot: { name: 'TFC', users: [] },
            missing_contests: [{ id: 'source-1' }],
            scoring_config_version: 4,
            is_stale: true,
            generated_at: '2026-09-19T12:00:00.000Z',
        })

        expect(snapshot).toEqual({
            id: '17',
            roomId: '11111111-1111-4111-8111-111111111111',
            contestItemId: null,
            report: { name: 'TFC', users: [] },
            sourceSnapshots: {},
            missingContests: [{ id: 'source-1' }],
            scoringConfigVersion: 4,
            eligibilityCampaignId: null,
            eligibilityMembershipRevision: null,
            eligibilitySelectionVersion: 0,
            eligibilityIsCurrent: true,
            isStale: true,
            generatedAt: '2026-09-19T12:00:00.000Z',
        })
    })

    test('accepts serialized JSON and rejects a non-object report snapshot', () => {
        const parsed = globalContestReportSnapshotFromRow({
            id: 18,
            room_id: '11111111-1111-4111-8111-111111111111',
            contest_item_id: '22222222-2222-4222-8222-222222222222',
            snapshot: JSON.stringify({ users: [{ identityKey: 'student:1' }] }),
            missing_contests: 'not-json',
            scoring_config_version: 1,
            is_stale: false,
            generated_at: '2026-09-19T12:30:00.000Z',
        })
        expect(parsed?.missingContests).toEqual([])
        expect(parsed?.report.users).toHaveLength(1)

        expect(globalContestReportSnapshotFromRow({
            ...parsed,
            room_id: parsed?.roomId,
            snapshot: '[]',
            generated_at: parsed?.generatedAt,
        })).toBeNull()
    })

    test('marks a snapshot stale when campaign membership advanced', () => {
        const snapshot = globalContestReportSnapshotFromRow({
            id: 19,
            room_id: '11111111-1111-4111-8111-111111111111',
            contest_item_id: null,
            snapshot: { users: [] },
            source_snapshots: {},
            missing_contests: [],
            scoring_config_version: 2,
            eligibility_campaign_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            eligibility_membership_revision: 4,
            eligibility_selection_version: 2,
            current_eligibility_campaign_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            current_eligibility_membership_revision: 5,
            current_eligibility_selection_version: 2,
            is_stale: false,
            generated_at: '2026-11-15T10:00:00.000Z',
        })

        expect(snapshot?.eligibilityIsCurrent).toBe(false)
        expect(snapshot?.isStale).toBe(true)
    })

    test('retains the unfiltered source cache beside a filtered scored report', () => {
        const snapshot = globalContestReportSnapshotFromRow({
            id: 20,
            room_id: '11111111-1111-4111-8111-111111111111',
            contest_item_id: null,
            snapshot: { users: [{ identityKey: 'student:11111111-1111-4111-8111-111111111111' }] },
            source_snapshots: {
                source1: { rankData: { teams: [
                    { identityKey: 'student:11111111-1111-4111-8111-111111111111' },
                    { identityKey: 'student:22222222-2222-4222-8222-222222222222' },
                ] } },
            },
            missing_contests: [],
            scoring_config_version: 2,
            eligibility_campaign_id: null,
            eligibility_selection_version: 0,
            is_stale: false,
            generated_at: '2026-11-15T10:00:00.000Z',
        })

        expect(snapshot?.report.users).toHaveLength(1)
        expect(snapshot?.sourceSnapshots.source1.rankData.teams).toHaveLength(2)
    })
})
