import { describe, expect, test } from 'bun:test';
import { buildScoredContestReport, defaultScoringConfigForScope } from './contestScoringService';

const source = (overrides: any) => ({
  itemId: overrides.itemId,
  contestKey: overrides.contestKey,
  formulaKey: overrides.formulaKey,
  title: overrides.title || overrides.contestKey,
  provider: 'vjudge',
  externalContestId: overrides.externalContestId || overrides.contestKey.replace(/^c/, ''),
  weight: overrides.weight ?? 1,
  sortOrder: overrides.sortOrder ?? 0,
  demerits: overrides.demerits || [],
  rankData: {
    contestInfo: {
      id: overrides.contestKey,
      title: overrides.title || overrides.contestKey,
    },
    teams: overrides.teams || [],
  },
});

const team = (username: string, solved: number, finalScore: number, penalty = 0, demeritPoints = 0) => ({
  username,
  realName: username,
  solvedCount: solved,
  finalScore,
  penalty,
  demeritPoints,
  submissions: solved > 0 ? [{ problemIndex: 0, status: 1, timeSeconds: 60 }] : [],
});

describe('buildScoredContestReport', () => {
  test('aggregates composite source contests and leaves breakdown inspectable', () => {
    const report = buildScoredContestReport({
      roomId: 'room-1',
      scope: 'global',
      roomName: 'Composite Room',
      sources: [
        source({ itemId: 'item-1', contestKey: 'c101', formulaKey: 'alpha', sortOrder: 0, teams: [team('alice', 2, 2, 20)] }),
        source({ itemId: 'item-2', contestKey: 'c102', formulaKey: 'beta', sortOrder: 1, teams: [team('alice', 3, 3, 30)] }),
      ],
      config: {
        formula: 'sum(raw_score)',
        scorePrecision: 2,
        groups: [{ name: 'Combo', formulaKey: 'combo', contestItemIds: ['item-1', 'item-2'] }],
        sortRules: [{ key: 'score', direction: 'desc' }],
      },
    });

    expect(report.contestIds).toEqual(['combo']);
    expect(report.users[0].score).toBe(5);
    expect(report.users[0].contests.combo.solved).toBe(5);
    expect(report.users[0].contests.combo.penalty).toBe(50);
    expect(report.users[0].contests.combo.sourceContestIds).toEqual(['c101', 'c102']);
    expect(report.users[0].contests.combo.sourceBreakdown.c101.finalScore).toBe(2);
  });

  test('applies composite formulas before the room formula', () => {
    const report = buildScoredContestReport({
      roomId: 'room-1',
      scope: 'global',
      roomName: 'Composite Room',
      sources: [
        source({ itemId: 'item-1', contestKey: 'c101', formulaKey: 'alpha', sortOrder: 0, teams: [team('alice', 2, 2, 20)] }),
        source({ itemId: 'item-2', contestKey: 'c102', formulaKey: 'beta', sortOrder: 1, teams: [team('alice', 3, 3, 30)] }),
      ],
      config: {
        formula: 'sum(raw_score)',
        scorePrecision: 2,
        groups: [{
          name: 'Combo',
          formulaKey: 'combo',
          solvedScoreFormula: 'raw_score(0) * 2 + solved(1)',
          penaltyScoreFormula: 'max(penalty)',
          contestItemIds: ['item-1', 'item-2'],
        }],
        sortRules: [{ key: 'score', direction: 'desc' }],
      },
    });

    expect(report.users[0].score).toBe(7);
    expect(report.users[0].contests.combo.rawScore).toBe(7);
    expect(report.users[0].contests.combo.solved).toBe(5);
    expect(report.users[0].scoringVariables.total_raw_score).toBe(7);
    expect(report.users[0].contests.combo.penalty).toBe(30);
    expect(report.scoring.resultUnits[0].formula).toBe('raw_score(0) * 2 + solved(1)');
    expect(report.scoring.resultUnits[0].penaltyScoreFormula).toBe('max(penalty)');
  });

  test('calculates solved and penalty scores independently and uses penalty to break ties', () => {
    const report = buildScoredContestReport({
      roomId: 'room-1',
      scope: 'global',
      sources: [
        source({
          itemId: 'item-1',
          contestKey: 'c101',
          formulaKey: 'alpha',
          teams: [
            team('alice', 3, 3, 90),
            team('bob', 3, 3, 40),
          ],
        }),
      ],
      config: {
        solvedScoreFormula: 'sum(solved) * 10',
        penaltyScoreFormula: 'sum(penalty) + sum(demerits)',
        scorePrecision: 2,
        sortRules: [
          { key: 'solved_score', direction: 'desc' },
          { key: 'penalty_score', direction: 'asc' },
        ],
      },
    });

    expect(report.users.map((user: any) => user.username)).toEqual(['bob', 'alice']);
    expect(report.users.map((user: any) => user.solvedScore)).toEqual([30, 30]);
    expect(report.users.map((user: any) => user.penaltyScore)).toEqual([40, 90]);
    expect(report.users[0].scoreTrace.solvedScoreFormula).toBe('sum(solved) * 10');
    expect(report.users[0].scoreTrace.penaltyScoreFormula).toBe('sum(penalty) + sum(demerits)');
  });

  test('applies ordered field adjustments before final formulas and traces each change', () => {
    const report = buildScoredContestReport({
      roomId: 'room-1',
      scope: 'global',
      sources: [
        source({
          itemId: 'item-1',
          contestKey: 'c101',
          formulaKey: 'alpha',
          sortOrder: 0,
          teams: [team('alice', 2, 2, 40), team('bob', 1, 1, 10)],
        }),
        source({
          itemId: 'item-2',
          contestKey: 'c102',
          formulaKey: 'beta',
          sortOrder: 1,
          teams: [team('alice', 0, 0, 0)],
        }),
      ],
      config: {
        solvedScoreFormula: 'sum(solved)',
        penaltyScoreFormula: 'sum(penalty)',
        sortRules: [{ key: 'solved_score', direction: 'desc' }],
        adjustmentRules: [
          { id: 'boost-alpha', unitKey: 'alpha', field: 'solved', operation: 'add', value: 2, attendance: 'attended' },
          { id: 'reduce-alpha', unitKey: 'alpha', field: 'penalty', operation: 'subtract', value: 20, attendance: 'attended' },
          { id: 'skip-missing', unitKey: 'beta', field: 'solved', operation: 'add', value: 5, attendance: 'attended' },
        ],
      },
    });

    const alice = report.users.find((user: any) => user.username === 'alice');
    const bob = report.users.find((user: any) => user.username === 'bob');
    expect(alice?.solvedScore).toBe(4);
    expect(bob?.solvedScore).toBe(3);
    expect(alice?.penaltyScore).toBe(20);
    expect(bob?.penaltyScore).toBe(0);
    expect(alice?.contests.beta.solved).toBe(0);
    expect(alice?.contests.alpha.adjustments.map((item: any) => item.ruleId)).toEqual(['boost-alpha', 'reduce-alpha']);
    expect(report.scoring.adjustmentRules).toHaveLength(3);
  });

  test('keeps empty adjustments unchanged and evaluates active rules top-to-bottom', () => {
    const options = {
      roomId: 'room-1',
      scope: 'global' as const,
      sources: [source({ itemId: 'item-1', contestKey: 'c101', formulaKey: 'alpha', teams: [team('alice', 2, 3, 10)] })],
      config: {
        solvedScoreFormula: 'sum(raw_score)',
        penaltyScoreFormula: 'sum(penalty)',
        sortRules: [{ key: 'solved_score', direction: 'desc' as const }],
      },
    };
    const unchanged = buildScoredContestReport(options);
    const adjusted = buildScoredContestReport({
      ...options,
      config: {
        ...options.config,
        adjustmentRules: [
          { id: 'set-score', unitKey: 'alpha', field: 'raw_score' as const, operation: 'set' as const, value: 10 },
          { id: 'double-score', unitKey: 'alpha', field: 'raw_score' as const, operation: 'multiply' as const, value: 2 },
        ],
      },
    });

    expect(unchanged.users[0].solvedScore).toBe(3);
    expect(unchanged.scoring.adjustmentRules).toEqual([]);
    expect(adjusted.users[0].solvedScore).toBe(20);
    expect(adjusted.users[0].scoreTrace.resultUnits[0].adjustments.map((item: any) => item.after)).toEqual([10, 20]);
  });

  test('rejects invalid or unknown adjustment rules', () => {
    expect(() => buildScoredContestReport({
      roomId: 'room-1',
      scope: 'global',
      sources: [source({ itemId: 'item-1', contestKey: 'c101', formulaKey: 'alpha', teams: [team('alice', 1, 1)] })],
      config: {
        adjustmentRules: [{ id: 'bad-field', unitKey: 'alpha', field: 'rank' as any, operation: 'add', value: 1 }],
      },
    })).toThrow('Score adjustment field');

    expect(() => buildScoredContestReport({
      roomId: 'room-1',
      scope: 'global',
      sources: [source({ itemId: 'item-1', contestKey: 'c101', formulaKey: 'alpha', teams: [team('alice', 1, 1)] })],
      config: {
        adjustmentRules: [{ id: 'bad-unit', unitKey: 'missing', field: 'solved', operation: 'add', value: 1 }],
      },
    })).toThrow('unknown result unit');

    expect(() => buildScoredContestReport({
      roomId: 'room-1',
      scope: 'global',
      sources: [source({ itemId: 'item-1', contestKey: 'c101', formulaKey: 'alpha', teams: [team('alice', 1, 1)] })],
      config: {
        adjustmentRules: [{ id: 'bad-scope', unitKey: 'alpha', field: 'solved', operation: 'add', value: 1, attendance: 'sometimes' as any }],
      },
    })).toThrow('attendance scope');
  });

  test('supplies zero metrics and attendance flag for missing participation', () => {
    const report = buildScoredContestReport({
      roomId: 'room-1',
      scope: 'global',
      sources: [
        source({ itemId: 'item-1', contestKey: 'c101', formulaKey: 'alpha', sortOrder: 0, teams: [team('alice', 1, 1, 10), team('bob', 2, 2, 20)] }),
        source({ itemId: 'item-2', contestKey: 'c102', formulaKey: 'beta', sortOrder: 1, teams: [team('alice', 0, 0, 0)] }),
      ],
      config: {
        formula: 'sum(raw_score) + attended(1)',
        sortRules: [{ key: 'score', direction: 'desc' }],
      },
    });

    const bob = report.users.find((user: any) => user.username === 'bob');
    expect(bob?.contests.beta.solved).toBe(0);
    expect(bob?.contests.beta.penalty).toBe(0);
    expect(bob?.contests.beta.rawScore).toBe(0);
    expect(bob?.contests.beta.attended).toBe(0);
  });

  test('applies exclusions and drop-worst before formula variables', () => {
    const report = buildScoredContestReport({
      roomId: 'room-1',
      scope: 'global',
      sources: [
        source({ itemId: 'item-1', contestKey: 'c101', formulaKey: 'alpha', sortOrder: 0, teams: [team('alice', 1, 1, 100)] }),
        source({ itemId: 'item-2', contestKey: 'c102', formulaKey: 'beta', sortOrder: 1, teams: [team('alice', 4, 4, 20)] }),
        source({ itemId: 'item-3', contestKey: 'c103', formulaKey: 'gamma', sortOrder: 2, teams: [team('alice', 2, 2, 10)] }),
      ],
      config: {
        formula: 'sum(raw_score)',
        sortRules: [{ key: 'score', direction: 'desc' }],
        excludedUnitKeys: ['gamma'],
        dropWorstCount: 1,
      },
    });

    const alice = report.users[0];
    expect(alice.score).toBe(4);
    expect(alice.contests.alpha.dropped).toBe(true);
    expect(alice.contests.gamma.excluded).toBe(true);
    expect(alice.scoringVariables.included_unit_count).toBe(1);
  });

  test('uses unrounded scores for sorting and competition ranks for exact ties', () => {
    const report = buildScoredContestReport({
      roomId: 'room-1',
      scope: 'global',
      sources: [
        source({
          itemId: 'item-1',
          contestKey: 'c101',
          formulaKey: 'alpha',
          teams: [
            team('alice', 1, 1.004, 1),
            team('bob', 1, 1.003, 1),
            team('cathy', 1, 1.003, 1),
          ],
        }),
      ],
      config: {
        formula: 'sum(raw_score)',
        scorePrecision: 2,
        sortRules: [{ key: 'score', direction: 'desc' }],
      },
    });

    expect(report.users.map((user: any) => user.username)).toEqual(['alice', 'bob', 'cathy']);
    expect(report.users.map((user: any) => user.displayScore)).toEqual([1, 1, 1]);
    expect(report.users.map((user: any) => user.rank)).toEqual([1, 2, 2]);
  });

  test('keeps classroom default as solve-only ordering and ignores penalty', () => {
    const report = buildScoredContestReport({
      roomId: 'room-1',
      scope: 'classroom',
      defaultConfig: defaultScoringConfigForScope('classroom', 'TFC', ['first', 'second']),
      sources: [
        source({ itemId: 'item-1', contestKey: 'c101', formulaKey: 'first', sortOrder: 0, teams: [team('alice', 1, 1, 80), team('bob', 2, 2, 20)] }),
        source({ itemId: 'item-2', contestKey: 'c102', formulaKey: 'second', sortOrder: 1, teams: [team('alice', 10, 10, 120), team('bob', 0, 0)] }),
      ],
      config: {},
    });

    expect(report.scoring.formula).toBe('sum(solved)');
    expect(report.scoring.penaltyScoreFormula).toBe('sum(penalty) + stddev(penalty)');
    expect(report.scoring.adjustmentRules).toEqual([{
      id: 'classroom_ignore_penalty',
      unitKey: '*',
      field: 'penalty',
      operation: 'multiply',
      value: 0,
      attendance: 'attended',
    }]);
    expect(report.users.map((user: any) => user.username)).toEqual(['alice', 'bob']);
    expect(report.users.map((user: any) => user.score)).toEqual([11, 2]);
    expect(report.users.map((user: any) => user.penaltyScore)).toEqual([0, 0]);
  });

  test('filters metrics by row properties in final formulas', () => {
    const report = buildScoredContestReport({
      roomId: 'room-1',
      scope: 'global',
      sources: [
        source({ itemId: 'item-1', contestKey: 'c101', formulaKey: 'alpha', title: 'TFC Alpha', sortOrder: 0, teams: [team('alice', 1, 5, 20, 2)] }),
        source({ itemId: 'item-2', contestKey: 'c102', formulaKey: 'beta', title: 'Practice Beta', sortOrder: 1, teams: [team('alice', 1, 7, 30, 4)] }),
      ],
      config: {
        formula: 'sum(demerits where title contains "tfc") + raw_score(1)',
        sortRules: [{ key: 'score', direction: 'desc' }],
      },
    });

    expect(report.users[0].score).toBe(9);
  });

  test('exposes legacy TSC variables and components', () => {
    const report = buildScoredContestReport({
      roomId: 'room-1',
      scope: 'global',
      roomType: 'TSC',
      sources: [
        source({ itemId: 'item-1', contestKey: 'c201', formulaKey: 'selection', teams: [team('alpha', 3, 30), team('beta', 2, 20)] }),
      ],
      legacyTsc: {
        tfcScoreByParticipant: new Map([['alpha', 50], ['beta', 100]]),
        tfcPercentage: 40,
        tscPercentage: 60,
      },
      config: {
        formula: 'tfc_component + tsc_component',
        sortRules: [{ key: 'score', direction: 'desc' }],
      },
    });

    const beta = report.users.find((user: any) => user.username === 'beta');
    expect(report.scoring.legacyTsc.highestTfcScore).toBe(100);
    expect(beta?.scoringVariables.tfc_score).toBe(100);
    expect(beta?.score).toBe(80);
  });
});
