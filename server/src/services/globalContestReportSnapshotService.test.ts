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
      id: "17",
            roomId: '11111111-1111-4111-8111-111111111111',
            contestItemId: null,
            report: { name: 'TFC', users: [] },
            missingContests: [{ id: 'source-1' }],
            scoringConfigVersion: 4,
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
})
