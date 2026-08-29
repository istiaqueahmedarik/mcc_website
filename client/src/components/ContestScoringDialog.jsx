"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Calculator,
  Info,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ContestFormulaExplainer from "@/components/ContestFormulaExplainer";
import { apiGet, apiPost, apiRequest } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const DEFAULT_CONFIG = {
  groups: [],
  formula: "sum(solved)",
  solvedScoreFormula: "sum(solved)",
  penaltyScoreFormula: "sum(penalty) + stddev(penalty)",
  scorePrecision: 0,
  sortRules: [
    { key: "solved_score", direction: "desc" },
    { key: "penalty_score", direction: "asc" },
  ],
  excludedUnitKeys: [],
  dropWorstCount: 0,
};

const DEFAULT_COMPOSITE_FORMULA = "sum(raw_score)";
const DEFAULT_COMPOSITE_PENALTY_FORMULA = "sum(penalty)";
const DEFAULT_FORMULA_SNIPPETS = [
  "sum(solved)",
  "sum(raw_score)",
  "sum(demerits)",
  "sum(penalty)",
  "avg(raw_score)",
  "max(raw_score)",
  "min(raw_score)",
  "stddev(raw_score)",
  "count(attended where attended == 1)",
  "raw_score(0)",
  "demerits(0)",
  "sum(raw_score where title contains \"TFC\")",
  "sum(demerits where index == 0)",
  "tfc_component",
  "tsc_component",
];
const DEFAULT_METRICS = ["solved", "penalty", "raw_score", "score", "final_score", "demerits", "attended", "weight"];
const DEFAULT_FILTER_FIELDS = ["index", "title", "provider", "key", "external_id", "weight", "solved", "raw_score", "demerits", "attended"];
const DEFAULT_FUNCTIONS = ["sum", "avg", "count", "min", "max", "stddev", "abs", "sqrt", "pow", "floor", "ceil", "round", "clamp"];
const DEFAULT_SORT_KEYS = [
  "solved_score",
  "penalty_score",
  "score",
  "total_solved",
  "total_penalty",
  "total_raw_score",
  "total_demerits",
  "attended_count",
  "avg_raw_score",
  "raw_score_deviation",
  "effective_penalty",
  "tfc_component",
  "tsc_component",
];

const METRIC_HELP = {
  solved: "Solved count from each included contest or composite result unit.",
  penalty: "Penalty value from each included contest or composite result unit.",
  raw_score: "Score before the final room formula. For composites, this is the composite formula output.",
  score: "Calculated contest score when the source provides a separate score field.",
  final_score: "Final score reported by the contest source when it exists.",
  demerits: "Demerits from each contest row. Use sum(demerits) for all rows or demerits(0) for the first row.",
  attended: "1 when the participant has a result row for that contest, otherwise 0.",
  included: "1 when this row is included after exclusions and grouping.",
  dropped: "1 when this row was removed by the drop-worst setting.",
  excluded: "1 when this row is excluded from the final formula.",
  weight: "The configured weight for the contest or composite result unit.",
};

const FILTER_FIELD_HELP = {
  index: "Zero-based row order inside the current formula context. index == 0 means the first contest or result unit.",
  key: "Stable formula key for a contest or composite result unit.",
  title: "Contest title or composite name. Use contains for partial title matching.",
  name: "Contest title/name alias. Useful when imported data uses name instead of title.",
  provider: "Contest provider/source, such as Codeforces, VJudge, or an internal source.",
  external_id: "External contest identifier from the source platform.",
  contest_id: "Internal or provider contest identifier when available.",
  weight: "Contest/composite weight. Numeric comparisons such as weight > 1 are supported.",
  order: "Original order of the contest/result unit in the room.",
  solved: "Solved count for the row being filtered.",
  penalty: "Penalty for the row being filtered.",
  raw_score: "Raw score for the row being filtered.",
  score: "Calculated score for the row being filtered.",
  final_score: "Final source score for the row being filtered.",
  demerits: "Demerits for the row being filtered.",
  attended: "1 for rows where the participant attended or has a result.",
  included: "1 for rows still included in the final formula.",
  dropped: "1 for rows removed by the drop-worst setting.",
  excluded: "1 for rows excluded by room configuration.",
  composite: "1 when the row represents a composite result unit.",
  is_composite: "1 when the row represents a composite result unit.",
};

const FUNCTION_HELP = {
  sum: "Adds all matching row values for a metric, for example sum(raw_score).",
  avg: "Averages all matching row values for a metric.",
  count: "Counts matching rows. Commonly used with attended or included filters.",
  min: "Smallest matching row value for a metric.",
  max: "Largest matching row value for a metric.",
  stddev: "Standard deviation of matching row values. Useful as a consistency modifier.",
  stdev: "Alias for stddev.",
  abs: "Absolute value of one expression.",
  sqrt: "Square root of one expression.",
  pow: "Raises one expression to a power.",
  floor: "Rounds an expression down.",
  ceil: "Rounds an expression up.",
  round: "Rounds an expression to the nearest whole number.",
  clamp: "Limits a value between a minimum and maximum.",
};

const SORT_KEY_HELP = {
  solved_score: "Final solved score produced by the solved-score formula. Rank this descending.",
  penalty_score: "Final penalty score produced by the penalty formula. Use ascending after solved score to break ties.",
  name: "Participant display name. Usually used only as a final tie-breaker.",
  score: "Final score produced by the formula.",
  total_solved: "Total solved count across included final result units.",
  total_penalty: "Total penalty across included final result units.",
  total_raw_score: "Total raw score across included final result units.",
  total_demerits: "Total demerits across included final result units.",
  attended_count: "Number of final result units where the participant has a result.",
  avg_raw_score: "Average raw score across included final result units.",
  raw_score_deviation: "Standard deviation of raw_score across included final result units.",
  effective_penalty: "Penalty value after exclusions, composites, and dropped units are applied.",
  tfc_component: "Legacy saved component key. Prefer explicit formulas for new rooms.",
  tsc_component: "Legacy saved component key. Prefer explicit formulas for new rooms.",
};

const SNIPPET_HELP = {
  "sum(solved)": "Total solved count across all rows in the formula context.",
  "sum(raw_score)": "Adds every raw_score value in the formula context.",
  "sum(demerits)": "Adds every demerits value in the formula context.",
  "sum(penalty)": "Adds every penalty value in the formula context.",
  "avg(raw_score)": "Average raw_score across all rows in the formula context.",
  "max(raw_score)": "Largest raw_score value from the current rows.",
  "min(raw_score)": "Smallest raw_score value from the current rows.",
  "stddev(raw_score)": "How spread out the raw_score values are across rows.",
  "count(attended where attended == 1)": "Counts rows where the participant attended.",
  "raw_score(0)": "raw_score from the first contest or result unit only.",
  "demerits(0)": "demerits from the first contest or result unit only.",
  "sum(raw_score where title contains \"TFC\")": "Adds raw_score only for rows with TFC in the title.",
  "sum(demerits where index == 0)": "Adds demerits only for the first row. This is equivalent to demerits(0).",
  tfc_component: "Legacy saved component key for older TFC formulas.",
  tsc_component: "Legacy saved component key for older TSC formulas.",
};

function uniqueOrdered(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function appendFormulaSnippet(current, snippet) {
  const text = String(current || "");
  const separator = text.trim() && !/\s$|[(+\-*/%]$/.test(text) ? " " : "";
  return `${text}${separator}${snippet}`;
}

function functionSnippet(fn) {
  if (["sum", "avg", "min", "max", "stddev", "stdev"].includes(fn)) return `${fn}(raw_score)`;
  if (fn === "count") return "count(attended where attended == 1)";
  if (fn === "abs") return "abs(raw_score(0))";
  if (fn === "sqrt") return "sqrt(raw_score(0))";
  if (fn === "pow") return "pow(raw_score(0), 2)";
  if (fn === "floor") return "floor(sum(raw_score))";
  if (fn === "ceil") return "ceil(sum(raw_score))";
  if (fn === "round") return "round(sum(raw_score))";
  if (fn === "clamp") return "clamp(sum(raw_score), 0, 100)";
  return `${fn}(raw_score)`;
}

function filterSnippet(field) {
  if (field === "index" || field === "order") return `sum(raw_score where ${field} == 0)`;
  if (["title", "name", "key", "provider", "external_id", "contest_id"].includes(field)) {
    return `sum(raw_score where ${field} contains "TFC")`;
  }
  if (["attended", "included", "dropped", "excluded", "composite", "is_composite"].includes(field)) {
    return `sum(raw_score where ${field} == 1)`;
  }
  return `sum(raw_score where ${field} > 0)`;
}

function describeFormulaSnippet(snippet) {
  const text = String(snippet || "");
  if (SNIPPET_HELP[text]) return SNIPPET_HELP[text];

  const indexedMetric = text.match(/^([a-z_]+)\((\d+)\)$/i);
  if (indexedMetric) {
    return `${indexedMetric[1]} from row index ${indexedMetric[2]}. Index 0 is the first contest or result unit.`;
  }

  const aggregateMetric = text.match(/^([a-z_]+)\(([a-z_]+)(?:\s+where\s+(.+))?\)$/i);
  if (aggregateMetric) {
    const [, fn, metric, condition] = aggregateMetric;
    const base = FUNCTION_HELP[fn] || `Runs ${fn} over matching rows.`;
    return condition
      ? `${base} Filters ${metric} rows where ${condition}.`
      : `${base} Uses the ${metric} metric.`;
  }

  if (text.includes("_component")) return "Saved component key from older scoring rules.";
  return "Custom formula snippet returned by the scoring API.";
}

function describeMetricInsert(metric) {
  return `Insert sum(${metric}). ${METRIC_HELP[metric] || `Uses the ${metric} metric across all rows.`}`;
}

function describeFilterInsert(field) {
  const help = FILTER_FIELD_HELP[field] || `Filters rows by ${field} inside an aggregate.`;
  return `${help} Inserts a starter filtered sum.`;
}

function describeFunctionInsert(fn) {
  return FUNCTION_HELP[fn] || `Insert a starter ${fn} expression.`;
}

function describeSortKey(key) {
  return SORT_KEY_HELP[key] || `Sort by ${key} from the scoring trace.`;
}

function HelpMarker({ label, text }) {
  if (!text) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Info className="h-3.5 w-3.5" />
          <span className="sr-only">{label || "Help"}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-72 text-xs leading-relaxed">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

function FieldLabel({ htmlFor, children, help, className, labelClassName }) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Label htmlFor={htmlFor} className={labelClassName}>{children}</Label>
      <HelpMarker label={`${children} help`} text={help} />
    </div>
  );
}

function InsertDropdown({ label, help, placeholder, items, onInsert, className }) {
  const [selectKey, setSelectKey] = useState(0);
  const usableItems = (items || []).filter((item) => item?.value);

  if (usableItems.length === 0) return null;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-1.5">
        <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
        <HelpMarker label={`${label} help`} text={help} />
      </div>
      <Select
        key={selectKey}
        onValueChange={(value) => {
          onInsert(value);
          setSelectKey((current) => current + 1);
        }}
      >
        <SelectTrigger className="h-9">
          <SelectValue placeholder={placeholder || "Insert"} />
        </SelectTrigger>
        <SelectContent className="max-h-80">
          {usableItems.map((item) => (
            <SelectItem
              key={`${item.value}-${item.label}`}
              value={item.value}
              title={item.description}
              className="py-2"
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate font-mono text-xs">{item.label}</span>
                {item.description && (
                  <span className="max-w-72 truncate text-[11px] text-muted-foreground">
                    {item.description}
                  </span>
                )}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ReferenceBadges({ title, items, className }) {
  if (!items?.length) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs font-medium uppercase text-muted-foreground">{title}</p>
      <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
        {items.map((item) => (
          <Tooltip key={`${title}-${item.value}-${item.label}`}>
            <TooltipTrigger asChild>
              <span
                tabIndex={0}
                className="max-w-full rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Badge variant="outline" className="max-w-full font-mono">
                  <span className="truncate">{item.label}</span>
                </Badge>
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-72 text-xs leading-relaxed">
              {item.description}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}

function contestItemId(contest) {
  return String(contest?.id || contest?.contestRoomContestId || "");
}

function contestTitle(contest) {
  return String(contest?.title || contest?.contest_name || contest?.name || contest?.externalContestId || contest?.contest_id || "Contest");
}

function contestFormulaKey(contest) {
  return String(contest?.formulaKey || contest?.formula_key || "");
}

function contestExternalId(contest) {
  return String(contest?.externalContestId || contest?.external_contest_id || contest?.contest_id || "");
}

function formatNumber(value, precision = 2) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(precision) : "0.00";
}

function uniqueFormulaKey(base, usedKeys) {
  const normalized = String(base || "group")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^[^a-z]+/, "g")
    .slice(0, 48) || "group";
  let candidate = normalized;
  for (let index = 2; usedKeys.has(candidate) && index < 1000; index += 1) {
    const suffix = `_${index}`;
    candidate = `${normalized.slice(0, 48 - suffix.length)}${suffix}`;
  }
  return candidate;
}

export default function ContestScoringDialog({
  apiBasePath,
  contests = [],
  roomName = "",
  trigger = null,
  open,
  onOpenChange,
  onSaved,
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = typeof open === "boolean";
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = (next) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [expectedVersion, setExpectedVersion] = useState(0);
  const [variables, setVariables] = useState([]);
  const [sortKeys, setSortKeys] = useState(DEFAULT_SORT_KEYS);
  const [metrics, setMetrics] = useState(DEFAULT_METRICS);
  const [filterFields, setFilterFields] = useState(DEFAULT_FILTER_FIELDS);
  const [functions, setFunctions] = useState(DEFAULT_FUNCTIONS);
  const [resultUnits, setResultUnits] = useState([]);
  const [preview, setPreview] = useState(null);
  const [beforePreview, setBeforePreview] = useState(null);
  const [selectedTraceKey, setSelectedTraceKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState("");
  const [draftGroupName, setDraftGroupName] = useState("");
  const [draftGroupKey, setDraftGroupKey] = useState("");
  const [draftGroupFormula, setDraftGroupFormula] = useState(DEFAULT_COMPOSITE_FORMULA);
  const [draftGroupPenaltyFormula, setDraftGroupPenaltyFormula] = useState(DEFAULT_COMPOSITE_PENALTY_FORMULA);
  const [draftContestIds, setDraftContestIds] = useState([]);

  const endpoint = String(apiBasePath || "").replace(/^\/+|\/+$/g, "");
  const existingGroupContestIds = useMemo(
    () => new Set((config.groups || []).flatMap((group) => group.contestItemIds || [])),
    [config.groups],
  );
  const usedUnitKeys = useMemo(
    () => new Set([
      ...(config.groups || []).map((group) => group.formulaKey),
      ...contests.map(contestFormulaKey).filter(Boolean),
    ]),
    [config.groups, contests],
  );
  const displayResultUnits = useMemo(() => {
    const groupedIds = new Set((config.groups || []).flatMap((group) => group.contestItemIds || []));
    const groupUnits = (config.groups || []).map((group, index) => {
      const memberIndexes = (group.contestItemIds || [])
        .map((id) => contests.findIndex((contest) => contestItemId(contest) === String(id)))
        .filter((memberIndex) => memberIndex >= 0);
      return {
        id: group.formulaKey,
        key: group.formulaKey,
        name: group.name,
        isComposite: true,
        formula: group.solvedScoreFormula || group.formula || DEFAULT_COMPOSITE_FORMULA,
        solvedScoreFormula: group.solvedScoreFormula || group.formula || DEFAULT_COMPOSITE_FORMULA,
        penaltyScoreFormula: group.penaltyScoreFormula || DEFAULT_COMPOSITE_PENALTY_FORMULA,
        order: memberIndexes.length > 0 ? Math.min(...memberIndexes) : contests.length + index,
      };
    });
    const standaloneUnits = contests
      .filter((contest) => !groupedIds.has(contestItemId(contest)))
      .map((contest, index) => ({
        id: contestItemId(contest),
        key: contestFormulaKey(contest) || uniqueFormulaKey(contestExternalId(contest), new Set()),
        name: contestTitle(contest),
        isComposite: false,
        order: index,
      }));
    const derived = [...groupUnits, ...standaloneUnits].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
    return derived.length > 0 ? derived : resultUnits;
  }, [config.groups, contests, resultUnits]);
  const displayFormulaSnippets = useMemo(() => (
    uniqueOrdered([...(variables || []), ...DEFAULT_FORMULA_SNIPPETS])
  ), [variables]);
  const displayCompositeSnippets = useMemo(() => (
    displayFormulaSnippets.filter((snippet) => !snippet.includes("tfc_") && !snippet.includes("tsc_"))
  ), [displayFormulaSnippets]);
  const displaySortKeys = useMemo(() => (
    uniqueOrdered([...(sortKeys || []), ...DEFAULT_SORT_KEYS])
  ), [sortKeys]);
  const formulaSnippetItems = useMemo(() => (
    displayFormulaSnippets.map((snippet) => ({
      value: snippet,
      label: snippet,
      description: describeFormulaSnippet(snippet),
    }))
  ), [displayFormulaSnippets]);
  const compositeSnippetItems = useMemo(() => (
    displayCompositeSnippets.map((snippet) => ({
      value: snippet,
      label: snippet,
      description: describeFormulaSnippet(snippet),
    }))
  ), [displayCompositeSnippets]);
  const metricItems = useMemo(() => (
    uniqueOrdered(metrics || DEFAULT_METRICS).map((metric) => ({
      value: `sum(${metric})`,
      label: metric,
      description: describeMetricInsert(metric),
    }))
  ), [metrics]);
  const functionItems = useMemo(() => (
    uniqueOrdered(functions || DEFAULT_FUNCTIONS).map((fn) => ({
      value: functionSnippet(fn),
      label: fn,
      description: describeFunctionInsert(fn),
    }))
  ), [functions]);
  const filterFieldItems = useMemo(() => (
    uniqueOrdered(filterFields || DEFAULT_FILTER_FIELDS).map((field) => ({
      value: filterSnippet(field),
      label: field,
      description: describeFilterInsert(field),
    }))
  ), [filterFields]);
  const sortKeyItems = useMemo(() => (
    uniqueOrdered([...displaySortKeys, "name"]).map((key) => ({
      value: key,
      label: key,
      description: describeSortKey(key),
    }))
  ), [displaySortKeys]);
  const selectedTrace = useMemo(() => {
    const rows = Array.isArray(preview?.users) ? preview.users : [];
    return rows.find((row) => String(row.identityKey || row.username) === selectedTraceKey) || rows[0] || null;
  }, [preview, selectedTraceKey]);

  const loadConfig = async () => {
    if (!endpoint) return;
    setLoading(true);
    setError("");
    try {
      const data = await apiGet(`${endpoint}/scoring`);
      const loadedConfig = data.config || {};
      setConfig({
        ...DEFAULT_CONFIG,
        ...loadedConfig,
        solvedScoreFormula: loadedConfig.solvedScoreFormula || loadedConfig.formula || DEFAULT_CONFIG.solvedScoreFormula,
        penaltyScoreFormula: loadedConfig.penaltyScoreFormula || DEFAULT_CONFIG.penaltyScoreFormula,
      });
      setExpectedVersion(Number(data.expectedVersion || 0));
      setVariables(Array.isArray(data.variables) ? data.variables : []);
      setSortKeys(Array.isArray(data.sortKeys) ? data.sortKeys : DEFAULT_SORT_KEYS);
      setMetrics(Array.isArray(data.metrics) ? data.metrics : DEFAULT_METRICS);
      setFilterFields(Array.isArray(data.filterFields) ? data.filterFields : DEFAULT_FILTER_FIELDS);
      setFunctions(Array.isArray(data.functions) && data.functions.length > 0 ? data.functions : DEFAULT_FUNCTIONS);
      setResultUnits(Array.isArray(data.resultUnits) ? data.resultUnits : []);
      setPreview(null);
      setBeforePreview(null);
      setSelectedTraceKey("");
    } catch (err) {
      setError(err?.message || "Failed to load scoring config");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, endpoint]);

  const addDraftGroup = () => {
    if (draftContestIds.length < 2) {
      setError("Select at least two contests for a composite");
      return;
    }
    const used = new Set(usedUnitKeys);
    const formulaKey = uniqueFormulaKey(draftGroupKey || draftGroupName || "group", used);
    setConfig((current) => ({
      ...current,
      groups: [
        ...(current.groups || []),
        {
          name: draftGroupName.trim() || "Composite",
          formulaKey,
          formula: draftGroupFormula.trim() || DEFAULT_COMPOSITE_FORMULA,
          solvedScoreFormula: draftGroupFormula.trim() || DEFAULT_COMPOSITE_FORMULA,
          penaltyScoreFormula: draftGroupPenaltyFormula.trim() || DEFAULT_COMPOSITE_PENALTY_FORMULA,
          contestItemIds: draftContestIds,
        },
      ],
    }));
    setDraftGroupName("");
    setDraftGroupKey("");
    setDraftGroupFormula(DEFAULT_COMPOSITE_FORMULA);
    setDraftGroupPenaltyFormula(DEFAULT_COMPOSITE_PENALTY_FORMULA);
    setDraftContestIds([]);
    setError("");
  };

  const removeGroup = (formulaKey) => {
    setConfig((current) => ({
      ...current,
      groups: (current.groups || []).filter((group) => group.formulaKey !== formulaKey),
    }));
  };

  const setGroupFormula = (formulaKey, field, formula) => {
    setConfig((current) => ({
      ...current,
      groups: (current.groups || []).map((group) => (
        group.formulaKey === formulaKey
          ? {
            ...group,
            [field]: formula,
            ...(field === "solvedScoreFormula" ? { formula } : {}),
          }
          : group
      )),
    }));
  };

  const toggleDraftContest = (contestId) => {
    setDraftContestIds((current) => (
      current.includes(contestId)
        ? current.filter((id) => id !== contestId)
        : [...current, contestId]
    ));
  };

  const toggleExcludedUnit = (unitKey) => {
    setConfig((current) => {
      const excluded = new Set(current.excludedUnitKeys || []);
      if (excluded.has(unitKey)) excluded.delete(unitKey);
      else excluded.add(unitKey);
      return { ...current, excludedUnitKeys: Array.from(excluded) };
    });
  };

  const setSortRule = (index, patch) => {
    setConfig((current) => ({
      ...current,
      sortRules: (current.sortRules || []).map((rule, ruleIndex) => (
        ruleIndex === index ? { ...rule, ...patch } : rule
      )),
    }));
  };

  const moveSortRule = (index, direction) => {
    setConfig((current) => {
      const sortRules = [...(current.sortRules || [])];
      const target = index + direction;
      if (target < 0 || target >= sortRules.length) return current;
      const [item] = sortRules.splice(index, 1);
      sortRules.splice(target, 0, item);
      return { ...current, sortRules };
    });
  };

  const removeSortRule = (index) => {
    setConfig((current) => ({
      ...current,
      sortRules: (current.sortRules || []).filter((_, ruleIndex) => ruleIndex !== index),
    }));
  };

  const addSortRule = () => {
    setConfig((current) => ({
      ...current,
      sortRules: [...(current.sortRules || []), { key: "solved_score", direction: "desc" }].slice(0, 8),
    }));
  };

  const previewConfig = async () => {
    setPreviewing(true);
    setError("");
    try {
      const data = await apiPost(`${endpoint}/scoring/preview`, { config });
      setPreview(data.preview || null);
      setBeforePreview(data.before || null);
      const first = data.preview?.users?.[0];
      setSelectedTraceKey(first ? String(first.identityKey || first.username) : "");
    } catch (err) {
      setError(err?.message || "Failed to preview scoring config");
    } finally {
      setPreviewing(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    setError("");
    try {
      const data = await apiRequest(`${endpoint}/scoring`, {
        method: "PUT",
        body: { expectedVersion, config },
      });
      const savedConfig = data.config || config;
      setConfig({
        ...DEFAULT_CONFIG,
        ...savedConfig,
        solvedScoreFormula: savedConfig.solvedScoreFormula || savedConfig.formula || DEFAULT_CONFIG.solvedScoreFormula,
        penaltyScoreFormula: savedConfig.penaltyScoreFormula || DEFAULT_CONFIG.penaltyScoreFormula,
      });
      setExpectedVersion(Number(data.expectedVersion || expectedVersion + 1));
      toast.success("Scoring config saved");
      onSaved?.();
    } catch (err) {
      if (err?.status === 409) {
        setError("This scoring config changed. Reload before saving again.");
      } else {
        setError(err?.message || "Failed to save scoring config");
      }
    } finally {
      setSaving(false);
    }
  };

  const previewRows = Array.isArray(preview?.users) ? preview.users.slice(0, 10) : [];
  const beforeRows = Array.isArray(beforePreview?.users) ? beforePreview.users.slice(0, 10) : [];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Calculator className="h-4 w-4" />
            Scoring & Merge
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-6xl gap-0 overflow-hidden p-0 sm:rounded-xl">
        <TooltipProvider delayDuration={180}>
          <DialogHeader className="border-b px-5 py-4">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Calculator className="h-5 w-5" />
              Scoring & Merge
            </DialogTitle>
            <DialogDescription>{roomName || "Contest room"}</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="units" className="min-h-0">
          <div className="border-b px-5 pt-4">
            <TabsList className="grid w-full grid-cols-3 sm:w-auto">
              <TabsTrigger value="units">Result Units</TabsTrigger>
              <TabsTrigger value="formula">Score Formulas</TabsTrigger>
              <TabsTrigger value="preview">Rank & Preview</TabsTrigger>
            </TabsList>
          </div>
          <ScrollArea className="h-[min(68vh,720px)]">
            <div className="px-5 py-4">
              {error && (
                <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}
              {loading ? (
                <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading
                </div>
              ) : (
                <>
                  <TabsContent value="units" className="mt-0 space-y-5">
                    <div className="grid gap-4 lg:grid-cols-[1fr,1.1fr]">
                      <section className="rounded-lg border p-4">
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold">Composite Units</h3>
                          <Badge variant="secondary">{(config.groups || []).length}</Badge>
                        </div>
                        <div className="space-y-3">
                          {(config.groups || []).map((group) => {
                            const memberContests = (group.contestItemIds || [])
                              .map((id) => contests.find((contest) => contestItemId(contest) === String(id)))
                              .filter(Boolean);
                            return (
                              <div key={group.formulaKey} className="rounded-md border bg-muted/20 p-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="truncate font-medium">{group.name}</p>
                                      <Badge variant="outline">{memberContests.length} contests</Badge>
                                    </div>
                                    <p className="truncate font-mono text-xs text-muted-foreground">{group.formulaKey}</p>
                                  </div>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeGroup(group.formulaKey)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                  <div className="space-y-1.5">
                                    <FieldLabel
                                      htmlFor={`composite-solved-formula-${group.formulaKey}`}
                                      labelClassName="text-xs text-muted-foreground"
                                      help="Calculates this composite unit's solved score from its selected contests."
                                    >
                                      Solved score formula
                                    </FieldLabel>
                                    <Input
                                      id={`composite-solved-formula-${group.formulaKey}`}
                                      value={group.solvedScoreFormula || group.formula || DEFAULT_COMPOSITE_FORMULA}
                                      onChange={(event) => setGroupFormula(group.formulaKey, "solvedScoreFormula", event.target.value)}
                                      className="font-mono text-sm"
                                    />
                                    <InsertDropdown
                                      label="Insert solved part"
                                      help="Appends a starter expression to the solved-score formula."
                                      placeholder="Add solved part"
                                      items={compositeSnippetItems}
                                      onInsert={(snippet) => setGroupFormula(
                                        group.formulaKey,
                                        "solvedScoreFormula",
                                        appendFormulaSnippet(group.solvedScoreFormula || group.formula, snippet),
                                      )}
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <FieldLabel
                                      htmlFor={`composite-penalty-formula-${group.formulaKey}`}
                                      labelClassName="text-xs text-muted-foreground"
                                      help="Calculates this composite unit's penalty score from the same selected contests."
                                    >
                                      Penalty formula
                                    </FieldLabel>
                                    <Input
                                      id={`composite-penalty-formula-${group.formulaKey}`}
                                      value={group.penaltyScoreFormula || DEFAULT_COMPOSITE_PENALTY_FORMULA}
                                      onChange={(event) => setGroupFormula(group.formulaKey, "penaltyScoreFormula", event.target.value)}
                                      className="font-mono text-sm"
                                    />
                                    <InsertDropdown
                                      label="Insert penalty part"
                                      help="Appends a starter expression to the penalty formula."
                                      placeholder="Add penalty part"
                                      items={compositeSnippetItems}
                                      onInsert={(snippet) => setGroupFormula(
                                        group.formulaKey,
                                        "penaltyScoreFormula",
                                        appendFormulaSnippet(group.penaltyScoreFormula, snippet),
                                      )}
                                    />
                                  </div>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                  {memberContests.map((contest) => (
                                    <Badge key={contestItemId(contest)} variant="secondary" className="max-w-full truncate">
                                      {contestTitle(contest)}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                          {(config.groups || []).length === 0 && (
                            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                              No composite units
                            </p>
                          )}
                        </div>
                      </section>

                      <section className="rounded-lg border p-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <Label htmlFor="scoring-group-name">Name</Label>
                            <Input
                              id="scoring-group-name"
                              value={draftGroupName}
                              onChange={(event) => setDraftGroupName(event.target.value)}
                              placeholder="Weekly composite"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="scoring-group-key">Result key</Label>
                            <Input
                              id="scoring-group-key"
                              value={draftGroupKey}
                              onChange={(event) => setDraftGroupKey(event.target.value)}
                              placeholder="weekly"
                            />
                          </div>
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <FieldLabel
                              htmlFor="scoring-group-solved-formula"
                              help="Calculates the composite's solved score from the contests selected below."
                            >
                              Solved score formula
                            </FieldLabel>
                            <Input
                              id="scoring-group-solved-formula"
                              value={draftGroupFormula}
                              onChange={(event) => setDraftGroupFormula(event.target.value)}
                              placeholder={DEFAULT_COMPOSITE_FORMULA}
                              className="font-mono text-sm"
                            />
                            <InsertDropdown
                              label="Insert solved part"
                              help="Appends a starter expression to the composite solved-score formula."
                              placeholder="Add solved part"
                              items={compositeSnippetItems}
                              onInsert={(snippet) => setDraftGroupFormula((current) => appendFormulaSnippet(current, snippet))}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <FieldLabel
                              htmlFor="scoring-group-penalty-formula"
                              help="Calculates the composite's penalty score from the same contests."
                            >
                              Penalty formula
                            </FieldLabel>
                            <Input
                              id="scoring-group-penalty-formula"
                              value={draftGroupPenaltyFormula}
                              onChange={(event) => setDraftGroupPenaltyFormula(event.target.value)}
                              placeholder={DEFAULT_COMPOSITE_PENALTY_FORMULA}
                              className="font-mono text-sm"
                            />
                            <InsertDropdown
                              label="Insert penalty part"
                              help="Appends a starter expression to the composite penalty formula."
                              placeholder="Add penalty part"
                              items={compositeSnippetItems}
                              onInsert={(snippet) => setDraftGroupPenaltyFormula((current) => appendFormulaSnippet(current, snippet))}
                            />
                          </div>
                        </div>
                        <div className="mt-4 space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-medium uppercase text-muted-foreground">Contests</p>
                              <Badge variant="secondary">{draftContestIds.length}/{contests.length}</Badge>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {contests.map((contest) => {
                                const id = contestItemId(contest);
                                const selected = draftContestIds.includes(id);
                                const unavailable = existingGroupContestIds.has(id);
                                return (
                                  <label
                                    key={id}
                                    className={cn(
                                      "flex min-h-14 items-start gap-3 rounded-md border p-3 text-sm",
                                      unavailable && "opacity-50",
                                    )}
                                  >
                                    <Checkbox
                                      checked={selected}
                                      disabled={unavailable}
                                      onCheckedChange={() => toggleDraftContest(id)}
                                    />
                                    <span className="min-w-0 flex-1">
                                      <span className="flex min-w-0 items-center gap-2">
                                        <span className="truncate font-medium">{contestTitle(contest)}</span>
                                        {unavailable && <Badge variant="outline">Grouped</Badge>}
                                      </span>
                                      <span className="block font-mono text-xs text-muted-foreground">
                                        {contestFormulaKey(contest) || contestExternalId(contest)}
                                      </span>
                                    </span>
                                  </label>
                                );
                              })}
                              {contests.length === 0 && (
                                <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground sm:col-span-2">
                                  No contests available
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button type="button" variant="secondary" size="sm" className="mt-4 gap-2" onClick={addDraftGroup}>
                          <Plus className="h-4 w-4" />
                          Add Composite
                        </Button>
                      </section>
                    </div>

                    <section className="rounded-lg border p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold">Included Units</h3>
                        <div className="flex items-center gap-2">
                          <Label htmlFor="drop-worst-count" className="text-xs text-muted-foreground">Drop worst</Label>
                          <Input
                            id="drop-worst-count"
                            type="number"
                            min="0"
                            className="h-8 w-20"
                            value={config.dropWorstCount || 0}
                            onChange={(event) => setConfig((current) => ({
                              ...current,
                              dropWorstCount: Math.max(0, Number(event.target.value) || 0),
                            }))}
                          />
                        </div>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {displayResultUnits.map((unit) => (
                          <label
                            key={unit.key}
                            className={cn(
                              "block rounded-md border p-3 text-sm",
                              unit.isComposite && "bg-muted/20",
                            )}
                          >
                            <span className="flex items-start gap-3">
                              <Checkbox
                                checked={!(config.excludedUnitKeys || []).includes(unit.key)}
                                onCheckedChange={() => toggleExcludedUnit(unit.key)}
                              />
                              <span className="min-w-0 flex-1">
                                <span className="flex min-w-0 flex-wrap items-center gap-2">
                                  <span className="truncate font-medium">{unit.name}</span>
                                  {unit.isComposite && <Badge variant="outline">Composite</Badge>}
                                </span>
                                <span className="block font-mono text-xs text-muted-foreground">{unit.key}</span>
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </section>
                  </TabsContent>

                  <TabsContent value="formula" className="mt-0 space-y-4">
                    <section className="rounded-lg border p-4">
                      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold">Final score pair</h3>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Solved score ranks higher first; penalty score breaks equal solved scores when ranked ascending.
                          </p>
                        </div>
                        <div className="w-40 space-y-1.5">
                          <Label htmlFor="score-precision">Display precision</Label>
                          <Select
                            value={String(config.scorePrecision ?? 0)}
                            onValueChange={(value) => setConfig((current) => ({ ...current, scorePrecision: Number(value) }))}
                          >
                            <SelectTrigger id="score-precision">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[0, 1, 2, 3, 4].map((value) => (
                                <SelectItem key={value} value={String(value)}>{value}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="space-y-3 rounded-md border bg-muted/20 p-3">
                          <FieldLabel
                            htmlFor="solved-score-formula"
                            help="Produces the primary solved score. Higher values should normally rank first."
                          >
                            Solved score formula
                          </FieldLabel>
                          <Textarea
                            id="solved-score-formula"
                            value={config.solvedScoreFormula || config.formula || ""}
                            onChange={(event) => setConfig((current) => ({
                              ...current,
                              formula: event.target.value,
                              solvedScoreFormula: event.target.value,
                            }))}
                            className="min-h-28 font-mono text-sm"
                          />
                          <div className="grid gap-2 sm:grid-cols-2">
                            <InsertDropdown
                              label="Snippets"
                              help="Appends a saved or suggested expression to the solved-score formula."
                              items={formulaSnippetItems}
                              onInsert={(snippet) => setConfig((current) => ({
                                ...current,
                                formula: appendFormulaSnippet(current.solvedScoreFormula || current.formula, snippet),
                                solvedScoreFormula: appendFormulaSnippet(current.solvedScoreFormula || current.formula, snippet),
                              }))}
                            />
                            <InsertDropdown
                              label="Metrics"
                              help="Appends an aggregate over a result-unit metric."
                              items={metricItems}
                              onInsert={(snippet) => setConfig((current) => ({
                                ...current,
                                formula: appendFormulaSnippet(current.solvedScoreFormula || current.formula, snippet),
                                solvedScoreFormula: appendFormulaSnippet(current.solvedScoreFormula || current.formula, snippet),
                              }))}
                            />
                            <InsertDropdown
                              label="Functions"
                              help="Appends a starter function expression."
                              items={functionItems}
                              onInsert={(snippet) => setConfig((current) => ({
                                ...current,
                                formula: appendFormulaSnippet(current.solvedScoreFormula || current.formula, snippet),
                                solvedScoreFormula: appendFormulaSnippet(current.solvedScoreFormula || current.formula, snippet),
                              }))}
                            />
                            <InsertDropdown
                              label="Filters"
                              help="Appends a starter filtered aggregate."
                              items={filterFieldItems}
                              onInsert={(snippet) => setConfig((current) => ({
                                ...current,
                                formula: appendFormulaSnippet(current.solvedScoreFormula || current.formula, snippet),
                                solvedScoreFormula: appendFormulaSnippet(current.solvedScoreFormula || current.formula, snippet),
                              }))}
                            />
                          </div>
                        </div>
                        <div className="space-y-3 rounded-md border bg-muted/20 p-3">
                          <FieldLabel
                            htmlFor="penalty-score-formula"
                            help="Produces the tie-breaking penalty score. Lower values should normally rank first."
                          >
                            Penalty formula
                          </FieldLabel>
                          <Textarea
                            id="penalty-score-formula"
                            value={config.penaltyScoreFormula || ""}
                            onChange={(event) => setConfig((current) => ({ ...current, penaltyScoreFormula: event.target.value }))}
                            className="min-h-28 font-mono text-sm"
                          />
                          <div className="grid gap-2 sm:grid-cols-2">
                            <InsertDropdown
                              label="Snippets"
                              help="Appends a saved or suggested expression to the penalty formula."
                              items={formulaSnippetItems}
                              onInsert={(snippet) => setConfig((current) => ({
                                ...current,
                                penaltyScoreFormula: appendFormulaSnippet(current.penaltyScoreFormula, snippet),
                              }))}
                            />
                            <InsertDropdown
                              label="Metrics"
                              help="Appends an aggregate over a result-unit metric."
                              items={metricItems}
                              onInsert={(snippet) => setConfig((current) => ({
                                ...current,
                                penaltyScoreFormula: appendFormulaSnippet(current.penaltyScoreFormula, snippet),
                              }))}
                            />
                            <InsertDropdown
                              label="Functions"
                              help="Appends a starter function expression."
                              items={functionItems}
                              onInsert={(snippet) => setConfig((current) => ({
                                ...current,
                                penaltyScoreFormula: appendFormulaSnippet(current.penaltyScoreFormula, snippet),
                              }))}
                            />
                            <InsertDropdown
                              label="Filters"
                              help="Appends a starter filtered aggregate."
                              items={filterFieldItems}
                              onInsert={(snippet) => setConfig((current) => ({
                                ...current,
                                penaltyScoreFormula: appendFormulaSnippet(current.penaltyScoreFormula, snippet),
                              }))}
                            />
                          </div>
                        </div>
                      </div>
                      <ContestFormulaExplainer className="mt-4" />
                    </section>
                    <section className="rounded-lg border p-4">
                      <ReferenceBadges title="Available metrics" items={metricItems} />
                      <ReferenceBadges title="Filter fields" items={filterFieldItems} className="mt-4" />
                    </section>
                  </TabsContent>

                  <TabsContent value="preview" className="mt-0 space-y-4">
                    <section className="rounded-lg border p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold">Sort Ladder</h3>
                        <Button variant="outline" size="sm" className="gap-2" onClick={addSortRule} disabled={(config.sortRules || []).length >= 8}>
                          <Plus className="h-4 w-4" />
                          Add Key
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {(config.sortRules || []).map((rule, index) => (
                          <div
                            key={`${rule.key}-${index}`}
                            tabIndex={0}
                            onKeyDown={(event) => {
                              if (event.key === "ArrowUp") moveSortRule(index, -1);
                              if (event.key === "ArrowDown") moveSortRule(index, 1);
                            }}
                            className="grid gap-2 rounded-md border p-2 outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[1fr,140px,auto]"
                          >
                            <Select value={rule.key} onValueChange={(value) => setSortRule(index, { key: value })}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="max-h-72">
                                {sortKeyItems.map((item) => (
                                  <SelectItem key={item.value} value={item.value} title={item.description}>
                                    <span className="flex min-w-0 flex-col gap-0.5 py-1">
                                      <span className="font-mono text-xs">{item.label}</span>
                                      <span className="max-w-80 truncate text-[11px] text-muted-foreground">
                                        {item.description}
                                      </span>
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select value={rule.direction} onValueChange={(value) => setSortRule(index, { direction: value })}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="desc">Descending</SelectItem>
                                <SelectItem value="asc">Ascending</SelectItem>
                              </SelectContent>
                            </Select>
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => moveSortRule(index, -1)}>
                                <ArrowUp className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => moveSortRule(index, 1)}>
                                <ArrowDown className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeSortRule(index)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" variant="secondary" className="gap-2" onClick={previewConfig} disabled={previewing}>
                        {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        Preview
                      </Button>
                      {preview?.scoring?.version !== undefined && (
                        <Badge variant="outline">Version {expectedVersion}</Badge>
                      )}
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <section className="rounded-lg border p-4">
                        <h3 className="mb-3 text-sm font-semibold">Before</h3>
                        <div className="space-y-2">
                          {beforeRows.length === 0 && <p className="text-sm text-muted-foreground">No previous preview</p>}
                          {beforeRows.map((row, index) => (
                            <div key={row.identityKey || row.username} className="grid grid-cols-[40px,1fr,90px,90px] gap-2 text-sm">
                              <span>{index + 1}</span>
                              <span className="truncate">{row.username}</span>
                              <span className="text-right tabular-nums">Solved {formatNumber(row.effectiveSolved ?? row.totalSolved, 2)}</span>
                              <span className="text-right tabular-nums">Penalty {formatNumber(row.effectivePenalty ?? row.totalPenalty, 2)}</span>
                            </div>
                          ))}
                        </div>
                      </section>
                      <section className="rounded-lg border p-4">
                        <h3 className="mb-3 text-sm font-semibold">After</h3>
                        <div className="space-y-2">
                          {previewRows.length === 0 && <p className="text-sm text-muted-foreground">Run preview</p>}
                          {previewRows.map((row, index) => (
                            <button
                              key={row.identityKey || row.username}
                              type="button"
                              className={cn(
                                "grid w-full grid-cols-[40px,1fr,90px,90px] gap-2 rounded-md px-2 py-1 text-left text-sm",
                                selectedTraceKey === String(row.identityKey || row.username) && "bg-muted",
                              )}
                              onClick={() => setSelectedTraceKey(String(row.identityKey || row.username))}
                            >
                              <span>{row.rank || index + 1}</span>
                              <span className="truncate">{row.username}</span>
                              <span className="text-right tabular-nums">Solved {formatNumber(row.displaySolvedScore ?? row.solvedScore ?? row.displayScore ?? row.score, preview?.scorePrecision ?? 2)}</span>
                              <span className="text-right tabular-nums">Penalty {formatNumber(row.displayPenaltyScore ?? row.penaltyScore ?? row.effectivePenalty, preview?.scorePrecision ?? 2)}</span>
                            </button>
                          ))}
                        </div>
                      </section>
                    </div>

                    {selectedTrace && (
                      <section className="rounded-lg border p-4">
                        <h3 className="mb-3 text-sm font-semibold">Trace - {selectedTrace.username}</h3>
                        <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                          {Object.entries(selectedTrace.scoringVariables || {}).slice(0, 36).map(([key, value]) => (
                            <div key={key} className="rounded-md bg-muted/50 px-2 py-1">
                              <span className="font-mono text-xs text-muted-foreground">{key}</span>
                              <span className="float-right tabular-nums">{formatNumber(value, 3)}</span>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                  </TabsContent>
                </>
              )}
            </div>
          </ScrollArea>
          </Tabs>

          <DialogFooter className="border-t px-5 py-4">
            <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
            <Button onClick={saveConfig} disabled={saving || loading} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </DialogFooter>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}
