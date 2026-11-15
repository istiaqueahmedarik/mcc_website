import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LIVE_UPDATE_TIMINGS as time, watchCampaignUpdates } from './live-campaign-updates.mjs';

const stats = { submitted: 1, active: 0, pending_verification: 0, revision: 1 };
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
function setup(t, readStats = async () => stats) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const visibility = new EventTarget(); visibility.visibilityState = 'visible';
  const sources = [], states = [], data = [], signals = [];
  let calls = 0;
  const stop = watchCampaignUpdates({
    url: '/stream', visibility, onState: state => states.push(state), onData: value => data.push(value),
    readStats: signal => { calls++; signals.push(signal); return readStats(signal); },
    createSource: () => {
      const source = new EventTarget();
      source.closed = false; source.close = () => { source.closed = true; };
      source.stats = value => source.dispatchEvent(new MessageEvent('stats', { data: JSON.stringify(value) }));
      sources.push(source); return source;
    },
  });
  t.after(stop);
  return { visibility, sources, states, data, signals, stop, calls: () => calls, tick: async ms => { t.mock.timers.tick(ms); await flush(); } };
}

test('pending connection falls back and refreshes without overlapping requests', async t => {
  let resolve;
  const run = setup(t, () => new Promise(done => { resolve = done; }));
  assert.equal(run.states.at(-1), 'connecting');
  await run.tick(time.stale);
  assert.equal(run.states.at(-1), 'reconnecting'); assert.equal(run.calls(), 1);
  await run.tick(time.poll); assert.equal(run.calls(), 1);
  resolve(stats); await flush(); assert.equal(run.states.at(-1), 'polling');
  assert.deepEqual(run.data, [stats]);
  await run.tick(time.poll); assert.equal(run.calls(), 2);
});

test('opening headers does not mark live; valid events do and silence expires', async t => {
  const run = setup(t);
  run.sources[0].dispatchEvent(new Event('open'));
  assert.equal(run.states.at(-1), 'connecting');
  run.sources[0].stats(stats); assert.equal(run.states.at(-1), 'fresh');
  await run.tick(time.stale - 1); assert.equal(run.calls(), 0);
  await run.tick(1); assert.equal(run.states.at(-1), 'polling');
});

test('stream recovery stops polling and ignores the late polling result', async t => {
  let resolve;
  const run = setup(t, () => new Promise(done => { resolve = done; }));
  await run.tick(time.stale);
  run.sources[0].stats({ ...stats, revision: 3 });
  assert.equal(run.states.at(-1), 'fresh'); assert.equal(run.signals[0].aborted, true);
  resolve(stats); await flush(); assert.equal(run.data.length, 1);
  await run.tick(time.poll); assert.equal(run.calls(), 1);
});

test('failed polling preserves last data and recovers on a subsequent refresh', async t => {
  let fail = true;
  const run = setup(t, async () => { if (fail) throw new Error('offline'); return stats; });
  await run.tick(time.stale); assert.equal(run.states.at(-1), 'stale'); assert.equal(run.data.length, 0);
  fail = false; await run.tick(time.poll); assert.equal(run.states.at(-1), 'polling');
});

test('hanging refresh is aborted on a deadline and retried', async t => {
  const run = setup(t, () => new Promise(() => {}));
  await run.tick(time.stale); await run.tick(time.request);
  assert.equal(run.signals[0].aborted, true); assert.equal(run.states.at(-1), 'stale');
  await run.tick(time.poll); assert.equal(run.calls(), 2);
});

test('authorization revocation closes stream and stops refreshes', async t => {
  const run = setup(t, async () => { throw Object.assign(new Error('forbidden'), { status: 403 }); });
  await run.tick(time.stale); assert.equal(run.states.at(-1), 'unauthorized');
  assert.equal(run.sources[0].closed, true);
  await run.tick(time.stale * 2); assert.equal(run.calls(), 1);
  run.sources[0].stats(stats); assert.equal(run.data.length, 0);
});

test('explicit unauthorized event terminates updates without falling back', async t => {
  const run = setup(t);
  run.sources[0].dispatchEvent(new MessageEvent('unauthorized', { data: '{}' }));
  await run.tick(time.stale * 2);
  assert.equal(run.states.at(-1), 'unauthorized'); assert.equal(run.calls(), 0);
});

test('hidden page and cleanup discard late results and resume a fresh connection', async t => {
  let resolve;
  const run = setup(t, () => new Promise(done => { resolve = done; }));
  await run.tick(time.stale);
  run.visibility.visibilityState = 'hidden'; run.visibility.dispatchEvent(new Event('visibilitychange'));
  assert.equal(run.states.at(-1), 'paused'); assert.equal(run.signals[0].aborted, true);
  resolve(stats); await flush(); assert.equal(run.data.length, 0);
  await run.tick(time.stale * 2); assert.equal(run.calls(), 1);
  run.visibility.visibilityState = 'visible'; run.visibility.dispatchEvent(new Event('visibilitychange'));
  assert.equal(run.sources.length, 2); assert.equal(run.states.at(-1), 'connecting');
  run.stop(); run.sources[1].stats(stats); await run.tick(time.stale * 2);
  assert.equal(run.data.length, 0); assert.equal(run.sources[1].closed, true);
});

test('malformed stats do not mark live or overwrite counters', async t => {
  const run = setup(t);
  run.sources[0].stats({ submitted: 'wrong' }); await flush();
  assert.deepEqual(run.data, [stats]); assert.equal(run.states.at(-1), 'polling');
});


test('a cancelled poll cannot overwrite a newer fallback after stream recovery', async t => {
  const resolves = [];
  const run = setup(t, () => new Promise(done => resolves.push(done)));
  await run.tick(time.stale);
  run.sources[0].stats({ ...stats, revision: 2 });
  run.sources[0].onerror();
  assert.equal(run.calls(), 2);
  resolves[0](stats); await flush();
  assert.equal(run.data.length, 1);
  resolves[1]({ ...stats, revision: 3 }); await flush();
  assert.equal(run.states.at(-1), 'polling'); assert.equal(run.data.at(-1).revision, 3);
  await run.tick(time.poll); assert.equal(run.calls(), 3);
});
