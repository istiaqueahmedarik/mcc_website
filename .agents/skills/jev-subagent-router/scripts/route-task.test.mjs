import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildRecommendationRequest,
  buildRouteRequest,
  deterministicFallbackRoute,
  recommendationFromResponse,
  routeDecisionFromResponse,
  run,
} from './route-task.mjs';

test('builds a bounded route request with both judgments', () => {
  const request = buildRouteRequest({ task: 'Trace a failing route', context: 'Read-only' });
  assert.equal(request.model, 'jev-latest');
  assert.deepEqual(request.state, { task: 'Trace a failing route', context: 'Read-only' });
  assert.deepEqual(Object.keys(request.questions), ['tier', 'role']);
});

test('maps the requested four model tiers exactly', () => {
  const result = routeDecisionFromResponse({
    model: 'jev-1.13.0',
    answers: {
      tier: { type: 'choice', choice: 'medium', confidence: 0.84 },
      role: { type: 'choice', choice: 'worker', confidence: 0.91 },
    },
  });
  assert.deepEqual(result.spawn, {
    model: 'gpt-5.5',
    reasoning_effort: 'xhigh',
    agent_type: 'worker',
    fork_turns: 'none',
  });
});

test('escalates a low-confidence tier to best', () => {
  const result = routeDecisionFromResponse({
    answers: {
      tier: { type: 'choice', choice: 'low', confidence: 0.4 },
      role: { type: 'choice', choice: 'explorer', confidence: 0.9 },
    },
  });
  assert.equal(result.tier, 'best');
  assert.equal(result.spawn.model, 'gpt-5.6-sol');
  assert.equal(result.spawn.reasoning_effort, 'medium');
  assert.equal(result.spawn.agent_type, 'explorer');
});

test('maps recommendation keys back to stable option ids', () => {
  const { request, optionByChoiceKey } = buildRecommendationRequest({
    question: 'Which rollout?',
    options: [
      { id: 'staged', label: 'Staged', description: 'Lower risk' },
      { id: 'direct', label: 'Direct', description: 'Faster' },
    ],
  });
  assert.deepEqual(Object.keys(request.questions.recommendation.criteria), ['option_1', 'option_2']);
  const result = recommendationFromResponse(
    {
      answers: {
        recommendation: { type: 'choice', choice: 'option_1', confidence: 0.77 },
      },
    },
    optionByChoiceKey,
  );
  assert.equal(result.recommendedOptionId, 'staged');
  assert.equal(result.useRecommendation, true);
});

test('returns a safe normal fallback when the API key is absent', async () => {
  const result = await run(JSON.stringify({ mode: 'route', task: 'Implement a routine form label update' }), {});
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'missing_api_key');
  assert.equal(result.tier, 'normal');
  assert.equal(result.role, 'worker');
  assert.equal(result.spawn.model, 'gpt-5.5');
  assert.equal(result.spawn.reasoning_effort, 'medium');
});

test('uses conservative deterministic routing when Jev is unavailable', () => {
  const route = deterministicFallbackRoute({
    task: 'Trace an authentication bug across multiple systems and propose the narrowest safe fix',
  });
  assert.equal(route.tier, 'best');
  assert.equal(route.role, 'worker');
  assert.equal(route.spawn.model, 'gpt-5.6-sol');
  assert.equal(route.spawn.reasoning_effort, 'medium');
});

test('keeps narrow read-only lookups on the low explorer tier', () => {
  const route = deterministicFallbackRoute({ task: 'Locate the file that defines this read-only setting' });
  assert.equal(route.tier, 'low');
  assert.equal(route.role, 'explorer');
  assert.equal(route.spawn.model, 'gpt-5.5');
  assert.equal(route.spawn.reasoning_effort, 'low');
});

test('does not recommend an option when the API key is absent', async () => {
  const result = await run(
    JSON.stringify({
      mode: 'recommend',
      question: 'Choose one',
      options: [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
      ],
    }),
    {},
  );
  assert.equal(result.ok, false);
  assert.equal(result.useRecommendation, false);
  assert.equal(result.recommendedOptionId, null);
});
