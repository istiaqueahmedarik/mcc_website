export type FormulaValueMap = Record<string, number>;

export type FormulaMetricRow = {
  index: number;
  key: string;
  title: string;
  name: string;
  provider: string;
  external_id: string;
  contest_id: string;
  weight: number;
  order: number;
  solved: number;
  penalty: number;
  raw_score: number;
  score: number;
  final_score: number;
  demerits: number;
  attended: number;
  included: number;
  dropped: number;
  excluded: number;
  composite: number;
  is_composite: number;
  [key: string]: number | string | null | undefined;
};

export type FormulaEvaluationContext =
  | FormulaValueMap
  | {
    variables?: FormulaValueMap;
    rows?: FormulaMetricRow[];
  };

export type FormulaEvaluationResult = {
  value: number;
  variablesUsed: string[];
};

type TokenType =
  | 'number'
  | 'string'
  | 'identifier'
  | 'operator'
  | 'paren'
  | 'comma'
  | 'question'
  | 'colon'
  | 'eof';

type Token = {
  type: TokenType;
  value: string;
  position: number;
};

type FilterNode =
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'field'; name: string }
  | { type: 'unary'; operator: 'not'; argument: FilterNode }
  | { type: 'logical'; operator: 'and' | 'or'; left: FilterNode; right: FilterNode }
  | { type: 'comparison'; operator: string; left: FilterNode; right: FilterNode };

type AstNode =
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'variable'; name: string }
  | { type: 'metric'; name: string; index?: AstNode; filter?: FilterNode }
  | { type: 'unary'; operator: string; argument: AstNode }
  | { type: 'binary'; operator: string; left: AstNode; right: AstNode }
  | { type: 'logical'; operator: 'and' | 'or'; left: AstNode; right: AstNode }
  | { type: 'conditional'; test: AstNode; consequent: AstNode; alternate: AstNode }
  | { type: 'call'; name: string; args: AstNode[] };

type MetricSelection = {
  kind: 'metric-selection';
  metric: string;
  rows: FormulaMetricRow[];
  values: number[];
};

type FormulaRuntimeValue = number | string | MetricSelection;

type NormalizedFormulaContext = {
  variables: FormulaValueMap;
  rows: FormulaMetricRow[];
};

const MAX_EXPRESSION_LENGTH = 1000;
const MAX_AST_NODES = 256;
const MAX_AST_DEPTH = 32;
const IDENTIFIER_REGEX = /^[a-z][a-z0-9_]{0,47}$/;

export const FORMULA_METRIC_NAMES = [
  'solved',
  'penalty',
  'raw_score',
  'score',
  'final_score',
  'demerits',
  'attended',
  'included',
  'dropped',
  'excluded',
  'weight',
];

export const FORMULA_FILTER_FIELDS = [
  'index',
  'key',
  'title',
  'name',
  'provider',
  'external_id',
  'contest_id',
  'weight',
  'order',
  'solved',
  'penalty',
  'raw_score',
  'score',
  'final_score',
  'demerits',
  'attended',
  'included',
  'dropped',
  'excluded',
  'composite',
  'is_composite',
];

const METRIC_NAME_SET = new Set(FORMULA_METRIC_NAMES);
const FILTER_FIELD_SET = new Set(FORMULA_FILTER_FIELDS);
const STRING_FILTER_OPERATORS = new Set(['contains', 'has', 'starts_with', 'ends_with']);
const RESERVED_IDENTIFIERS = new Set(['and', 'or', 'not', 'where', ...STRING_FILTER_OPERATORS]);
const SCALAR_FUNCTIONS = new Set([
  'min',
  'max',
  'abs',
  'sqrt',
  'pow',
  'floor',
  'ceil',
  'round',
  'clamp',
]);
const AGGREGATE_FUNCTIONS = new Set([
  'sum',
  'avg',
  'count',
  'stddev',
  'stdev',
]);
const ALLOWED_FUNCTIONS = new Set([...SCALAR_FUNCTIONS, ...AGGREGATE_FUNCTIONS]);

export const APPROVED_FORMULA_FUNCTIONS = Array.from(ALLOWED_FUNCTIONS).sort();

export function isValidFormulaIdentifier(value: unknown): value is string {
  return IDENTIFIER_REGEX.test(String(value || ''));
}

function isDigit(char: string) {
  return char >= '0' && char <= '9';
}

function isIdentifierStart(char: string) {
  return char >= 'a' && char <= 'z';
}

function isIdentifierPart(char: string) {
  return (char >= 'a' && char <= 'z') || (char >= '0' && char <= '9') || char === '_';
}

function readStringLiteral(expression: string, start: number) {
  const quote = expression[start];
  let index = start + 1;
  let value = '';

  while (index < expression.length) {
    const char = expression[index];
    if (char === quote) {
      return { value, nextIndex: index + 1 };
    }
    if (char === '\\') {
      const escaped = expression[index + 1];
      if (!escaped) throw new Error(`Unterminated string at position ${start}`);
      if (escaped === quote || escaped === '\\') {
        value += escaped;
        index += 2;
        continue;
      }
      if (escaped === 'n') {
        value += '\n';
        index += 2;
        continue;
      }
      throw new Error(`Unsupported string escape at position ${index}`);
    }
    if (char === '\n' || char === '\r') {
      throw new Error(`String literals cannot span lines at position ${start}`);
    }
    value += char;
    index += 1;
  }

  throw new Error(`Unterminated string at position ${start}`);
}

export function tokenizeFormula(expression: string): Token[] {
  if (typeof expression !== 'string') {
    throw new Error('Formula must be a string');
  }
  if (expression.length > MAX_EXPRESSION_LENGTH) {
    throw new Error(`Formula must be ${MAX_EXPRESSION_LENGTH} characters or less`);
  }

  const tokens: Token[] = [];
  let index = 0;
  let parenDepth = 0;

  while (index < expression.length) {
    const char = expression[index];

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (isDigit(char) || (char === '.' && isDigit(expression[index + 1] || ''))) {
      const start = index;
      let seenDot = char === '.';
      index += 1;
      while (index < expression.length) {
        const next = expression[index];
        if (isDigit(next)) {
          index += 1;
          continue;
        }
        if (next === '.' && !seenDot) {
          seenDot = true;
          index += 1;
          continue;
        }
        break;
      }
      if (/[eE]/.test(expression[index] || '')) {
        index += 1;
        if (/[+-]/.test(expression[index] || '')) index += 1;
        if (!isDigit(expression[index] || '')) {
          throw new Error(`Invalid number exponent at position ${start}`);
        }
        while (isDigit(expression[index] || '')) index += 1;
      }
      const value = expression.slice(start, index);
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) {
        throw new Error(`Invalid number at position ${start}`);
      }
      tokens.push({ type: 'number', value, position: start });
      continue;
    }

    if (char === '"' || char === '\'') {
      const start = index;
      const literal = readStringLiteral(expression, start);
      tokens.push({ type: 'string', value: literal.value, position: start });
      index = literal.nextIndex;
      continue;
    }

    if (isIdentifierStart(char)) {
      const start = index;
      index += 1;
      while (isIdentifierPart(expression[index] || '')) index += 1;
      const value = expression.slice(start, index);
      if (!IDENTIFIER_REGEX.test(value)) {
        throw new Error(`Invalid identifier "${value}" at position ${start}`);
      }
      tokens.push({ type: 'identifier', value, position: start });
      continue;
    }

    const twoChar = expression.slice(index, index + 2);
    if (['>=', '<=', '==', '!=', '**'].includes(twoChar)) {
      tokens.push({ type: 'operator', value: twoChar, position: index });
      index += 2;
      continue;
    }

    if (['+', '-', '*', '/', '%', '<', '>'].includes(char)) {
      tokens.push({ type: 'operator', value: char, position: index });
      index += 1;
      continue;
    }

    if (char === '(' || char === ')') {
      if (char === '(') {
        parenDepth += 1;
        if (parenDepth > MAX_AST_DEPTH) {
          throw new Error(`Formula nesting is too deep; limit is ${MAX_AST_DEPTH}`);
        }
      } else {
        parenDepth = Math.max(0, parenDepth - 1);
      }
      tokens.push({ type: 'paren', value: char, position: index });
      index += 1;
      continue;
    }

    if (char === ',') {
      tokens.push({ type: 'comma', value: char, position: index });
      index += 1;
      continue;
    }

    if (char === '?') {
      tokens.push({ type: 'question', value: char, position: index });
      index += 1;
      continue;
    }

    if (char === ':') {
      tokens.push({ type: 'colon', value: char, position: index });
      index += 1;
      continue;
    }

    throw new Error(`Unsupported token "${char}" at position ${index}`);
  }

  tokens.push({ type: 'eof', value: '', position: expression.length });
  return tokens;
}

class FormulaParser {
  private index = 0;
  private nodeCount = 0;

  constructor(private readonly tokens: Token[]) {}

  parse(): AstNode {
    const expression = this.parseConditional();
    this.expect('eof');
    this.validateAst(expression, 1);
    return expression;
  }

  private current(): Token {
    return this.tokens[this.index] || this.tokens[this.tokens.length - 1];
  }

  private match(type: TokenType, value?: string): Token | null {
    const token = this.current();
    if (token.type !== type) return null;
    if (value !== undefined && token.value !== value) return null;
    this.index += 1;
    return token;
  }

  private matchIdentifier(value: string): Token | null {
    const token = this.current();
    if (token.type === 'identifier' && token.value === value) {
      this.index += 1;
      return token;
    }
    return null;
  }

  private expect(type: TokenType, value?: string): Token {
    const token = this.match(type, value);
    if (!token) {
      const current = this.current();
      const expected = value ? `${type} "${value}"` : type;
      throw new Error(`Expected ${expected} at position ${current.position}`);
    }
    return token;
  }

  private node<T extends AstNode>(node: T): T {
    this.nodeCount += 1;
    if (this.nodeCount > MAX_AST_NODES) {
      throw new Error(`Formula is too complex; limit is ${MAX_AST_NODES} AST nodes`);
    }
    return node;
  }

  private filterNode<T extends FilterNode>(node: T): T {
    this.nodeCount += 1;
    if (this.nodeCount > MAX_AST_NODES) {
      throw new Error(`Formula is too complex; limit is ${MAX_AST_NODES} AST nodes`);
    }
    return node;
  }

  private validateAst(node: AstNode, depth: number) {
    if (depth > MAX_AST_DEPTH) {
      throw new Error(`Formula nesting is too deep; limit is ${MAX_AST_DEPTH}`);
    }

    switch (node.type) {
      case 'unary':
        this.validateAst(node.argument, depth + 1);
        break;
      case 'binary':
      case 'logical':
        this.validateAst(node.left, depth + 1);
        this.validateAst(node.right, depth + 1);
        break;
      case 'conditional':
        this.validateAst(node.test, depth + 1);
        this.validateAst(node.consequent, depth + 1);
        this.validateAst(node.alternate, depth + 1);
        break;
      case 'call':
        node.args.forEach((arg) => this.validateAst(arg, depth + 1));
        break;
      case 'metric':
        if (!METRIC_NAME_SET.has(node.name)) {
          throw new Error(`Unknown metric "${node.name}"`);
        }
        if (node.index) this.validateAst(node.index, depth + 1);
        if (node.filter) this.validateFilter(node.filter, depth + 1);
        break;
      default:
        break;
    }
  }

  private validateFilter(node: FilterNode, depth: number) {
    if (depth > MAX_AST_DEPTH) {
      throw new Error(`Formula nesting is too deep; limit is ${MAX_AST_DEPTH}`);
    }
    switch (node.type) {
      case 'unary':
        this.validateFilter(node.argument, depth + 1);
        break;
      case 'logical':
      case 'comparison':
        this.validateFilter(node.left, depth + 1);
        this.validateFilter(node.right, depth + 1);
        break;
      default:
        break;
    }
  }

  private parseConditional(): AstNode {
    const test = this.parseOr();
    if (!this.match('question')) return test;

    const consequent = this.parseConditional();
    this.expect('colon');
    const alternate = this.parseConditional();
    return this.node({ type: 'conditional', test, consequent, alternate });
  }

  private parseOr(): AstNode {
    let left = this.parseAnd();
    while (this.matchIdentifier('or')) {
      const right = this.parseAnd();
      left = this.node({ type: 'logical', operator: 'or', left, right });
    }
    return left;
  }

  private parseAnd(): AstNode {
    let left = this.parseComparison();
    while (this.matchIdentifier('and')) {
      const right = this.parseComparison();
      left = this.node({ type: 'logical', operator: 'and', left, right });
    }
    return left;
  }

  private parseComparison(): AstNode {
    let left = this.parseAdditive();
    while (true) {
      const operator = ['>=', '<=', '==', '!=', '<', '>'].find((op) => this.current().type === 'operator' && this.current().value === op);
      if (!operator) return left;
      this.index += 1;
      const right = this.parseAdditive();
      left = this.node({ type: 'binary', operator, left, right });
    }
  }

  private parseAdditive(): AstNode {
    let left = this.parseMultiplicative();
    while (this.current().type === 'operator' && ['+', '-'].includes(this.current().value)) {
      const operator = this.current().value;
      this.index += 1;
      const right = this.parseMultiplicative();
      left = this.node({ type: 'binary', operator, left, right });
    }
    return left;
  }

  private parseMultiplicative(): AstNode {
    let left = this.parsePower();
    while (this.current().type === 'operator' && ['*', '/', '%'].includes(this.current().value)) {
      const operator = this.current().value;
      this.index += 1;
      const right = this.parsePower();
      left = this.node({ type: 'binary', operator, left, right });
    }
    return left;
  }

  private parsePower(): AstNode {
    let left = this.parseUnary();
    if (this.match('operator', '**')) {
      const right = this.parsePower();
      left = this.node({ type: 'binary', operator: '**', left, right });
    }
    return left;
  }

  private parseUnary(): AstNode {
    if (this.current().type === 'operator' && ['+', '-'].includes(this.current().value)) {
      const operator = this.current().value;
      this.index += 1;
      return this.node({ type: 'unary', operator, argument: this.parseUnary() });
    }
    if (this.matchIdentifier('not')) {
      return this.node({ type: 'unary', operator: 'not', argument: this.parseUnary() });
    }
    return this.parsePrimary();
  }

  private parsePrimary(): AstNode {
    const token = this.current();
    if (token.type === 'number') {
      this.index += 1;
      return this.node({ type: 'number', value: Number(token.value) });
    }

    if (token.type === 'string') {
      this.index += 1;
      return this.node({ type: 'string', value: token.value });
    }

    if (token.type === 'identifier') {
      this.index += 1;

      if (METRIC_NAME_SET.has(token.value)) {
        const metric: { type: 'metric'; name: string; index?: AstNode; filter?: FilterNode } = {
          type: 'metric',
          name: token.value,
        };
        if (this.match('paren', '(')) {
          if (this.match('paren', ')')) {
            throw new Error(`Metric "${token.value}" requires an index inside parentheses`);
          }
          metric.index = this.parseConditional();
          this.expect('paren', ')');
        }
        if (this.matchIdentifier('where')) {
          metric.filter = this.parseFilterOr();
        }
        return this.node(metric);
      }

      if (this.match('paren', '(')) {
        const args: AstNode[] = [];
        if (!this.match('paren', ')')) {
          do {
            args.push(this.parseConditional());
          } while (this.match('comma'));
          this.expect('paren', ')');
        }
        if (!ALLOWED_FUNCTIONS.has(token.value)) {
          throw new Error(`Function "${token.value}" is not allowed`);
        }
        return this.node({ type: 'call', name: token.value, args });
      }

      if (RESERVED_IDENTIFIERS.has(token.value)) {
        throw new Error(`Unexpected operator "${token.value}" at position ${token.position}`);
      }
      return this.node({ type: 'variable', name: token.value });
    }

    if (this.match('paren', '(')) {
      const expression = this.parseConditional();
      this.expect('paren', ')');
      return expression;
    }

    throw new Error(`Unexpected token at position ${token.position}`);
  }

  private parseFilterOr(): FilterNode {
    let left = this.parseFilterAnd();
    while (this.matchIdentifier('or')) {
      const right = this.parseFilterAnd();
      left = this.filterNode({ type: 'logical', operator: 'or', left, right });
    }
    return left;
  }

  private parseFilterAnd(): FilterNode {
    let left = this.parseFilterNot();
    while (this.matchIdentifier('and')) {
      const right = this.parseFilterNot();
      left = this.filterNode({ type: 'logical', operator: 'and', left, right });
    }
    return left;
  }

  private parseFilterNot(): FilterNode {
    if (this.matchIdentifier('not')) {
      return this.filterNode({ type: 'unary', operator: 'not', argument: this.parseFilterNot() });
    }
    return this.parseFilterComparison();
  }

  private parseFilterComparison(): FilterNode {
    const left = this.parseFilterPrimary();
    const current = this.current();
    if (current.type === 'operator' && ['>=', '<=', '==', '!=', '<', '>'].includes(current.value)) {
      this.index += 1;
      return this.filterNode({ type: 'comparison', operator: current.value, left, right: this.parseFilterPrimary() });
    }
    if (current.type === 'identifier' && STRING_FILTER_OPERATORS.has(current.value)) {
      this.index += 1;
      return this.filterNode({ type: 'comparison', operator: current.value, left, right: this.parseFilterPrimary() });
    }
    return left;
  }

  private parseFilterPrimary(): FilterNode {
    const token = this.current();
    if (token.type === 'number') {
      this.index += 1;
      return this.filterNode({ type: 'number', value: Number(token.value) });
    }
    if (token.type === 'string') {
      this.index += 1;
      return this.filterNode({ type: 'string', value: token.value });
    }
    if (token.type === 'identifier') {
      this.index += 1;
      if (token.value === 'true') return this.filterNode({ type: 'number', value: 1 });
      if (token.value === 'false') return this.filterNode({ type: 'number', value: 0 });
      if (!FILTER_FIELD_SET.has(token.value)) {
        throw new Error(`Unknown filter field "${token.value}" at position ${token.position}`);
      }
      return this.filterNode({ type: 'field', name: token.value });
    }
    if (this.match('paren', '(')) {
      const expression = this.parseFilterOr();
      this.expect('paren', ')');
      return expression;
    }
    throw new Error(`Unexpected filter token at position ${token.position}`);
  }
}

function ensureFinite(value: number, message: string): number {
  if (!Number.isFinite(value)) throw new Error(message);
  return value;
}

function truthy(value: FormulaRuntimeValue) {
  if (isMetricSelection(value)) {
    throw new Error(`Metric "${value.metric}" needs an aggregate like sum(${value.metric}) or an index like ${value.metric}(0)`);
  }
  if (typeof value === 'string') return value.length > 0;
  return value !== 0;
}

function normalizeEvaluationContext(input: FormulaEvaluationContext | undefined): NormalizedFormulaContext {
  const maybeContext = input as { variables?: FormulaValueMap; rows?: FormulaMetricRow[] } | undefined;
  if (maybeContext && (Array.isArray(maybeContext.rows) || maybeContext.variables)) {
    return {
      variables: maybeContext.variables || {},
      rows: Array.isArray(maybeContext.rows) ? maybeContext.rows : [],
    };
  }
  return {
    variables: (input || {}) as FormulaValueMap,
    rows: [],
  };
}

function isMetricSelection(value: FormulaRuntimeValue): value is MetricSelection {
  return typeof value === 'object' && value !== null && (value as MetricSelection).kind === 'metric-selection';
}

function asNumber(value: FormulaRuntimeValue, message: string): number {
  if (isMetricSelection(value)) {
    throw new Error(`Metric "${value.metric}" needs an aggregate like sum(${value.metric}) or an index like ${value.metric}(0)`);
  }
  if (typeof value === 'string') {
    throw new Error('String literals are only allowed inside metric filters');
  }
  return ensureFinite(Number(value), message);
}

function normalizeString(value: unknown) {
  return String(value ?? '').toLowerCase();
}

function compareValues(left: FormulaRuntimeValue, right: FormulaRuntimeValue, operator: string): number {
  if (operator === '==' || operator === '!=') {
    const leftValue = typeof left === 'number' ? left : normalizeString(left);
    const rightValue = typeof right === 'number' ? right : normalizeString(right);
    const equal = leftValue === rightValue;
    return operator === '==' ? (equal ? 1 : 0) : (equal ? 0 : 1);
  }

  const numericLeft = asNumber(left, 'Comparison left side is not numeric');
  const numericRight = asNumber(right, 'Comparison right side is not numeric');
  switch (operator) {
    case '>':
      return numericLeft > numericRight ? 1 : 0;
    case '<':
      return numericLeft < numericRight ? 1 : 0;
    case '>=':
      return numericLeft >= numericRight ? 1 : 0;
    case '<=':
      return numericLeft <= numericRight ? 1 : 0;
    default:
      throw new Error(`Unsupported operator "${operator}"`);
  }
}

function evaluateScalarFunction(name: string, args: number[]): number {
  switch (name) {
    case 'min':
      if (args.length < 1) throw new Error('min requires at least one argument');
      return Math.min(...args);
    case 'max':
      if (args.length < 1) throw new Error('max requires at least one argument');
      return Math.max(...args);
    case 'abs':
      if (args.length !== 1) throw new Error('abs requires one argument');
      return Math.abs(args[0]);
    case 'sqrt':
      if (args.length !== 1) throw new Error('sqrt requires one argument');
      if (args[0] < 0) throw new Error('sqrt received a negative value');
      return Math.sqrt(args[0]);
    case 'pow':
      if (args.length !== 2) throw new Error('pow requires two arguments');
      return Math.pow(args[0], args[1]);
    case 'floor':
      if (args.length !== 1) throw new Error('floor requires one argument');
      return Math.floor(args[0]);
    case 'ceil':
      if (args.length !== 1) throw new Error('ceil requires one argument');
      return Math.ceil(args[0]);
    case 'round':
      if (args.length !== 1) throw new Error('round requires one argument');
      return Math.round(args[0]);
    case 'clamp':
      if (args.length !== 3) throw new Error('clamp requires three arguments');
      return Math.min(Math.max(args[0], args[1]), args[2]);
    default:
      throw new Error(`Function "${name}" is not allowed`);
  }
}

function metricValue(row: FormulaMetricRow, metric: string) {
  const value = row[metric] ?? 0;
  return ensureFinite(Number(value), `Metric "${metric}" returned an invalid number`);
}

function evaluateFilterNode(node: FilterNode, row: FormulaMetricRow): FormulaRuntimeValue {
  switch (node.type) {
    case 'number':
      return node.value;
    case 'string':
      return node.value;
    case 'field':
      return row[node.name] ?? '';
    case 'unary':
      return truthy(evaluateFilterNode(node.argument, row)) ? 0 : 1;
    case 'logical': {
      const left = evaluateFilterNode(node.left, row);
      if (node.operator === 'and') {
        if (!truthy(left)) return 0;
        return truthy(evaluateFilterNode(node.right, row)) ? 1 : 0;
      }
      if (truthy(left)) return 1;
      return truthy(evaluateFilterNode(node.right, row)) ? 1 : 0;
    }
    case 'comparison': {
      const left = evaluateFilterNode(node.left, row);
      const right = evaluateFilterNode(node.right, row);
      if (STRING_FILTER_OPERATORS.has(node.operator)) {
        const haystack = normalizeString(left);
        const needle = normalizeString(right);
        if (node.operator === 'starts_with') return haystack.startsWith(needle) ? 1 : 0;
        if (node.operator === 'ends_with') return haystack.endsWith(needle) ? 1 : 0;
        return haystack.includes(needle) ? 1 : 0;
      }
      return compareValues(left, right, node.operator);
    }
    default:
      throw new Error('Unsupported filter node');
  }
}

function evaluateMetricNode(
  node: Extract<AstNode, { type: 'metric' }>,
  context: NormalizedFormulaContext,
  used: Set<string>,
  asSelection = false,
): FormulaRuntimeValue {
  if (!context.rows.length) {
    throw new Error(`Metric "${node.name}" requires contest rows`);
  }

  used.add(node.name);
  let rows = context.rows;

  if (node.index) {
    const index = Math.trunc(asNumber(evaluateAst(node.index, context, used), `Metric "${node.name}" index must be numeric`));
    rows = rows.filter((row) => Number(row.index) === index);
  }

  if (node.filter) {
    rows = rows.filter((row) => truthy(evaluateFilterNode(node.filter as FilterNode, row)));
  }

  const values = rows.map((row) => metricValue(row, node.name));
  if (asSelection) {
    return {
      kind: 'metric-selection',
      metric: node.name,
      rows,
      values,
    };
  }

  if (node.index) {
    return values[0] ?? 0;
  }

  throw new Error(`Metric "${node.name}" needs an aggregate like sum(${node.name}) or an index like ${node.name}(0)`);
}

function stdDeviation(values: number[]): number {
  if (!values.length) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function evaluateAggregate(name: string, arg: AstNode, context: NormalizedFormulaContext, used: Set<string>): number {
  if (arg.type !== 'metric') {
    throw new Error(`${name} requires a metric selector, for example ${name}(raw_score)`);
  }

  const selection = evaluateMetricNode(arg, context, used, true) as MetricSelection;
  switch (name) {
    case 'sum':
      return selection.values.reduce((sum, value) => sum + value, 0);
    case 'avg':
      return selection.values.length
        ? selection.values.reduce((sum, value) => sum + value, 0) / selection.values.length
        : 0;
    case 'count':
      return selection.rows.length;
    case 'min':
      return selection.values.length ? Math.min(...selection.values) : 0;
    case 'max':
      return selection.values.length ? Math.max(...selection.values) : 0;
    case 'stddev':
    case 'stdev':
      return stdDeviation(selection.values);
    default:
      throw new Error(`Function "${name}" is not allowed`);
  }
}

function evaluateCall(node: Extract<AstNode, { type: 'call' }>, context: NormalizedFormulaContext, used: Set<string>): number {
  const firstArg = node.args[0];
  const aggregateByName = AGGREGATE_FUNCTIONS.has(node.name);
  const aggregateMinMax = ['min', 'max'].includes(node.name) && node.args.length === 1 && firstArg?.type === 'metric';

  if (aggregateByName || aggregateMinMax) {
    if (node.args.length !== 1 || !firstArg) {
      throw new Error(`${node.name} requires one metric selector`);
    }
    return ensureFinite(evaluateAggregate(node.name, firstArg, context, used), `Function "${node.name}" returned an invalid number`);
  }

  const args = node.args.map((arg) => asNumber(evaluateAst(arg, context, used), `Function "${node.name}" argument is not numeric`));
  return ensureFinite(evaluateScalarFunction(node.name, args), `Function "${node.name}" returned an invalid number`);
}

function evaluateAst(node: AstNode, context: NormalizedFormulaContext, used: Set<string>): FormulaRuntimeValue {
  switch (node.type) {
    case 'number':
      return node.value;
    case 'string':
      return node.value;
    case 'variable': {
      if (!Object.prototype.hasOwnProperty.call(context.variables, node.name)) {
        throw new Error(`Unknown variable "${node.name}"`);
      }
      used.add(node.name);
      return ensureFinite(Number(context.variables[node.name]), `Variable "${node.name}" is not finite`);
    }
    case 'metric':
      return evaluateMetricNode(node, context, used, false);
    case 'unary': {
      const value = evaluateAst(node.argument, context, used);
      if (node.operator === '+') return asNumber(value, 'Unary plus argument is not numeric');
      if (node.operator === '-') return ensureFinite(-asNumber(value, 'Unary minus argument is not numeric'), 'Formula returned an invalid number');
      if (node.operator === 'not') return truthy(value) ? 0 : 1;
      throw new Error(`Unsupported unary operator "${node.operator}"`);
    }
    case 'logical': {
      const left = evaluateAst(node.left, context, used);
      if (node.operator === 'and') {
        if (!truthy(left)) return 0;
        return truthy(evaluateAst(node.right, context, used)) ? 1 : 0;
      }
      if (truthy(left)) return 1;
      return truthy(evaluateAst(node.right, context, used)) ? 1 : 0;
    }
    case 'conditional':
      return evaluateAst(truthy(evaluateAst(node.test, context, used)) ? node.consequent : node.alternate, context, used);
    case 'binary': {
      const left = evaluateAst(node.left, context, used);
      const right = evaluateAst(node.right, context, used);
      switch (node.operator) {
        case '+':
          return ensureFinite(asNumber(left, 'Addition left side is not numeric') + asNumber(right, 'Addition right side is not numeric'), 'Formula returned an invalid number');
        case '-':
          return ensureFinite(asNumber(left, 'Subtraction left side is not numeric') - asNumber(right, 'Subtraction right side is not numeric'), 'Formula returned an invalid number');
        case '*':
          return ensureFinite(asNumber(left, 'Multiplication left side is not numeric') * asNumber(right, 'Multiplication right side is not numeric'), 'Formula returned an invalid number');
        case '/': {
          const divisor = asNumber(right, 'Division right side is not numeric');
          if (divisor === 0) throw new Error('Division by zero is not allowed');
          return ensureFinite(asNumber(left, 'Division left side is not numeric') / divisor, 'Formula returned an invalid number');
        }
        case '%': {
          const divisor = asNumber(right, 'Modulo right side is not numeric');
          if (divisor === 0) throw new Error('Modulo by zero is not allowed');
          return ensureFinite(asNumber(left, 'Modulo left side is not numeric') % divisor, 'Formula returned an invalid number');
        }
        case '**':
          return ensureFinite(Math.pow(asNumber(left, 'Power left side is not numeric'), asNumber(right, 'Power right side is not numeric')), 'Formula returned an invalid number');
        case '>':
        case '<':
        case '>=':
        case '<=':
        case '==':
        case '!=':
          return compareValues(left, right, node.operator);
        default:
          throw new Error(`Unsupported operator "${node.operator}"`);
      }
    }
    case 'call':
      return evaluateCall(node, context, used);
    default:
      throw new Error('Unsupported formula node');
  }
}

export function parseFormula(expression: string): AstNode {
  return new FormulaParser(tokenizeFormula(expression)).parse();
}

export function evaluateFormula(expression: string, contextOrVariables: FormulaEvaluationContext = {}): FormulaEvaluationResult {
  const ast = parseFormula(expression);
  const used = new Set<string>();
  const context = normalizeEvaluationContext(contextOrVariables);
  const value = asNumber(evaluateAst(ast, context, used), 'Formula returned a non-numeric value');
  return {
    value: ensureFinite(value, 'Formula returned an invalid number'),
    variablesUsed: Array.from(used).sort(),
  };
}
