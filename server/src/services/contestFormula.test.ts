import { describe, expect, test } from 'bun:test';
import { evaluateFormula, tokenizeFormula } from './contestFormula';

const rows = [
  {
    index: 0,
    key: 'c1',
    title: 'TFC 1',
    name: 'TFC 1',
    provider: 'vjudge',
    external_id: '101',
    contest_id: '101',
    weight: 1,
    order: 0,
    solved: 2,
    penalty: 20,
    raw_score: 5,
    score: 5,
    final_score: 5,
    demerits: 1,
    attended: 1,
    included: 1,
    dropped: 0,
    excluded: 0,
    composite: 0,
    is_composite: 0,
  },
  {
    index: 1,
    key: 'c2',
    title: 'Practice 2',
    name: 'Practice 2',
    provider: 'codeforces',
    external_id: '102',
    contest_id: '102',
    weight: 1,
    order: 1,
    solved: 3,
    penalty: 30,
    raw_score: 7,
    score: 7,
    final_score: 7,
    demerits: 4,
    attended: 1,
    included: 1,
    dropped: 0,
    excluded: 0,
    composite: 0,
    is_composite: 0,
  },
];

describe('contest formula evaluator', () => {
  test('evaluates arithmetic, functions, and negative finite scores', () => {
    const result = evaluateFormula(
      'max(sum(solved) * 2, pow(max(raw_score), 2)) - clamp(sum(demerits), 0, 3)',
      { rows },
    );

    expect(result.value).toBe(46);
    expect(result.variablesUsed).toEqual(['demerits', 'raw_score', 'solved']);

    expect(evaluateFormula('0 - sum(demerits)', { rows }).value).toBe(-5);
  });

  test('supports metric indexes, filters, and sheet-style aggregates', () => {
    expect(evaluateFormula('demerits(0)', { rows }).value).toBe(1);
    expect(evaluateFormula('sum(demerits)', { rows }).value).toBe(5);
    expect(evaluateFormula('sum(demerits(0))', { rows }).value).toBe(1);
    expect(evaluateFormula('sum(demerits where index == 0)', { rows }).value).toBe(1);
    expect(evaluateFormula('sum(raw_score where title contains "tfc")', { rows }).value).toBe(5);
    expect(evaluateFormula('sum(raw_score where provider == "codeforces")', { rows }).value).toBe(7);
  });

  test('supports comparisons, boolean operators, and ternaries', () => {
    expect(evaluateFormula('count(attended where attended == 1) >= 2 and not sum(demerits where title contains "none") ? 10 : -1', {
      rows,
    }).value).toBe(10);

    expect(evaluateFormula('sum(solved) > 4 or sum(raw_score) > 20 ? 1 : 0', { rows }).value).toBe(1);
  });

  test('rejects unknown variables and unapproved functions', () => {
    expect(() => evaluateFormula('unknown + 1', {})).toThrow('Unknown variable');
    expect(() => evaluateFormula('constructor(total_solved)', { total_solved: 1 })).toThrow('not allowed');
    expect(() => evaluateFormula('demerits', { rows })).toThrow('needs an aggregate');
  });

  test('rejects injection-shaped syntax and property access', () => {
    expect(() => tokenizeFormula('score; process.exit()')).toThrow('Unsupported token');
    expect(() => tokenizeFormula('score.__proto__')).toThrow('Unsupported token');
    expect(() => evaluateFormula('"score"', { rows })).toThrow('String literals');
  });

  test('rejects invalid arithmetic', () => {
    expect(() => evaluateFormula('sum(solved) / 0', { rows })).toThrow('Division by zero');
    expect(() => evaluateFormula('sqrt(0 - sum(solved))', { rows })).toThrow('negative');
    expect(() => evaluateFormula('pow(10, 1000)', {})).toThrow('invalid number');
  });

  test('enforces expression size and structural limits', () => {
    expect(() => evaluateFormula('1'.repeat(1001), {})).toThrow('1000');

    const deep = `${'('.repeat(40)}1${')'.repeat(40)}`;
    expect(() => evaluateFormula(deep, {})).toThrow('too deep');

    const manyNodes = Array.from({ length: 260 }, () => '1').join('+');
    expect(() => evaluateFormula(manyNodes, {})).toThrow('too complex');
  });

  test('covers every allowed function', () => {
    const vars = { x: 2, y: 5 };
    expect(evaluateFormula('min(x, y)', vars).value).toBe(2);
    expect(evaluateFormula('max(x, y)', vars).value).toBe(5);
    expect(evaluateFormula('abs(0 - y)', vars).value).toBe(5);
    expect(evaluateFormula('sqrt(9)', vars).value).toBe(3);
    expect(evaluateFormula('pow(x, 3)', vars).value).toBe(8);
    expect(evaluateFormula('floor(2.9)', vars).value).toBe(2);
    expect(evaluateFormula('ceil(2.1)', vars).value).toBe(3);
    expect(evaluateFormula('round(2.5)', vars).value).toBe(3);
    expect(evaluateFormula('clamp(8, 1, 4)', vars).value).toBe(4);
    expect(evaluateFormula('avg(raw_score)', { rows }).value).toBe(6);
    expect(evaluateFormula('count(raw_score)', { rows }).value).toBe(2);
    expect(evaluateFormula('stddev(raw_score)', { rows }).value).toBe(1);
  });
});
