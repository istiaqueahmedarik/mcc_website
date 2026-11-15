export const LIVE_UPDATE_TIMINGS = Object.freeze({ stale: 15_000, poll: 5_000, request: 10_000 });

function validStats(stats) {
  return stats && ['submitted', 'active', 'pending_verification', 'revision']
    .every(key => Number.isSafeInteger(stats[key]) && stats[key] >= 0);
}

// Keep a stalled stream from disabling updates. EventSource handles reconnection;
// REST polling fills the gap until a valid stats event confirms recovery.
export function watchCampaignUpdates({ url, readStats, onData, onState = () => {},
  createSource = value => new EventSource(value), visibility = document }) {
  let disposed = false, generation = 0, source, watchdog, pollTimer;
  let pollRequest, session, mode;
  const current = token => !disposed && token === generation && visibility.visibilityState === 'visible';

  function clearWork() {
    generation++;
    clearTimeout(watchdog); clearTimeout(pollTimer);
    source?.close(); source = undefined;
    session?.abort(); pollRequest?.abort();
    pollRequest = undefined;
  }

  function start() {
    clearWork();
    if (visibility.visibilityState !== 'visible') { onState('paused'); return; }
    const token = generation;
    session = new AbortController();
    const sessionSignal = session.signal;
    mode = 'stream';
    onState('connecting');

    function unavailable(status) {
      clearWork();
      onState(status === 404 ? 'unavailable' : 'unauthorized');
    }

    async function poll() {
      if (!current(token) || mode !== 'polling' || pollRequest) return;
      const request = new AbortController();
      pollRequest = request;
      let deadline;
      try {
        const stats = await Promise.race([
          readStats(request.signal),
          new Promise((_, reject) => { deadline = setTimeout(() => {
            request.abort(); reject(new Error('Dashboard refresh timed out'));
          }, LIVE_UPDATE_TIMINGS.request); }),
        ]);
        if (!current(token) || mode !== 'polling' || pollRequest !== request || request.signal.aborted) return;
        if (!validStats(stats)) throw new Error('Invalid dashboard response');
        onData(stats, sessionSignal);
        onState('polling');
      } catch (error) {
        if (!current(token) || mode !== 'polling' || pollRequest !== request) return;
        if ([401, 403, 404].includes(error?.status)) { unavailable(error.status); return; }
        onState('stale');
      } finally {
        clearTimeout(deadline);
        if (pollRequest === request) {
          pollRequest = undefined;
          if (current(token) && mode === 'polling') pollTimer = setTimeout(poll, LIVE_UPDATE_TIMINGS.poll);
        }
      }
    }

    function fallback() {
      if (!current(token) || mode === 'polling') return;
      clearTimeout(watchdog);
      mode = 'polling';
      onState('reconnecting');
      void poll();
    }

    const armWatchdog = () => {
      clearTimeout(watchdog);
      watchdog = setTimeout(fallback, LIVE_UPDATE_TIMINGS.stale);
    };
    armWatchdog();
    try {
      const events = createSource(url);
      source = events;
      events.addEventListener('stats', event => {
        if (!current(token)) return;
        let stats;
        try { stats = JSON.parse(event.data); } catch { fallback(); return; }
        if (!validStats(stats)) { fallback(); return; }
        mode = 'stream';
        clearTimeout(pollTimer);
        pollRequest?.abort(); pollRequest = undefined;
        onData(stats, sessionSignal);
        onState('fresh');
        armWatchdog();
      });
      events.addEventListener('unauthorized', () => { if (current(token)) unavailable(403); });
      events.onerror = fallback;
      // Opening HTTP headers alone does not prove that stats are reaching us.
    } catch { fallback(); }
  }

  visibility.addEventListener('visibilitychange', start);
  start();
  return () => {
    disposed = true;
    visibility.removeEventListener('visibilitychange', start);
    clearWork();
  };
}
