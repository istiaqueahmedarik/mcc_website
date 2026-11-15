/** Loopback-only synthetic HTTP transport fixture. No database or real accounts. */
const campaign = { id: '11111111-1111-4111-8111-111111111111', title: 'Live updates QA', slug: 'live-updates-qa', status: 'open', kind: 'general', fields: [] };
const account = { id: '22222222-2222-4222-8222-222222222222', email: 'admin@forms.invalid', full_name: 'QA Administrator', admin: true, trainer: false, granted: true };
let rows: any[] = [], revision = 0, dashboardGets = 0, live = false, revoked = false;
const streams = new Set<ReadableStreamDefaultController<Uint8Array>>();
const encode = new TextEncoder();
const stats = () => ({ submitted: rows.length, active: 0, pending_verification: 0, revision });
function respond() {
  revision++;
  rows.push({ id: `response-${revision}`, user_id: `student-${revision}`, email: `student${revision}@forms.invalid`, full_name: `QA Student ${revision}`, profile_values: { full_name: `QA Student ${revision}`, mist_id: '202614009' }, submitted_at: new Date().toISOString(), verification_status: 'Current' });
}
function broadcast(event: string, data: any) {
  for (const controller of streams) {
    try { controller.enqueue(encode.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)); }
    catch { streams.delete(controller); }
  }
}
respond();
const server = Bun.serve({
  hostname: '127.0.0.1', port: 55441, idleTimeout: 0,
  fetch(request) {
    const url = new URL(request.url), path = url.pathname;
    if (path === '/qa/metrics') return Response.json({ dashboardGets, streams: streams.size });
    if (request.method === 'POST' && path === '/qa/respond') { respond(); return Response.json(stats()); }
    if (request.method === 'POST' && path === '/qa/recover') { live = true; broadcast('stats', stats()); return Response.json({ ok: true }); }
    if (request.method === 'POST' && path === '/qa/revoke') { revoked = true; broadcast('unauthorized', { error: 'Admin access required' }); return Response.json({ ok: true }); }
    if (request.headers.get('authorization') !== 'Bearer synthetic-live-status-only') return Response.json({ error: 'Synthetic authorization required' }, { status: 401 });
    if (path === '/auth/user/profile') return Response.json({ result: [account] });
    if (revoked) return Response.json({ error: 'Admin access required' }, { status: 403 });
    if (path === '/global-forms/manage/templates') return Response.json({ templates: [] });
    if (path === '/global-forms/manage/campaigns') return Response.json({ campaigns: [campaign] });
    if (path.endsWith('/responses')) return Response.json({ responses: rows, total: rows.length, page: 1, page_size: 50 });
    if (path === `/global-forms/manage/campaigns/${campaign.id}`) return Response.json({ campaign });
    if (path === '/global-forms/manage/dashboard') { dashboardGets++; return Response.json(stats()); }
    if (path === '/global-forms/manage/stream') {
      let sink: ReadableStreamDefaultController<Uint8Array>;
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          sink = controller; streams.add(controller);
          controller.enqueue(encode.encode(': synthetic connection opened\n\n'));
          if (live) controller.enqueue(encode.encode(`event: stats\ndata: ${JSON.stringify(stats())}\n\n`));
        },
        cancel() { streams.delete(sink); },
      });
      return new Response(body, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform' } });
    }
    return Response.json({ error: 'Unknown synthetic route' }, { status: 404 });
  },
});
const timer = setInterval(() => { if (live && !revoked) broadcast('stats', stats()); }, 5000);
console.log(`Synthetic live-update fixture at ${server.url}`);
process.on('SIGINT', () => { clearInterval(timer); server.stop(true); process.exit(0); });
