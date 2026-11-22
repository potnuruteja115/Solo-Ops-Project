import test, { before } from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

let cookie = '';

/** fetch() that sends the session cookie obtained in `before`. */
function api(url, init = {}) {
  return fetch(url, { ...init, headers: { ...(init.headers || {}), cookie } });
}

before(async () => {
  const res = await fetch(`${BASE_URL}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', email: 'demo@soloops.app', password: 'soloops-demo' }),
  });
  assert.equal(res.status, 200, 'demo login must succeed for the test run');
  cookie = (res.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).join('; ');
});


test('POST /api/parse returns 400 when rawInput is missing', async () => {
  const res = await api(`${BASE_URL}/api/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.equal(res.status, 400);
});

test('POST /api/followup returns 404 for unknown entryId', async () => {
  const res = await api(`${BASE_URL}/api/followup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entryId: 'non-existent-id', tone: 'polite' }),
  });
  assert.equal(res.status, 404);
});

test('GET /api/overview returns 200 with ranked clients', async () => {
  const res = await api(`${BASE_URL}/api/overview`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.clients));
  assert.ok(data.clients.length >= 4);
});

test('GET /api/learning-curve returns 200 with cached stages', async () => {
  const res = await api(`${BASE_URL}/api/learning-curve`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.cached, true);
  assert.ok(Array.isArray(data.stages));
  assert.equal(data.stages.length, 3);
});

test('GET /api/receivables returns aging, queue and forecast', async () => {
  const res = await api(`${BASE_URL}/api/receivables?asOf=2026-11-22`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.asOf, '2026-11-22');
  assert.equal(data.aging.length, 5);
  assert.deepEqual(
    data.forecast.map((f) => f.horizonDays),
    [30, 60, 90]
  );
  assert.ok(Array.isArray(data.queue));
});

test('Receivables aging moves invoices into later buckets as time passes', async () => {
  const res = await api(`${BASE_URL}/api/receivables?asOf=2027-03-01`);
  const data = await res.json();
  const over90 = data.aging.find((b) => b.key === 'd90_plus');
  assert.ok(over90.count >= 1);
  assert.ok(data.summary.totalOverdue >= over90.amount);
});

test('Receivables ignores an invalid asOf date instead of failing', async () => {
  const res = await api(`${BASE_URL}/api/receivables?asOf=not-a-date`);
  assert.equal(res.status, 200);
});

test('CSV export quotes cells and is served as an attachment', async () => {
  const res = await api(`${BASE_URL}/api/ledger?format=csv`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-disposition') || '', /attachment/);
  const text = await res.text();
  assert.ok(text.split('\n')[1].startsWith('"'));
});

const json = (body) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

test('GET /api/promises returns promises, notes and stats for a client', async () => {
  const res = await api(`${BASE_URL}/api/promises?clientId=client-verve-commerce`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.promises.length >= 2);
  assert.ok(data.notes.length >= 1);
  assert.ok(data.stats.broken >= 1);
  assert.equal(data.stats.keepRate, 0);
});

test('Overdue pending promises are reported as broken automatically', async () => {
  const res = await api(`${BASE_URL}/api/promises?clientId=client-verve-commerce`);
  const data = await res.json();
  const utr = data.promises.find((p) => p.id === 'prm-2');
  assert.equal(utr.status, 'broken');
});

test('Promise lifecycle: create, mark kept, delete', async () => {
  const created = await api(
    `${BASE_URL}/api/promises`,
    json({ clientId: 'client-aerogrid-systems', text: 'Test promise', dueDate: '2026-12-31' })
  );
  assert.equal(created.status, 201);
  const { promise } = await created.json();
  assert.equal(promise.status, 'pending');

  const patched = await api(`${BASE_URL}/api/promises`, {
    ...json({ id: promise.id, status: 'kept' }),
    method: 'PATCH',
  });
  assert.equal(patched.status, 200);
  assert.equal((await patched.json()).promise.status, 'kept');

  const del = await api(`${BASE_URL}/api/promises?id=${promise.id}`, { method: 'DELETE' });
  assert.equal(del.status, 200);
});

test('POST /api/promises validates input', async () => {
  assert.equal((await api(`${BASE_URL}/api/promises`, json({}))).status, 400);
  assert.equal(
    (await api(`${BASE_URL}/api/promises`, json({ clientId: 'nope', text: 'x' }))).status,
    404
  );
  const bad = await api(`${BASE_URL}/api/promises`, {
    ...json({ id: 'prm-1', status: 'maybe' }),
    method: 'PATCH',
  });
  assert.equal(bad.status, 400);
});

test('POST /api/debrief validates input', async () => {
  assert.equal((await api(`${BASE_URL}/api/debrief`, json({}))).status, 400);
  const unknown = await api(
    `${BASE_URL}/api/debrief`,
    json({ clientId: 'nope', rawNotes: 'hello', outcome: 'advanced' })
  );
  assert.equal(unknown.status, 404);
});

test('POST /api/debrief saves the note even if extraction is unavailable', async () => {
  const res = await api(
    `${BASE_URL}/api/debrief`,
    json({
      clientId: 'client-novahealth-digital',
      rawNotes: 'Quick catch up. They will share the retainer budget soon.',
      outcome: 'advanced',
      date: '2026-11-22',
    })
  );
  assert.equal(res.status, 201);
  const data = await res.json();
  assert.ok(data.note.id);
  assert.ok(Array.isArray(data.promises));
  // restore seed data so test runs stay repeatable
  await api(`${BASE_URL}/api/ledger`, json({ action: 'reset' }));
});

test('POST /api/memory searches local history without Hindsight', async () => {
  assert.equal((await api(`${BASE_URL}/api/memory`, json({}))).status, 400);
  const res = await api(
    `${BASE_URL}/api/memory`,
    json({ clientId: 'client-verve-commerce', query: 'payment finance' })
  );
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.local.length >= 1);
});

test('Receivables forecast uses promise history to lower a broken-promise client', async () => {
  const res = await api(`${BASE_URL}/api/receivables?asOf=2026-11-22`);
  const data = await res.json();
  const verve = data.queue.find((q) => q.entry.id === 'inv-1002');
  assert.ok(verve.reliabilityScore < 44);
});

const post = (body, method = 'POST') => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
const resetSeed = () => api(`${BASE_URL}/api/ledger`, post({ action: 'reset' }));

// ---------- Route protection ----------

test('Protected APIs answer 401 without a session', async () => {
  for (const path of ['/api/ledger', '/api/receivables', '/api/settings', '/api/promises']) {
    const res = await fetch(`${BASE_URL}${path}`);
    assert.equal(res.status, 401, `${path} should require login`);
  }
});

test('Protected pages redirect to /login without a session', async () => {
  const res = await fetch(`${BASE_URL}/app`, { redirect: 'manual' });
  assert.ok([307, 308].includes(res.status));
  assert.match(res.headers.get('location') || '', /\/login/);
});

test('Old ?demo=true links start a demo session via /demo', async () => {
  const res = await fetch(`${BASE_URL}/app?demo=true`, { redirect: 'manual' });
  assert.match(res.headers.get('location') || '', /\/demo/);
  const demo = await fetch(`${BASE_URL}/demo?next=/app`, { redirect: 'manual' });
  assert.ok((demo.headers.getSetCookie?.() || []).some((c) => c.startsWith('soloops_session=') || c.includes('=')));
});

test('/demo ignores unsafe redirect targets', async () => {
  const demo = await fetch(`${BASE_URL}/demo?next=https://evil.example`, { redirect: 'manual' });
  assert.ok(!(demo.headers.get('location') || '').includes('evil.example'));
});

test('Login does not accept a wrong password for the demo user', async () => {
  const res = await fetch(`${BASE_URL}/api/auth`, post({ action: 'login', email: 'demo@soloops.app', password: 'nope' }));
  assert.equal(res.status, 401);
});

// ---------- Settings and GSTIN ----------

test('GET /api/settings returns the profile without the password hash', async () => {
  const res = await api(`${BASE_URL}/api/settings`);
  assert.equal(res.status, 200);
  const { user } = await res.json();
  assert.equal(user.email, 'demo@soloops.app');
  assert.equal('passwordHash' in user, false);
});

test('PATCH /api/settings validates GSTIN, UPI and numeric limits', async () => {
  const badGstin = await api(`${BASE_URL}/api/settings`, post({ gstin: '37AABCT1234F1Z5' }, 'PATCH'));
  assert.equal(badGstin.status, 400);
  assert.equal((await api(`${BASE_URL}/api/settings`, post({ upiId: 'not-upi' }, 'PATCH'))).status, 400);
  assert.equal((await api(`${BASE_URL}/api/settings`, post({ defaultTaxRate: 99 }, 'PATCH'))).status, 400);
  assert.equal((await api(`${BASE_URL}/api/settings`, post({ invoicePrefix: 'bad prefix!' }, 'PATCH'))).status, 400);
});

test('PATCH /api/settings saves valid changes and logs activity', async () => {
  const res = await api(`${BASE_URL}/api/settings`, post({ businessName: 'Teja Digital Labs LLP', lateFeePercent: 2 }, 'PATCH'));
  assert.equal(res.status, 200);
  assert.equal((await res.json()).user.businessName, 'Teja Digital Labs LLP');
  const act = await (await api(`${BASE_URL}/api/activity`)).json();
  assert.ok(act.events.some((e) => e.kind === 'settings'));
  await resetSeed();
});

// ---------- Recurring invoices ----------

test('Recurring: month-end schedule generates the right invoices once', async () => {
  const created = await api(
    `${BASE_URL}/api/recurring`,
    post({
      clientId: 'client-novahealth-digital',
      description: 'Test retainer',
      amount: 10000,
      taxRate: 18,
      frequency: 'monthly',
      startDate: '2026-01-31',
      termsDays: 7,
    })
  );
  assert.equal(created.status, 201);

  const run = await (await api(`${BASE_URL}/api/recurring`, post({ action: 'run', asOf: '2026-03-31' }))).json();
  assert.equal(run.count, 3);
  assert.deepEqual(run.generated.map((e) => e.date), ['2026-01-31', '2026-02-28', '2026-03-31']);
  assert.equal(run.generated[0].totalAmount, 11800);
  assert.equal(run.generated[0].dueDate, '2026-02-07');

  const again = await (await api(`${BASE_URL}/api/recurring`, post({ action: 'run', asOf: '2026-03-31' }))).json();
  assert.equal(again.count, 0, 'running twice must not duplicate invoices');
  await resetSeed();
});

test('Recurring: validation and pause', async () => {
  assert.equal((await api(`${BASE_URL}/api/recurring`, post({}))).status, 400);
  const badFreq = await api(
    `${BASE_URL}/api/recurring`,
    post({ clientId: 'client-novahealth-digital', description: 'x', amount: 5, frequency: 'daily', startDate: '2026-01-01' })
  );
  assert.equal(badFreq.status, 400);
  const paused = await api(`${BASE_URL}/api/recurring`, post({ id: 'rec-kora-retainer', active: false }, 'PATCH'));
  assert.equal(paused.status, 200);
  const run = await (await api(`${BASE_URL}/api/recurring`, post({ action: 'run', asOf: '2027-06-01' }))).json();
  assert.equal(run.count, 0, 'paused schedules do not generate');
  await resetSeed();
});

// ---------- Analytics, alerts, reports ----------

test('GET /api/analytics returns KPIs, monthly P&L and concentration', async () => {
  const data = await (await api(`${BASE_URL}/api/analytics?asOf=2026-11-22`)).json();
  assert.equal(data.monthly.length, 6);
  assert.equal(data.monthly[5].month, '2026-11');
  assert.equal(data.kpis.netProfit, data.kpis.totalInvoiced - data.kpis.totalExpenses);
  assert.ok(['low', 'moderate', 'high'].includes(data.concentration.level));
  const shareSum = data.revenueByClient.reduce((s, c) => s + c.share, 0);
  assert.ok(shareSum >= 98 && shareSum <= 102);
});

test('GET /api/alerts flags overdue invoices and sorts by severity', async () => {
  const data = await (await api(`${BASE_URL}/api/alerts?asOf=2026-12-15`)).json();
  assert.ok(data.alerts.some((a) => a.id === 'overdue-inv-1002'));
  const order = { critical: 0, warning: 1, info: 2 };
  const ranks = data.alerts.map((a) => order[a.severity]);
  assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b));
});

test('Alerts: GSTR-3B reminder appears near the 20th', async () => {
  const data = await (await api(`${BASE_URL}/api/alerts?asOf=2026-11-18`)).json();
  assert.ok(data.alerts.some((a) => a.id === 'gst-2026-10'));
});

test('GET /api/reports validates type and month', async () => {
  assert.equal((await api(`${BASE_URL}/api/reports?type=nope`)).status, 400);
  assert.equal((await api(`${BASE_URL}/api/reports?type=gst&month=2026-13`)).status, 400);
});

test('GET /api/reports serves GST, P&L and aging as CSV attachments', async () => {
  for (const type of ['gst', 'pnl', 'aging']) {
    const res = await api(`${BASE_URL}/api/reports?type=${type}&asOf=2026-11-22`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /text\/csv/);
    assert.match(res.headers.get('content-disposition') || '', /attachment/);
  }
  const gst = await (await api(`${BASE_URL}/api/reports?type=gst&month=2026-11`)).text();
  const rows = gst.split('\n').slice(1);
  assert.ok(rows.length >= 1 && rows.every((r) => r.includes('2026-11')));
});

test('Late fees accrue on overdue invoices in the aging report', async () => {
  const data = await (await api(`${BASE_URL}/api/receivables?asOf=2026-12-15`)).json();
  assert.ok(data.summary.accruedLateFees > 0);
  const item = data.queue.find((q) => q.entry.id === 'inv-1002');
  assert.ok(item.lateFee > 0);
});

// ---------- Ask your books, status, activity ----------

test('POST /api/ask validates the question', async () => {
  assert.equal((await api(`${BASE_URL}/api/ask`, post({}))).status, 400);
  assert.equal((await api(`${BASE_URL}/api/ask`, post({ question: 'x'.repeat(501) }))).status, 400);
});

test('GET /api/status reports integrations without leaking keys', async () => {
  const text = await (await api(`${BASE_URL}/api/status`)).text();
  const data = JSON.parse(text);
  assert.equal(typeof data.groq, 'boolean');
  assert.equal(typeof data.hindsight, 'boolean');
  assert.ok(!/gsk_|hsk_/.test(text));
});

test('Ledger changes are written to the activity log', async () => {
  const created = await api(`${BASE_URL}/api/ledger`, post({ type: 'invoice', partyName: 'Audit Co', amount: 1000, taxRate: 18 }));
  assert.equal(created.status, 201);
  const { entry } = await created.json();
  await api(`${BASE_URL}/api/ledger`, post({ id: entry.id, status: 'paid' }, 'PATCH'));
  const { events } = await (await api(`${BASE_URL}/api/activity?limit=10`)).json();
  assert.ok(events.some((e) => e.kind === 'payment' && e.refId === entry.id));
  assert.ok(events.some((e) => e.kind === 'entry' && e.refId === entry.id));
  await resetSeed();
});

test('Ledger CSV neutralises spreadsheet formulas', async () => {
  const created = await api(`${BASE_URL}/api/ledger`, post({ type: 'expense', partyName: '=HYPERLINK("http://x")', amount: 10 }));
  assert.equal(created.status, 201);
  const csv = await (await api(`${BASE_URL}/api/ledger?format=csv`)).text();
  assert.ok(csv.includes(`"'=HYPERLINK`));
  assert.ok(!csv.includes(',"=HYPERLINK'));
  await resetSeed();
});
