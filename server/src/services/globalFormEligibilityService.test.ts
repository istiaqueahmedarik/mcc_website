import { describe, expect, test } from 'bun:test'
import { applyGlobalFormEligibilityToRankData } from './globalFormEligibilityService'

const campaign = (eligibleUserIds: string[]) => ({
    mode: 'campaign' as const,
    campaignId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    campaignTitle: 'TFC Registration',
    campaignStatus: 'open',
    membershipRevision: 7,
    selectionVersion: 3,
    responseCount: eligibleUserIds.length,
    eligibleUserIds,
})

describe('global form report eligibility', () => {
    test('keeps only canonical submitted student identities and reports exclusions', () => {
        const eligible = '11111111-1111-4111-8111-111111111111'
        const excluded = '22222222-2222-4222-8222-222222222222'
        const source = new Map([['item-1', { teams: [
            { identityKey: `student:${eligible}`, username: 'eligible' },
            { identityKey: `student:${excluded}`, username: 'excluded' },
            { identityKey: 'codeforces:unknown', username: 'unknown' },
        ] }]])

        const result = applyGlobalFormEligibilityToRankData(source, campaign([eligible]))

        expect(result.rankDataByItemId.get('item-1').teams.map((team: any) => team.username)).toEqual(['eligible'])
        expect(result.summary).toMatchObject({ eligibleCount: 1, excludedCount: 1, unmappedCount: 1 })
        expect(source.get('item-1').teams).toHaveLength(3)
    })

    test('all-participants mode returns the exact source map', () => {
        const source = new Map([['item-1', { teams: [{ username: 'legacy' }] }]])
        const result = applyGlobalFormEligibilityToRankData(source, {
            mode: 'all', campaignId: null, campaignTitle: null, campaignStatus: null,
            membershipRevision: null, selectionVersion: 0, responseCount: 0, eligibleUserIds: [],
        })
        expect(result.rankDataByItemId).toBe(source)
        expect(result.rankDataByItemId.get('item-1').teams).toHaveLength(1)
    })

    test('an empty campaign produces an explicit empty cohort', () => {
        const source = new Map([['item-1', { teams: [
            { identityKey: 'student:11111111-1111-4111-8111-111111111111' },
        ] }]])
        const result = applyGlobalFormEligibilityToRankData(source, campaign([]))
        expect(result.rankDataByItemId.get('item-1').teams).toEqual([])
        expect(result.summary).toMatchObject({ responseCount: 0, eligibleCount: 0, excludedCount: 1 })
    })
})
