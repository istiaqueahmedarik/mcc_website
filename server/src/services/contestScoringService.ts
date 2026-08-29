import {
  APPROVED_FORMULA_FUNCTIONS,
  evaluateFormula,
  FORMULA_FILTER_FIELDS,
  FORMULA_METRIC_NAMES,
  isValidFormulaIdentifier,
  parseFormula,
  type FormulaMetricRow,
  type FormulaValueMap,
} from './contestFormula';

export type SortDirection = 'asc' | 'desc';

export type ContestScoringGroupInput = {
  id?: string | null;
  name: string;
  formulaKey: string;
  formula?: string | null;
  solvedScoreFormula?: string | null;
  penaltyScoreFormula?: string | null;
  contestItemIds: string[];
};

export type ContestScoringConfigInput = {
  groups?: ContestScoringGroupInput[];
  formula?: string;
  solvedScoreFormula?: string;
  penaltyScoreFormula?: string;
  scorePrecision?: number;
  sortRules?: Array<{ key: string; direction: SortDirection }>;
  excludedUnitKeys?: string[];
  dropWorstCount?: number;
  version?: number;
};

export type ContestSourceInput = {
  itemId: string;
  contestKey: string;
  formulaKey?: string | null;
  title: string;
  provider?: string | null;
  externalContestId?: string | null;
  weight?: number | null;
  sortOrder?: number | null;
  rankData: any;
  demerits?: any[];
};

export type ContestScoringOptions = {
  roomId: string;
  classroomId?: string | null;
  roomName?: string | null;
  roomType?: string | null;
  scope: 'global' | 'classroom';
  sources: ContestSourceInput[];
  config: ContestScoringConfigInput;
  defaultConfig?: ContestScoringConfigInput;
  legacyTsc?: {
    tfcScoreByParticipant?: Map<string, number>;
    tfcPercentage?: number;
    tscPercentage?: number;
  } | null;
  missingContests?: any[];
  snapshotIds?: string[];
  generatedAt?: string;
};

type ParticipantRow = {
  identityKey: string;
  username: string;
  realName: string;
  avatarUrl: string | null;
  contests: Record<string, any>;
  totalSolved: number;
  totalPenalty: number;
  totalScore: number;
  totalDemeritPoints: number;
  attended: number;
  providers: string[];
  sourceHandles: string[];
  targetType: string | null;
  studentId: string | null;
  groupId: string | null;
  matchedBy: string | null;
  isClassroomParticipant: boolean;
  classroomMapping: any;
};

type ResultUnitDefinition = {
  id: string;
  key: string;
  name: string;
  isComposite: boolean;
  formula: string | null;
  solvedScoreFormula: string | null;
  penaltyScoreFormula: string | null;
  order: number;
  sourceContestIds: string[];
  sourceItemIds: string[];
  sourceFormulaKeys: string[];
  provider?: string | null;
  externalContestId?: string | null;
};

type UnitMetrics = {
  key: string;
  name: string;
  solved: number;
  penalty: number;
  rawScore: number;
  finalScore: number;
  demerits: number;
  attended: number;
  included: number;
  dropped: boolean;
  excluded: boolean;
  order: number;
  weight: number;
  isComposite: boolean;
  sourceContestIds: string[];
  sourceItemIds: string[];
  sourceBreakdown: Record<string, any>;
  provider?: string | null;
  externalContestId?: string | null;
};

const FORMULA_KEY_FALLBACK_PREFIX = 'contest';
export const DEFAULT_COMPOSITE_FORMULA = 'sum(raw_score)';
export const DEFAULT_COMPOSITE_PENALTY_FORMULA = 'sum(penalty)';
const DEFAULT_GLOBAL_FORMULA = 'sum(raw_score) - stddev(raw_score)';
const DEFAULT_GLOBAL_PENALTY_FORMULA = 'sum(penalty) + stddev(penalty)';
const DEFAULT_CLASSROOM_FORMULA = 'sum(solved)';
const DEFAULT_CLASSROOM_PENALTY_FORMULA = 'sum(penalty) + stddev(penalty)';

export const BASE_SCORING_VARIABLES = [
  'sum(solved)',
  'sum(raw_score)',
  'sum(demerits)',
  'sum(penalty)',
  'avg(raw_score)',
  'max(raw_score)',
  'min(raw_score)',
  'stddev(raw_score)',
  'count(attended where attended == 1)',
  'raw_score(0)',
  'demerits(0)',
  'sum(raw_score where title contains "TFC")',
  'sum(demerits where index == 0)',
  'tfc_score',
  'tfc_component',
  'tsc_component',
];

export const SORTABLE_SCORING_KEYS = [
  'solved_score',
  'penalty_score',
  'score',
  'total_solved',
  'total_penalty',
  'total_raw_score',
  'total_score',
  'total_demerits',
  'attended_count',
  'attendance_rate',
  'included_unit_count',
  'result_unit_count',
  'avg_solved',
  'avg_penalty',
  'avg_raw_score',
  'avg_demerits',
  'best_solved',
  'worst_solved',
  'best_raw_score',
  'worst_raw_score',
  'solved_deviation',
  'penalty_deviation',
  'raw_score_deviation',
  'effective_penalty',
  'tfc_score',
  'tsc_score',
  'tfc_component',
  'tsc_component',
  'highest_tfc_score',
  'highest_tsc_score',
];

export const DEFAULT_SCORING_SORT_RULES: Array<{ key: string; direction: SortDirection }> = [
  { key: 'solved_score', direction: 'desc' },
  { key: 'penalty_score', direction: 'asc' },
  { key: 'attended_count', direction: 'desc' },
];

function normalizeText(value: unknown, maxLength = 500): string {
  return String(value ?? '').trim().slice(0, maxLength);
}

function normalizeProvider(value: unknown) {
  return String(value || 'vjudge').toLowerCase() === 'codeforces' ? 'codeforces' : 'vjudge';
}

function numeric(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampInteger(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < min) return min;
  if (parsed > max) return max;
  return parsed;
}

function uniqueStrings(values: unknown[], maxLength = 180): string[] {
  return Array.from(new Set(values.map((value) => normalizeText(value, maxLength)).filter(Boolean)));
}

function normalizeHandle(value: unknown): string {
  return normalizeText(value, 180).toLowerCase();
}

function sourceHandlesForRankRow(row: any): string[] {
  return uniqueStrings([
    ...(Array.isArray(row?.sourceHandles) ? row.sourceHandles : []),
    row?.username,
    row?.realName,
    row?.providerMeta?.party?.teamName,
  ]);
}

function rowCandidateKeys(row: any): string[] {
  return uniqueStrings(sourceHandlesForRankRow(row).map((handle) => normalizeHandle(handle)));
}

function demeritsForRankRow(row: any, contestDemerits: any[] = []) {
  const candidateKeys = new Set(rowCandidateKeys(row));
  return contestDemerits.filter((demerit) => {
    const handle = normalizeHandle(demerit?.handle ?? demerit?.vjudge_id ?? demerit?.vjudge_handle);
    return handle && candidateKeys.has(handle);
  });
}

function mergeProviders(current: string[], provider: unknown): string[] {
  return uniqueStrings([...current, normalizeProvider(provider)], 40);
}

function deriveFormulaKey(source: ContestSourceInput, index: number, used: Set<string>): string {
  const requested = normalizeText(source.formulaKey, 48).toLowerCase();
  const baseFromRequested = isValidFormulaIdentifier(requested) ? requested : '';
  const baseFromContest = `c${normalizeText(source.externalContestId || source.contestKey || source.itemId, 36).replace(/[^a-z0-9_]/gi, '_').toLowerCase()}`;
  let base = baseFromRequested || (isValidFormulaIdentifier(baseFromContest) ? baseFromContest : `${FORMULA_KEY_FALLBACK_PREFIX}_${index + 1}`);
  base = base.slice(0, 48);
  if (!isValidFormulaIdentifier(base)) base = `${FORMULA_KEY_FALLBACK_PREFIX}_${index + 1}`;

  let candidate = base;
  let suffix = 2;
  while (used.has(candidate)) {
    const suffixText = `_${suffix}`;
    candidate = `${base.slice(0, 48 - suffixText.length)}${suffixText}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
}

export function normalizeScoringConfig(
  rawConfig: ContestScoringConfigInput | null | undefined,
  fallback: ContestScoringConfigInput = {},
): Required<ContestScoringConfigInput> {
  const source = rawConfig || {};
  const solvedScoreFormula = normalizeText(
    source.solvedScoreFormula ?? source.formula ?? fallback.solvedScoreFormula ?? fallback.formula ?? DEFAULT_GLOBAL_FORMULA,
    1000,
  ) || DEFAULT_GLOBAL_FORMULA;
  const penaltyScoreFormula = normalizeText(
    source.penaltyScoreFormula ?? fallback.penaltyScoreFormula ?? DEFAULT_GLOBAL_PENALTY_FORMULA,
    1000,
  ) || DEFAULT_GLOBAL_PENALTY_FORMULA;
  const scorePrecision = clampInteger(source.scorePrecision ?? fallback.scorePrecision, 0, 4, 2);
  const dropWorstCount = clampInteger(source.dropWorstCount ?? fallback.dropWorstCount, 0, 100, 0);

  const sortRules = Array.isArray(source.sortRules) && source.sortRules.length > 0
    ? source.sortRules
    : Array.isArray(fallback.sortRules) && fallback.sortRules.length > 0
      ? fallback.sortRules
      : DEFAULT_SCORING_SORT_RULES;

  return {
    groups: Array.isArray(source.groups) ? source.groups : Array.isArray(fallback.groups) ? fallback.groups : [],
    formula: solvedScoreFormula,
    solvedScoreFormula,
    penaltyScoreFormula,
    scorePrecision,
    sortRules: sortRules.slice(0, 8).map((rule) => ({
      key: normalizeText(rule?.key, 80),
      direction: rule?.direction === 'asc' ? 'asc' : 'desc',
    })).filter((rule) => rule.key),
    excludedUnitKeys: uniqueStrings(
      Array.isArray(source.excludedUnitKeys) ? source.excludedUnitKeys : Array.isArray(fallback.excludedUnitKeys) ? fallback.excludedUnitKeys : [],
      48,
    ),
    dropWorstCount,
    version: Number(source.version ?? fallback.version ?? 0) || 0,
  };
}

export function defaultScoringConfigForScope(scope: 'global' | 'classroom', roomType?: string | null, _unitKeys: string[] = []): Required<ContestScoringConfigInput> {
  const normalizedRoomType = normalizeText(roomType, 20).toUpperCase();
  const classroomSortRules = [
    { key: 'solved_score', direction: 'desc' as SortDirection },
    { key: 'penalty_score', direction: 'asc' as SortDirection },
    { key: 'attended_count', direction: 'desc' as SortDirection },
  ].slice(0, 8);

  return normalizeScoringConfig({
    solvedScoreFormula: scope === 'classroom'
      ? DEFAULT_CLASSROOM_FORMULA
      : normalizedRoomType === 'TSC'
        ? 'tfc_component + tsc_component'
        : DEFAULT_GLOBAL_FORMULA,
    penaltyScoreFormula: scope === 'classroom'
      ? DEFAULT_CLASSROOM_PENALTY_FORMULA
      : DEFAULT_GLOBAL_PENALTY_FORMULA,
    scorePrecision: scope === 'classroom' ? 0 : 2,
    sortRules: scope === 'classroom' ? classroomSortRules : DEFAULT_SCORING_SORT_RULES,
    excludedUnitKeys: [],
    dropWorstCount: 0,
    version: 0,
  });
}

function validateGroups(groups: ContestScoringGroupInput[], sourcesByItemId: Map<string, ContestSourceInput>) {
  const seenItems = new Set<string>();
  const seenKeys = new Set<string>();
  const normalizedGroups = groups.map((group) => {
    const name = normalizeText(group.name, 160);
    const formulaKey = normalizeText(group.formulaKey, 48).toLowerCase();
    const solvedScoreFormula = normalizeText(group.solvedScoreFormula ?? group.formula, 1000) || DEFAULT_COMPOSITE_FORMULA;
    const penaltyScoreFormula = normalizeText(group.penaltyScoreFormula, 1000) || DEFAULT_COMPOSITE_PENALTY_FORMULA;
    const contestItemIds = uniqueStrings(Array.isArray(group.contestItemIds) ? group.contestItemIds : [], 80);

    if (!name) throw new Error('Composite name is required');
    if (!isValidFormulaIdentifier(formulaKey)) {
      throw new Error(`Composite key "${formulaKey}" must match ^[a-z][a-z0-9_]{0,47}$`);
    }
    parseFormula(solvedScoreFormula);
    parseFormula(penaltyScoreFormula);
    if (seenKeys.has(formulaKey)) throw new Error(`Duplicate composite key "${formulaKey}"`);
    seenKeys.add(formulaKey);
    if (contestItemIds.length < 2) throw new Error(`Composite "${name}" must include at least two contests`);

    contestItemIds.forEach((itemId) => {
      if (!sourcesByItemId.has(itemId)) throw new Error(`Contest item "${itemId}" is not in this room`);
      if (seenItems.has(itemId)) throw new Error('A contest can belong to at most one composite');
      seenItems.add(itemId);
    });

    return {
      id: normalizeText(group.id, 80) || formulaKey,
      name,
      formulaKey,
      formula: solvedScoreFormula,
      solvedScoreFormula,
      penaltyScoreFormula,
      contestItemIds,
    };
  });

  return normalizedGroups;
}

function formulaKeysForSources(sources: ContestSourceInput[], allSources: ContestSourceInput[]) {
  const used = new Set<string>();
  return sources.map((source, index) => {
    const sourceIndex = allSources.indexOf(source);
    return deriveFormulaKey(source, sourceIndex >= 0 ? sourceIndex : index, used);
  });
}

function buildResultUnitDefinitions(sources: ContestSourceInput[], config: Required<ContestScoringConfigInput>): ResultUnitDefinition[] {
  const sourcesByItemId = new Map(sources.map((source) => [String(source.itemId), source]));
  const groups = validateGroups(config.groups, sourcesByItemId);
  const groupedItemIds = new Set(groups.flatMap((group) => group.contestItemIds));
  const usedUnitKeys = new Set<string>();

  const standaloneSources = sources.filter((source) => !groupedItemIds.has(String(source.itemId)));
  const unitDefinitions: ResultUnitDefinition[] = [];

  groups.forEach((group) => {
    const groupSources = group.contestItemIds.map((itemId) => sourcesByItemId.get(itemId)).filter(Boolean) as ContestSourceInput[];
    const sourceFormulaKeys = formulaKeysForSources(groupSources, sources);
    const earliest = groupSources.reduce((best, source) => {
      const sourceOrder = Number.isFinite(Number(source.sortOrder)) ? Number(source.sortOrder) : sources.indexOf(source);
      const bestOrder = Number.isFinite(Number(best.sortOrder)) ? Number(best.sortOrder) : sources.indexOf(best);
      return sourceOrder < bestOrder ? source : best;
    }, groupSources[0]);
    if (usedUnitKeys.has(group.formulaKey)) throw new Error(`Duplicate result-unit key "${group.formulaKey}"`);
    usedUnitKeys.add(group.formulaKey);
    unitDefinitions.push({
      id: group.id || group.formulaKey,
      key: group.formulaKey,
      name: group.name,
      isComposite: true,
      formula: group.solvedScoreFormula,
      solvedScoreFormula: group.solvedScoreFormula,
      penaltyScoreFormula: group.penaltyScoreFormula,
      order: Number.isFinite(Number(earliest?.sortOrder)) ? Number(earliest.sortOrder) : sources.indexOf(earliest),
      sourceContestIds: groupSources.map((source) => source.contestKey),
      sourceItemIds: groupSources.map((source) => source.itemId),
      sourceFormulaKeys,
    });
  });

  standaloneSources.forEach((source, index) => {
    const key = deriveFormulaKey(source, index, usedUnitKeys);
    unitDefinitions.push({
      id: source.itemId,
      key,
      name: source.title,
      isComposite: false,
      formula: null,
      solvedScoreFormula: null,
      penaltyScoreFormula: null,
      order: Number.isFinite(Number(source.sortOrder)) ? Number(source.sortOrder) : sources.indexOf(source),
      sourceContestIds: [source.contestKey],
      sourceItemIds: [source.itemId],
      sourceFormulaKeys: [key],
      provider: normalizeProvider(source.provider),
      externalContestId: normalizeText(source.externalContestId || source.contestKey, 80),
    });
  });

  return unitDefinitions.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

function participantName(row: any): string {
  return normalizeText(
    row?.classroomMapping?.targetName
      || row?.realName
      || row?.username
      || row?.identityKey,
    180,
  );
}

function participantKey(row: any, provider: string): string | null {
  const identityKey = normalizeText(row?.identityKey, 220);
  if (identityKey) return identityKey;
  const username = normalizeHandle(row?.username);
  if (!username) return null;
  return provider === 'vjudge' ? username : `codeforces:${username}`;
}

function createParticipant(row: any, provider: string): ParticipantRow | null {
  const identityKey = participantKey(row, provider);
  if (!identityKey) return null;
  const username = normalizeText(row?.classroomMapping?.targetName || row?.username || identityKey, 180);
  return {
    identityKey,
    username,
    realName: participantName(row) || username,
    avatarUrl: row?.avatarUrl || null,
    contests: {},
    totalSolved: 0,
    totalPenalty: 0,
    totalScore: 0,
    totalDemeritPoints: 0,
    attended: 0,
    providers: [],
    sourceHandles: [],
    targetType: row?.targetType || null,
    studentId: row?.studentId || null,
    groupId: row?.groupId || null,
    matchedBy: row?.matchedBy || null,
    isClassroomParticipant: Boolean(row?.isClassroomParticipant),
    classroomMapping: row?.classroomMapping || null,
  };
}

function sourceMetricForParticipant(source: ContestSourceInput, participant: ParticipantRow): any {
  const provider = normalizeProvider(source.provider);
  const teams = Array.isArray(source.rankData?.teams) ? source.rankData.teams : [];
  const matched = teams.find((row) => participantKey(row, provider) === participant.identityKey);
  const sourceDemerits = matched ? demeritsForRankRow(matched, source.demerits || []) : demeritsForRankRow(participant, source.demerits || []);
  const demeritPoints = matched
    ? numeric(matched.demeritPoints, 0)
    : sourceDemerits.reduce((sum, demerit) => sum + numeric(demerit?.demerit_point ?? demerit?.points, 0), 0);
  const weight = numeric(source.weight, 1);
  const solved = matched ? numeric(matched.solvedCount ?? matched.solved, 0) : 0;
  const penalty = matched ? numeric(matched.penalty, 0) : demeritPoints * 100;
  const finalScore = matched ? numeric(matched.finalScore, 0) * weight : 0;
  const attended = matched && (
    solved > 0
    || Boolean(matched.manualSolveOverride)
    || (Array.isArray(matched.submissions) && matched.submissions.length > 0)
  ) ? 1 : 0;

  return {
    solved,
    penalty,
    finalScore,
    rawScore: finalScore,
    submissions: matched?.submissions || [],
    contestId: source.contestKey,
    contestTitle: source.title,
    provider,
    externalContestId: source.externalContestId || source.contestKey,
    weight,
    order: numeric(source.sortOrder, 0),
    nativeRank: matched?.nativeRank,
    nativePoints: matched?.nativePoints,
    sourceHandles: matched ? sourceHandlesForRankRow(matched) : participant.sourceHandles,
    fullParticipantCount: source.rankData?.fullParticipantCount ?? source.rankData?.providerMeta?.fullParticipantCount ?? source.rankData?.totalTeams,
    demeritPoints,
    demerits: sourceDemerits,
    attended,
  };
}

function sourceMetricRows(sourceMetrics: any[]): FormulaMetricRow[] {
  return sourceMetrics.map((metric, index) => ({
    index,
    key: normalizeText(metric.sourceFormulaKey, 48) || `source_${index + 1}`,
    title: normalizeText(metric.contestTitle, 180) || `Contest ${index + 1}`,
    name: normalizeText(metric.contestTitle, 180) || `Contest ${index + 1}`,
    provider: normalizeProvider(metric.provider),
    external_id: normalizeText(metric.externalContestId || metric.contestId, 80),
    contest_id: normalizeText(metric.contestId || metric.externalContestId, 80),
    weight: numeric(metric.weight, 1),
    order: numeric(metric.order, index),
    solved: numeric(metric.solved, 0),
    penalty: numeric(metric.penalty, 0),
    raw_score: numeric(metric.rawScore, 0),
    score: numeric(metric.rawScore, 0),
    final_score: numeric(metric.rawScore, 0),
    demerits: numeric(metric.demeritPoints, 0),
    attended: numeric(metric.attended, 0),
    included: 1,
    dropped: 0,
    excluded: 0,
    composite: 0,
    is_composite: 0,
  }));
}

function unitMetricRows(unitMetrics: UnitMetrics[]): FormulaMetricRow[] {
  return unitMetrics
    .filter((unit) => unit.included === 1)
    .map((unit) => ({
      index: unit.order,
      key: unit.key,
      title: unit.name,
      name: unit.name,
      provider: normalizeProvider(unit.provider),
      external_id: normalizeText(unit.externalContestId || unit.key, 80),
      contest_id: normalizeText(unit.sourceContestIds[0] || unit.key, 80),
      weight: numeric(unit.weight, 1),
      order: unit.order,
      solved: unit.solved,
      penalty: unit.penalty,
      raw_score: unit.rawScore,
      score: unit.rawScore,
      final_score: unit.finalScore,
      demerits: unit.demerits,
      attended: unit.attended,
      included: unit.included,
      dropped: unit.dropped ? 1 : 0,
      excluded: unit.excluded ? 1 : 0,
      composite: unit.isComposite ? 1 : 0,
      is_composite: unit.isComposite ? 1 : 0,
    }));
}

function buildParticipants(sources: ContestSourceInput[]): ParticipantRow[] {
  const byIdentity = new Map<string, ParticipantRow>();

  sources.forEach((source) => {
    const provider = normalizeProvider(source.provider);
    const teams = Array.isArray(source.rankData?.teams) ? source.rankData.teams : [];
    teams.forEach((row) => {
      const participant = createParticipant(row, provider);
      if (!participant) return;
      const current = byIdentity.get(participant.identityKey);
      if (!current) {
        byIdentity.set(participant.identityKey, participant);
      } else {
        current.providers = mergeProviders(current.providers, provider);
        current.sourceHandles = uniqueStrings([...current.sourceHandles, ...sourceHandlesForRankRow(row)]);
        current.avatarUrl = current.avatarUrl || participant.avatarUrl;
        current.targetType = current.targetType || participant.targetType;
        current.studentId = current.studentId || participant.studentId;
        current.groupId = current.groupId || participant.groupId;
        current.matchedBy = current.matchedBy || participant.matchedBy;
        current.isClassroomParticipant = current.isClassroomParticipant || participant.isClassroomParticipant;
        current.classroomMapping = current.classroomMapping || participant.classroomMapping;
      }

      const stored = byIdentity.get(participant.identityKey);
      if (stored) {
        stored.providers = mergeProviders(stored.providers, provider);
        stored.sourceHandles = uniqueStrings([...stored.sourceHandles, ...sourceHandlesForRankRow(row)]);
      }
    });
  });

  return Array.from(byIdentity.values());
}

function stdDeviation(values: number[]): number {
  if (!values.length) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function aggregateMetricVariables(metrics: Array<{
  solved: number;
  penalty: number;
  rawScore: number;
  demeritPoints?: number;
  demerits?: number;
  attended: number;
}>): FormulaValueMap {
  const resultCount = metrics.length;
  const totalSolved = metrics.reduce((sum, metric) => sum + numeric(metric.solved, 0), 0);
  const totalPenalty = metrics.reduce((sum, metric) => sum + numeric(metric.penalty, 0), 0);
  const totalRawScore = metrics.reduce((sum, metric) => sum + numeric(metric.rawScore, 0), 0);
  const totalDemerits = metrics.reduce((sum, metric) => sum + numeric(metric.demeritPoints ?? metric.demerits, 0), 0);
  const attendedCount = metrics.reduce((sum, metric) => sum + numeric(metric.attended, 0), 0);
  const solvedValues = metrics.map((metric) => numeric(metric.solved, 0));
  const penaltyValues = metrics.map((metric) => numeric(metric.penalty, 0));
  const rawScoreValues = metrics.map((metric) => numeric(metric.rawScore, 0));
  const demeritValues = metrics.map((metric) => numeric(metric.demeritPoints ?? metric.demerits, 0));
  const penaltyDeviation = stdDeviation(penaltyValues);
  const rawScoreDeviation = stdDeviation(rawScoreValues);

  return {
    total_solved: totalSolved,
    total_penalty: totalPenalty,
    total_raw_score: totalRawScore,
    total_score: totalRawScore,
    total_demerits: totalDemerits,
    attended_count: attendedCount,
    attendance_rate: resultCount > 0 ? attendedCount / resultCount : 0,
    included_unit_count: resultCount,
    result_unit_count: resultCount,
    avg_solved: resultCount > 0 ? totalSolved / resultCount : 0,
    avg_penalty: resultCount > 0 ? totalPenalty / resultCount : 0,
    avg_raw_score: resultCount > 0 ? totalRawScore / resultCount : 0,
    avg_demerits: resultCount > 0 ? totalDemerits / resultCount : 0,
    best_solved: solvedValues.length ? Math.max(...solvedValues) : 0,
    worst_solved: solvedValues.length ? Math.min(...solvedValues) : 0,
    best_raw_score: rawScoreValues.length ? Math.max(...rawScoreValues) : 0,
    worst_raw_score: rawScoreValues.length ? Math.min(...rawScoreValues) : 0,
    solved_deviation: stdDeviation(solvedValues),
    penalty_deviation: penaltyDeviation,
    raw_score_deviation: rawScoreDeviation,
    effective_penalty: totalPenalty + penaltyDeviation,
    score: 0,
  };
}

function buildUnitMetrics(
  participant: ParticipantRow,
  sourcesByItemId: Map<string, ContestSourceInput>,
  unitDefinitions: ResultUnitDefinition[],
  excludedUnitKeys: Set<string>,
): UnitMetrics[] {
  return unitDefinitions.map((unit) => {
    const sourceMetrics = unit.sourceItemIds
      .map((itemId) => sourcesByItemId.get(itemId))
      .filter(Boolean)
      .map((source, index) => ({
        ...sourceMetricForParticipant(source as ContestSourceInput, participant),
        sourceFormulaKey: unit.sourceFormulaKeys[index],
      }));
    const sourceBreakdown = Object.fromEntries(sourceMetrics.map((metric) => [metric.contestId, metric]));
    const solved = sourceMetrics.reduce((sum, metric) => sum + metric.solved, 0);
    const summedPenalty = sourceMetrics.reduce((sum, metric) => sum + metric.penalty, 0);
    const summedRawScore = sourceMetrics.reduce((sum, metric) => sum + metric.rawScore, 0);
    const rawScore = unit.isComposite
      ? evaluateFormula(unit.solvedScoreFormula || DEFAULT_COMPOSITE_FORMULA, {
        variables: aggregateMetricVariables(sourceMetrics),
        rows: sourceMetricRows(sourceMetrics),
      }).value
      : summedRawScore;
    const penalty = unit.isComposite
      ? evaluateFormula(unit.penaltyScoreFormula || DEFAULT_COMPOSITE_PENALTY_FORMULA, {
        variables: aggregateMetricVariables(sourceMetrics),
        rows: sourceMetricRows(sourceMetrics),
      }).value
      : summedPenalty;
    const demerits = sourceMetrics.reduce((sum, metric) => sum + metric.demeritPoints, 0);
    const attended = sourceMetrics.some((metric) => metric.attended > 0) ? 1 : 0;
    const excluded = excludedUnitKeys.has(unit.key);

    return {
      key: unit.key,
      name: unit.name,
      solved,
      penalty,
      rawScore,
      finalScore: rawScore,
      demerits,
      attended,
      included: excluded ? 0 : 1,
      dropped: false,
      excluded,
      order: unit.order,
      weight: sourceMetrics.reduce((sum, metric) => sum + numeric(metric.weight, 1), 0) || 1,
      isComposite: unit.isComposite,
      sourceContestIds: unit.sourceContestIds,
      sourceItemIds: unit.sourceItemIds,
      sourceBreakdown,
      provider: unit.provider,
      externalContestId: unit.externalContestId,
    };
  });
}

function applyDropWorst(unitMetrics: UnitMetrics[], dropWorstCount: number) {
  if (dropWorstCount <= 0) return;
  const candidates = unitMetrics
    .map((unit, order) => ({ unit, order }))
    .filter(({ unit }) => unit.included === 1);
  candidates.sort((a, b) => (
    a.unit.rawScore - b.unit.rawScore
    || b.unit.penalty - a.unit.penalty
    || a.order - b.order
  ));

  candidates.slice(0, Math.min(dropWorstCount, candidates.length)).forEach(({ unit }) => {
    unit.included = 0;
    unit.dropped = true;
  });
}

function buildVariables(
  unitMetrics: UnitMetrics[],
  config: Required<ContestScoringConfigInput>,
  legacyTsc: ContestScoringOptions['legacyTsc'],
  participant: ParticipantRow,
  tscHighest: { highestTfcScore: number; highestTscScore: number },
): FormulaValueMap {
  const included = unitMetrics.filter((unit) => unit.included === 1);
  const includedCount = included.length || 0;
  const resultCount = unitMetrics.length || 0;
  const totalSolved = included.reduce((sum, unit) => sum + unit.solved, 0);
  const totalPenalty = included.reduce((sum, unit) => sum + unit.penalty, 0);
  const totalRawScore = included.reduce((sum, unit) => sum + unit.rawScore, 0);
  const totalDemerits = included.reduce((sum, unit) => sum + unit.demerits, 0);
  const attendedCount = included.reduce((sum, unit) => sum + unit.attended, 0);
  const solvedValues = included.map((unit) => unit.solved);
  const penaltyValues = included.map((unit) => unit.penalty);
  const rawScoreValues = included.map((unit) => unit.rawScore);
  const rawScoreDeviation = stdDeviation(rawScoreValues);
  const penaltyDeviation = stdDeviation(penaltyValues);

  const normalizedKeys = uniqueStrings([
    participant.identityKey,
    participant.username,
    participant.realName,
    participant.classroomMapping?.targetName,
    participant.classroomMapping?.group?.name,
    ...(Array.isArray(participant.sourceHandles) ? participant.sourceHandles : []),
  ]).map((key) => key.toLowerCase());
  const tfcScoreByParticipant = legacyTsc?.tfcScoreByParticipant || new Map<string, number>();
  const tfcScore = normalizedKeys.reduce((score, key) => {
    if (score !== null) return score;
    return tfcScoreByParticipant.has(key) ? numeric(tfcScoreByParticipant.get(key), 0) : null;
  }, null as number | null) ?? 0;
  const tscScore = totalRawScore;
  const tfcPercentage = numeric(legacyTsc?.tfcPercentage, 0);
  const tscPercentage = numeric(legacyTsc?.tscPercentage, 100);
  const tfcComponent = tfcPercentage > 0 && tscHighest.highestTfcScore > 0
    ? (tfcScore / tscHighest.highestTfcScore) * tfcPercentage
    : 0;
  const tscComponent = tscPercentage > 0 && tscHighest.highestTscScore > 0
    ? (tscScore / tscHighest.highestTscScore) * tscPercentage
    : 0;

  const variables: FormulaValueMap = {
    total_solved: totalSolved,
    total_penalty: totalPenalty,
    total_raw_score: totalRawScore,
    total_score: totalRawScore,
    total_demerits: totalDemerits,
    attended_count: attendedCount,
    attendance_rate: resultCount > 0 ? attendedCount / resultCount : 0,
    included_unit_count: includedCount,
    result_unit_count: resultCount,
    avg_solved: includedCount > 0 ? totalSolved / includedCount : 0,
    avg_penalty: includedCount > 0 ? totalPenalty / includedCount : 0,
    avg_raw_score: includedCount > 0 ? totalRawScore / includedCount : 0,
    avg_demerits: includedCount > 0 ? totalDemerits / includedCount : 0,
    best_solved: solvedValues.length ? Math.max(...solvedValues) : 0,
    worst_solved: solvedValues.length ? Math.min(...solvedValues) : 0,
    best_raw_score: rawScoreValues.length ? Math.max(...rawScoreValues) : 0,
    worst_raw_score: rawScoreValues.length ? Math.min(...rawScoreValues) : 0,
    solved_deviation: stdDeviation(solvedValues),
    penalty_deviation: penaltyDeviation,
    raw_score_deviation: rawScoreDeviation,
    effective_penalty: totalPenalty + penaltyDeviation,
    score: 0,
    tfc_score: tfcScore,
    tsc_score: tscScore,
    tfc_component: tfcComponent,
    tsc_component: tscComponent,
    highest_tfc_score: tscHighest.highestTfcScore,
    highest_tsc_score: tscHighest.highestTscScore,
  };

  const solvedScoreResult = evaluateFormula(config.solvedScoreFormula, {
    variables,
    rows: unitMetricRows(unitMetrics),
  });
  variables.solved_score = solvedScoreResult.value;
  variables.score = solvedScoreResult.value;
  const penaltyScoreResult = evaluateFormula(config.penaltyScoreFormula, {
    variables,
    rows: unitMetricRows(unitMetrics),
  });
  variables.penalty_score = penaltyScoreResult.value;
  variables.effective_penalty = penaltyScoreResult.value;
  return variables;
}

function sortValue(row: any, key: string): number | string {
  if (key === 'name' || key === 'username') return normalizeText(row.username, 180).toLowerCase();
  if (key === 'rank') return numeric(row.rank, 0);
  const value = row.scoringVariables?.[key] ?? row[key];
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function compareRows(sortRules: Array<{ key: string; direction: SortDirection }>, a: any, b: any): number {
  for (const rule of sortRules) {
    const aValue = sortValue(a, rule.key);
    const bValue = sortValue(b, rule.key);
    let comparison = 0;
    if (typeof aValue === 'string' || typeof bValue === 'string') {
      comparison = String(aValue).localeCompare(String(bValue));
    } else {
      comparison = aValue - bValue;
    }
    if (comparison !== 0) return rule.direction === 'asc' ? comparison : -comparison;
  }
  return normalizeText(a.username, 180).localeCompare(normalizeText(b.username, 180));
}

function equalAcrossSortRules(sortRules: Array<{ key: string; direction: SortDirection }>, a: any, b: any): boolean {
  return sortRules.every((rule) => sortValue(a, rule.key) === sortValue(b, rule.key));
}

function scorePrecisionNumber(value: number, precision: number): number {
  return Number(value.toFixed(precision));
}

function tscHighestForParticipants(
  participants: ParticipantRow[],
  unitMetricsByParticipant: Map<string, UnitMetrics[]>,
  legacyTsc: ContestScoringOptions['legacyTsc'],
) {
  const tfcScores = legacyTsc?.tfcScoreByParticipant || new Map<string, number>();
  const highestTfcScore = Math.max(...Array.from(tfcScores.values()).map((value) => numeric(value, 0)), 0);
  const highestTscScore = Math.max(
    ...participants.map((participant) => {
      const metrics = unitMetricsByParticipant.get(participant.identityKey) || [];
      return metrics.filter((unit) => unit.included === 1).reduce((sum, unit) => sum + unit.rawScore, 0);
    }),
    0,
  );
  return { highestTfcScore, highestTscScore };
}

export function buildScoredContestReport(options: ContestScoringOptions) {
  const sourceInputs = Array.isArray(options.sources) ? options.sources : [];
  if (sourceInputs.length === 0) {
    throw new Error('At least one contest source is required');
  }

  const temporaryKeySet = new Set<string>();
  const temporaryKeys = sourceInputs.map((source, index) => deriveFormulaKey(source, index, temporaryKeySet));
  const fallback = options.defaultConfig || defaultScoringConfigForScope(options.scope, options.roomType, temporaryKeys);
  const config = normalizeScoringConfig(options.config, fallback);

  const sourcesByItemId = new Map(sourceInputs.map((source) => [String(source.itemId), source]));
  const unitDefinitions = buildResultUnitDefinitions(sourceInputs, config);
  const unitDefinitionByKey = new Map(unitDefinitions.map((unit) => [unit.key, unit]));
  const unitKeySet = new Set(unitDefinitions.map((unit) => unit.key));
  const availableSortKeys = new Set(SORTABLE_SCORING_KEYS);

  config.excludedUnitKeys.forEach((key) => {
    if (!unitKeySet.has(key)) throw new Error(`Cannot exclude unknown result unit "${key}"`);
  });
  parseFormula(config.solvedScoreFormula);
  parseFormula(config.penaltyScoreFormula);
  config.sortRules.forEach((rule) => {
    if (!availableSortKeys.has(rule.key) && !['name', 'username', 'rank'].includes(rule.key)) {
      throw new Error(`Cannot sort by unknown variable "${rule.key}"`);
    }
  });

  const participants = buildParticipants(sourceInputs);
  const excluded = new Set(config.excludedUnitKeys);
  const unitMetricsByParticipant = new Map<string, UnitMetrics[]>();
  participants.forEach((participant) => {
    const metrics = buildUnitMetrics(participant, sourcesByItemId, unitDefinitions, excluded);
    applyDropWorst(metrics, config.dropWorstCount);
    unitMetricsByParticipant.set(participant.identityKey, metrics);
  });
  const tscHighest = tscHighestForParticipants(participants, unitMetricsByParticipant, options.legacyTsc || null);

  const users = participants.map((participant) => {
    const unitMetrics = unitMetricsByParticipant.get(participant.identityKey) || [];
    const variables = buildVariables(unitMetrics, config, options.legacyTsc || null, participant, tscHighest);
    const solvedScore = variables.solved_score;
    const penaltyScore = variables.penalty_score;
    const contests = Object.fromEntries(unitMetrics.map((unit) => [unit.key, {
      ...(unitDefinitionByKey.get(unit.key)?.solvedScoreFormula ? {
        formula: unitDefinitionByKey.get(unit.key)?.solvedScoreFormula,
        solvedScoreFormula: unitDefinitionByKey.get(unit.key)?.solvedScoreFormula,
        penaltyScoreFormula: unitDefinitionByKey.get(unit.key)?.penaltyScoreFormula,
      } : {}),
      solved: unit.solved,
      penalty: unit.penalty,
      finalScore: unit.rawScore,
      rawScore: unit.rawScore,
      contestId: unit.key,
      contestTitle: unitDefinitions.find((definition) => definition.key === unit.key)?.name || unit.key,
      demeritPoints: unit.demerits,
      demerits: Object.values(unit.sourceBreakdown).flatMap((source: any) => Array.isArray(source?.demerits) ? source.demerits : []),
      attended: unit.attended,
      included: Boolean(unit.included),
      dropped: unit.dropped,
      excluded: unit.excluded,
      sourceContestIds: unit.sourceContestIds,
      sourceItemIds: unit.sourceItemIds,
      sourceFormulaKeys: unitDefinitionByKey.get(unit.key)?.sourceFormulaKeys || [],
      sourceBreakdown: unit.sourceBreakdown,
      isComposite: unit.sourceContestIds.length > 1,
    }]));

    return {
      ...participant,
      contests,
      totalSolved: variables.total_solved,
      totalPenalty: variables.total_penalty,
      totalScore: variables.total_raw_score,
      attended: variables.attended_count,
      totalContestsAttended: variables.attended_count,
      totalDemeritPoints: variables.total_demerits,
      stdDeviationScore: variables.raw_score_deviation,
      stdDeviationPen: variables.penalty_deviation,
      effectivePenalty: penaltyScore,
      effectiveSolved: solvedScore,
      effectiveTotalScore: solvedScore,
      effectiveTotalSolved: solvedScore,
      effectiveTotalPenalty: penaltyScore,
      solvedScore,
      penaltyScore,
      score: solvedScore,
      displaySolvedScore: scorePrecisionNumber(solvedScore, config.scorePrecision),
      displayPenaltyScore: scorePrecisionNumber(penaltyScore, config.scorePrecision),
      displayScore: scorePrecisionNumber(solvedScore, config.scorePrecision),
      scoringVariables: variables,
      scoreTrace: {
        sourceContests: unitMetrics.flatMap((unit) => unit.sourceContestIds),
        resultUnits: unitMetrics.map((unit) => ({
          key: unit.key,
          formula: unitDefinitionByKey.get(unit.key)?.solvedScoreFormula || null,
          solvedScoreFormula: unitDefinitionByKey.get(unit.key)?.solvedScoreFormula || null,
          penaltyScoreFormula: unitDefinitionByKey.get(unit.key)?.penaltyScoreFormula || null,
          solved: unit.solved,
          penalty: unit.penalty,
          rawScore: unit.rawScore,
          demerits: unit.demerits,
          attended: unit.attended,
          included: unit.included,
          dropped: unit.dropped,
          excluded: unit.excluded,
          sourceBreakdown: unit.sourceBreakdown,
        })),
        variables,
        formula: config.solvedScoreFormula,
        solvedScoreFormula: config.solvedScoreFormula,
        penaltyScoreFormula: config.penaltyScoreFormula,
        solvedScore,
        penaltyScore,
        score: solvedScore,
      },
    };
  });

  users.sort((a, b) => compareRows(config.sortRules, a, b));
  users.forEach((user, index) => {
    const previous = index > 0 ? users[index - 1] : null;
    user.rank = previous && equalAcrossSortRules(config.sortRules, user, previous)
      ? previous.rank
      : index + 1;
  });

  const contestIds = unitDefinitions.map((unit) => unit.key);
  const contestIdToTitle = Object.fromEntries(unitDefinitions.map((unit) => [unit.key, unit.name]));
  const contestMetaById = Object.fromEntries(unitDefinitions.map((unit) => [unit.key, {
    id: unit.key,
    formulaKey: unit.key,
    title: unit.name,
    provider: unit.provider,
    externalContestId: unit.externalContestId,
    isComposite: unit.isComposite,
    formula: unit.formula,
    sourceContestIds: unit.sourceContestIds,
    sourceItemIds: unit.sourceItemIds,
    sourceFormulaKeys: unit.sourceFormulaKeys,
  }]));

  return {
    snapshotVersion: 3,
    users,
    contestIds,
    contestIdToTitle,
    contestMetaById,
    name: options.roomName || 'Contest report',
    roomType: options.roomType || null,
    scope: options.scope,
    classroomId: options.classroomId || null,
    roomId: options.roomId,
    classroomContestRoomId: options.scope === 'classroom' ? options.roomId : null,
    generatedAt: options.generatedAt || new Date().toISOString(),
    missingContests: options.missingContests || [],
    snapshotIds: options.snapshotIds || [],
    rankingMode: 'score',
    scorePrecision: config.scorePrecision,
    scoring: {
      version: config.version,
      formula: config.solvedScoreFormula,
      solvedScoreFormula: config.solvedScoreFormula,
      penaltyScoreFormula: config.penaltyScoreFormula,
      scorePrecision: config.scorePrecision,
      sortRules: config.sortRules,
      excludedUnitKeys: config.excludedUnitKeys,
      dropWorstCount: config.dropWorstCount,
      functions: APPROVED_FORMULA_FUNCTIONS,
      variables: BASE_SCORING_VARIABLES,
      sortKeys: SORTABLE_SCORING_KEYS,
      metrics: FORMULA_METRIC_NAMES,
      filterFields: FORMULA_FILTER_FIELDS,
      resultUnits: unitDefinitions,
      legacyTsc: options.legacyTsc
        ? {
          tfcPercentage: numeric(options.legacyTsc.tfcPercentage, 0),
          tscPercentage: numeric(options.legacyTsc.tscPercentage, 100),
          highestTfcScore: tscHighest.highestTfcScore,
          highestTscScore: tscHighest.highestTscScore,
        }
        : null,
    },
  };
}
