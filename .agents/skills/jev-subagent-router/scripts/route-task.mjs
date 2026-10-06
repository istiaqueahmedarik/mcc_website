import { pathToFileURL } from 'node:url';

const DEFAULT_TIMEOUT_MS = 1500;
const DEFAULT_CONFIDENCE_THRESHOLD = 0.55;
const MAX_INPUT_BYTES = 32 * 1024;

export const TIERS = Object.freeze({
  best: Object.freeze({ model: 'gpt-5.6-sol', reasoning_effort: 'medium' }),
  medium: Object.freeze({ model: 'gpt-5.5', reasoning_effort: 'xhigh' }),
  normal: Object.freeze({ model: 'gpt-5.5', reasoning_effort: 'medium' }),
  low: Object.freeze({ model: 'gpt-5.5', reasoning_effort: 'low' }),
});

const ROLES = new Set(['default', 'explorer', 'worker']);

const FALLBACK_PATTERNS = Object.freeze({
  best: /\b(?:architect(?:ure|ural)?|authorization|authentication|credential|cryptograph(?:y|ic)|data loss|deployment|migration|multi[- ]system|permission|privacy|production|secret|security|tenant)\b/i,
  medium: /\b(?:audit|concurrency|debug|diagnos(?:e|is)|edge case|integration|investigat(?:e|ion)|performance|race condition|refactor|review|root cause)\b/i,
  low: /\b(?:find|list|locate|lookup|mechanical|read[- ]only|status|summari[sz]e|typo)\b/i,
  worker: /\b(?:add|build|change|create|edit|fix|implement|migrate|patch|refactor|remove|repair|update|write)\b/i,
  explorer: /\b(?:audit|diagnos(?:e|is)|explore|find|inspect|investigat(?:e|ion)|locate|read[- ]only|review|trace)\b/i,
});

const ROUTE_QUESTIONS = Object.freeze({
  tier: {
    type: 'choice',
    instructions: [
      'Choose the least expensive execution tier that can complete `task` reliably.',
      'Account for ambiguity, breadth, security or data risk, architectural impact, debugging depth, verification burden, and the cost of a wrong result.',
      'Use a stronger tier when the task crosses systems or requires reconciling uncertain evidence.',
    ],
    criteria: {
      best: 'Ambiguous, architectural, security-sensitive, multi-system, or demanding implementation work where strong judgment matters.',
      medium: 'Bounded but difficult reasoning, debugging, review, or implementation with meaningful edge cases.',
      normal: 'Routine implementation, research, or analysis with a clear scope and ordinary verification.',
      low: 'A narrow lookup, mechanical check, simple summarization, or highly constrained repetitive task.',
    },
  },
  role: {
    type: 'choice',
    instructions: 'Which Codex subagent role best matches the work requested in `task`?',
    criteria: {
      explorer: 'Read-only codebase investigation that locates entry points, traces behavior, or collects evidence.',
      worker: 'Implementation, repair, or production work with an explicit owned scope.',
      default: 'General analysis, external research, synthesis, or work that is neither codebase exploration nor implementation.',
    },
  },
});

function clampNumber(value, fallback, minimum, maximum) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

function nonEmptyString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`invalid_${field}`);
  }
  return value.trim();
}

export function parseInput(raw) {
  if (Buffer.byteLength(raw, 'utf8') > MAX_INPUT_BYTES) throw new Error('input_too_large');
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    throw new Error('invalid_json');
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('invalid_input');
  return input;
}

export function buildRouteRequest(input, model = 'jev-latest') {
  const task = nonEmptyString(input.task, 'task');
  const context = typeof input.context === 'string' ? input.context.trim() : '';
  return {
    model,
    state: { task, ...(context ? { context } : {}) },
    questions: ROUTE_QUESTIONS,
  };
}

export function buildRecommendationRequest(input, model = 'jev-latest') {
  const question = nonEmptyString(input.question, 'question');
  if (!Array.isArray(input.options) || input.options.length < 2 || input.options.length > 3) {
    throw new Error('invalid_options_count');
  }

  const seenIds = new Set();
  const options = input.options.map((option, index) => {
    if (!option || typeof option !== 'object') throw new Error('invalid_option');
    const id = nonEmptyString(option.id, `option_${index + 1}_id`);
    if (seenIds.has(id)) throw new Error('duplicate_option_id');
    seenIds.add(id);
    return {
      id,
      label: nonEmptyString(option.label, `option_${index + 1}_label`),
      description: typeof option.description === 'string' ? option.description.trim() : '',
      choiceKey: `option_${index + 1}`,
    };
  });

  const criteria = Object.fromEntries(
    options.map(({ choiceKey, label, description }) => [
      choiceKey,
      description ? `${label}: ${description}` : label,
    ]),
  );

  const context = typeof input.context === 'string' ? input.context.trim() : '';
  return {
    request: {
      model,
      state: {
        question,
        options: options.map(({ id, label, description }) => ({ id, label, description })),
        ...(context ? { context } : {}),
      },
      questions: {
        recommendation: {
          type: 'choice',
          instructions: [
            'Which option best satisfies `question` given `context` and the stated tradeoffs?',
            'Prefer the safer reversible option when expected value is otherwise comparable.',
            'Recommend one option; do not assume the user has selected it.',
          ],
          criteria,
        },
      },
    },
    optionByChoiceKey: Object.fromEntries(options.map((option) => [option.choiceKey, option.id])),
  };
}

function answerChoice(answer, allowed, field) {
  if (!answer || answer.type !== 'choice' || !allowed.has(answer.choice)) {
    throw new Error(`invalid_${field}_answer`);
  }
  const confidence = Number(answer.confidence);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw new Error(`invalid_${field}_confidence`);
  }
  return { choice: answer.choice, confidence };
}

export function routeDecisionFromResponse(payload, threshold = DEFAULT_CONFIDENCE_THRESHOLD) {
  const answers = payload?.answers;
  const tierAnswer = answerChoice(answers?.tier, new Set(Object.keys(TIERS)), 'tier');
  const roleAnswer = answerChoice(answers?.role, ROLES, 'role');
  const confidenceThreshold = clampNumber(threshold, DEFAULT_CONFIDENCE_THRESHOLD, 0, 1);
  const tier = tierAnswer.confidence >= confidenceThreshold ? tierAnswer.choice : 'best';
  const agentType = roleAnswer.confidence >= confidenceThreshold ? roleAnswer.choice : 'default';

  return {
    ok: true,
    decisionSource: 'jev',
    modelVersion: typeof payload.model === 'string' ? payload.model : null,
    tier,
    tierConfidence: tierAnswer.confidence,
    role: agentType,
    roleConfidence: roleAnswer.confidence,
    lowConfidenceEscalation: tierAnswer.confidence < confidenceThreshold,
    spawn: {
      ...TIERS[tier],
      agent_type: agentType,
      fork_turns: 'none',
    },
  };
}

export function recommendationFromResponse(
  payload,
  optionByChoiceKey,
  threshold = DEFAULT_CONFIDENCE_THRESHOLD,
) {
  const allowed = new Set(Object.keys(optionByChoiceKey));
  const answer = answerChoice(payload?.answers?.recommendation, allowed, 'recommendation');
  const confidenceThreshold = clampNumber(threshold, DEFAULT_CONFIDENCE_THRESHOLD, 0, 1);
  return {
    ok: true,
    decisionSource: 'jev',
    modelVersion: typeof payload.model === 'string' ? payload.model : null,
    recommendedOptionId: optionByChoiceKey[answer.choice],
    confidence: answer.confidence,
    useRecommendation: answer.confidence >= confidenceThreshold,
  };
}

export function deterministicFallbackRoute(input = {}) {
  const task = [input.task, input.context]
    .filter((value) => typeof value === 'string')
    .join(' ')
    .trim();

  let tier = 'normal';
  if (FALLBACK_PATTERNS.best.test(task)) tier = 'best';
  else if (FALLBACK_PATTERNS.medium.test(task)) tier = 'medium';
  else if (FALLBACK_PATTERNS.low.test(task)) tier = 'low';

  let role = 'default';
  if (FALLBACK_PATTERNS.worker.test(task)) role = 'worker';
  else if (FALLBACK_PATTERNS.explorer.test(task)) role = 'explorer';

  return {
    tier,
    role,
    spawn: {
      ...TIERS[tier],
      agent_type: role,
      fork_turns: 'none',
    },
  };
}

function fallback(mode, reason, input) {
  if (mode === 'recommend') {
    return {
      ok: false,
      decisionSource: 'fallback',
      reason,
      recommendedOptionId: null,
      useRecommendation: false,
    };
  }
  const route = deterministicFallbackRoute(input);
  return {
    ok: false,
    decisionSource: 'fallback',
    reason,
    ...route,
  };
}

async function callTypeSafe(request, apiKey, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch('https://api.typesafe.ai/v1/systemone', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`typesafe_http_${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function readStdin() {
  let raw = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) {
    raw += chunk;
    if (Buffer.byteLength(raw, 'utf8') > MAX_INPUT_BYTES) throw new Error('input_too_large');
  }
  return raw;
}

function safeReason(error) {
  if (error?.name === 'AbortError') return 'typesafe_timeout';
  const message = String(error?.message || 'router_error');
  return /^[a-z0-9_]+$/i.test(message) ? message : 'router_error';
}

export async function run(raw, env = process.env) {
  let mode = 'route';
  let input;
  try {
    input = parseInput(raw);
    mode = input.mode === 'recommend' ? 'recommend' : 'route';
    const apiKey = typeof env.TYPESAFE_API_KEY === 'string' ? env.TYPESAFE_API_KEY.trim() : '';
    if (!apiKey) return fallback(mode, 'missing_api_key', input);

    const model = (env.TYPESAFE_ROUTER_MODEL || 'jev-latest').trim();
    const timeoutMs = clampNumber(
      env.TYPESAFE_ROUTER_TIMEOUT_MS,
      DEFAULT_TIMEOUT_MS,
      250,
      5000,
    );
    const threshold = clampNumber(
      env.TYPESAFE_ROUTER_CONFIDENCE,
      DEFAULT_CONFIDENCE_THRESHOLD,
      0,
      1,
    );

    if (mode === 'recommend') {
      const { request, optionByChoiceKey } = buildRecommendationRequest(input, model);
      const payload = await callTypeSafe(request, apiKey, timeoutMs);
      return recommendationFromResponse(payload, optionByChoiceKey, threshold);
    }

    const request = buildRouteRequest(input, model);
    const payload = await callTypeSafe(request, apiKey, timeoutMs);
    return routeDecisionFromResponse(payload, threshold);
  } catch (error) {
    return fallback(mode, safeReason(error), input);
  }
}

async function main() {
  const result = await run(await readStdin());
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
