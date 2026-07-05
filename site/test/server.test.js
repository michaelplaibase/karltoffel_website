import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/server/app.js';
import { config } from '../src/server/config.js';

function fakeDeps() {
  const saved = [];
  const sentMail = [];
  return {
    saved,
    sentMail,
    deps: {
      addressProvider: {
        async suggest(q) {
          return q.includes('fejl') ? Promise.reject(new Error('down'))
            : [{ id: 'adr-1', tekst: 'Sundvej 8, 8700 Horsens' }];
        },
        async lookup(id) {
          return { id, betegnelse: 'Sundvej 8, 8700 Horsens', postnr: '8700', postnrnavn: 'Horsens', koordinater: { lat: 55.86, lon: 9.85 } };
        },
      },
      store: { newRef() { return 'K-TEST-0001'; }, async saveLead(l) { saved.push(l); return 'file'; } },
      mailer: { async sendLeadNotification(l) { sentMail.push(l); return { skipped: false, messageId: 'm1' }; } },
      workmaker: { configured: false, async createLead() { return { ok: false, skipped: true }; } },
      rateLimiter: { check() { return { allowed: true, remaining: 9 }; } },
    },
  };
}

async function withServer(deps, fn) {
  const app = createApp(config, deps);
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try { return await fn(base); } finally { await new Promise((r) => server.close(r)); }
}

const validLead = () => ({
  adresse: { id: 'adr-1', betegnelse: 'Sundvej 8, 8700 Horsens' },
  valg: [{ id: 'haek', qty: 65, freq: 1, on: true }],
  kontakt: { navn: 'Test Testesen', email: 'test@example.dk', tlf: '12345678', note: '', consent: true },
  firma: '',
});

test('GET /api/health responds ok', async () => {
  const { deps } = fakeDeps();
  await withServer(deps, async (base) => {
    const res = await fetch(base + '/api/health');
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
  });
});

test('GET /api/products returns the catalog', async () => {
  const { deps } = fakeDeps();
  await withServer(deps, async (base) => {
    const res = await fetch(base + '/api/products');
    const data = await res.json();
    assert.ok(Array.isArray(data.products));
    assert.ok(data.products.find((p) => p.id === 'haek'));
    assert.equal(typeof data.momsRate, 'number');
  });
});

test('GET /api/address/suggest returns suggestions', async () => {
  const { deps } = fakeDeps();
  await withServer(deps, async (base) => {
    const res = await fetch(base + '/api/address/suggest?q=Sundvej');
    const data = await res.json();
    assert.equal(data.suggestions.length, 1);
    assert.equal(data.suggestions[0].id, 'adr-1');
  });
});

test('GET /api/address/suggest surfaces provider failure as 502', async () => {
  const { deps } = fakeDeps();
  await withServer(deps, async (base) => {
    const res = await fetch(base + '/api/address/suggest?q=fejlgade');
    assert.equal(res.status, 502);
  });
});

test('POST /api/lead happy path stores + mails + returns ref and recomputed quote', async () => {
  const ctx = fakeDeps();
  await withServer(ctx.deps, async (base) => {
    const res = await fetch(base + '/api/lead', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(validLead()),
    });
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(data.ref, 'K-TEST-0001');
    assert.ok(data.quote.monthlyInclMoms > 0);
    assert.equal(ctx.saved.length, 1);
    assert.equal(ctx.sentMail.length, 1);
    // Server recomputed the price itself (not trusting client)
    assert.ok(ctx.saved[0].quote.annualInclMoms > 0);
  });
});

test('POST /api/lead honeypot is silently dropped', async () => {
  const ctx = fakeDeps();
  await withServer(ctx.deps, async (base) => {
    const body = { ...validLead(), firma: 'Spam Corp' };
    const res = await fetch(base + '/api/lead', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.dropped, true);
    assert.equal(ctx.saved.length, 0); // not stored
  });
});

test('POST /api/lead without consent is rejected 400', async () => {
  const ctx = fakeDeps();
  await withServer(ctx.deps, async (base) => {
    const body = validLead();
    body.kontakt.consent = false;
    const res = await fetch(base + '/api/lead', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.ok, false);
    assert.ok(data.errors.consent);
    assert.equal(ctx.saved.length, 0);
  });
});

test('POST /api/lead with bad email is rejected 400', async () => {
  const ctx = fakeDeps();
  await withServer(ctx.deps, async (base) => {
    const body = validLead();
    body.kontakt.email = 'not-an-email';
    const res = await fetch(base + '/api/lead', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.errors.email);
  });
});

test('POST /api/lead with no active service is rejected 400', async () => {
  const ctx = fakeDeps();
  await withServer(ctx.deps, async (base) => {
    const body = validLead();
    body.valg = [{ id: 'haek', qty: 0, freq: 1, on: true }]; // qty 0 -> inactive
    // turn every catalog default off so nothing is active
    body.valg = config.catalog.products.map((p) => ({ id: p.id, qty: p.defaultQty, freq: p.defaultFreq, on: false }));
    const res = await fetch(base + '/api/lead', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.errors.valg);
  });
});

test('response carries a strict Content-Security-Policy header', async () => {
  const { deps } = fakeDeps();
  await withServer(deps, async (base) => {
    const res = await fetch(base + '/api/health');
    const csp = res.headers.get('content-security-policy');
    assert.ok(csp && csp.includes("default-src 'self'"));
    assert.ok(!csp.includes('unsafe-inline'));
  });
});
