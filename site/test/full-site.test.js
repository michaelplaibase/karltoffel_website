import test from 'node:test';
import assert from 'node:assert/strict';
import { createFullSiteApp } from '../src/server/full-site.js';
import { config } from '../src/server/config.js';

const deps = {
  addressProvider: {
    async suggest() { return [{ id: 'adr-1', tekst: 'Sundvej 8, 8700 Horsens' }]; },
    async lookup(id) { return { id, betegnelse: 'Sundvej 8, 8700 Horsens', postnr: '8700', postnrnavn: 'Horsens', koordinater: { lat: 55.86, lon: 9.85 } }; },
  },
  store: { newRef() { return 'K-T'; }, async saveLead() { return 'f'; } },
  mailer: { async sendLeadNotification() { return { messageId: 'm' }; } },
  workmaker: { async createLead() { return { skipped: true }; } },
  rateLimiter: { check() { return { allowed: true }; } },
};

async function withServer(fn) {
  const app = createFullSiteApp(config, deps);
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try { return await fn(base); } finally { await new Promise((r) => server.close(r)); }
}

test('full site serves the mirror homepage', async () => {
  await withServer(async (base) => {
    const r = await fetch(base + '/');
    assert.equal(r.status, 200);
    assert.match(r.headers.get('content-type'), /text\/html/);
    const html = await r.text();
    assert.match(html, /karltoffel/i);
  });
});

test('full site serves wget querystring assets with correct type (both encodings)', async () => {
  await withServer(async (base) => {
    const enc = await fetch(base + '/style.css%3F282376887.css');
    assert.equal(enc.status, 200);
    assert.match(enc.headers.get('content-type'), /text\/css/);
    const raw = await fetch(base + '/script.js%3F282712716');
    assert.equal(raw.status, 200);
    assert.match(raw.headers.get('content-type'), /javascript/);
  });
});

test('missing thumbnail size falls back to an existing variant (no broken hero)', async () => {
  await withServer(async (base) => {
    // an implausible width that was never mirrored, but the hash exists
    const r = await fetch(base + '/f/thumb%3Fsrc=%252Ff%252Fpage%252F0ce9f916ffb7fb7d3d16bee0f4b84ee9bea2d2b0_thumb.jpg&w=99999&webp');
    assert.equal(r.status, 200);
    assert.match(r.headers.get('content-type'), /image\//);
  });
});

test('old quote form redirects to the new tilbudsmotor', async () => {
  await withServer(async (base) => {
    const r = await fetch(base + '/p/faa-et-tilbud.html', { redirect: 'manual' });
    assert.equal(r.status, 302);
    assert.equal(r.headers.get('location'), '/tilbud');
  });
});

test('tilbudsmotor is served at /tilbud with strict CSP, mirror has none', async () => {
  await withServer(async (base) => {
    const app = await fetch(base + '/tilbud');
    assert.equal(app.status, 200);
    assert.match(app.headers.get('content-security-policy') || '', /default-src 'self'/);
    const mirror = await fetch(base + '/');
    assert.equal(mirror.headers.get('content-security-policy'), null);
  });
});

test('tilbudsmotor assets and API work under the full site', async () => {
  await withServer(async (base) => {
    for (const [p, re] of [
      ['/css/styles.css', /text\/css/],
      ['/js/app.js', /javascript/],
      ['/shared/pricing.js', /javascript/],
      ['/vendor/dm-sans/latin-400.css', /text\/css/],
    ]) {
      const r = await fetch(base + p);
      assert.equal(r.status, 200, `${p} should be 200`);
      assert.match(r.headers.get('content-type'), re, `${p} type`);
    }
    const health = await fetch(base + '/api/health');
    const data = await health.json();
    assert.equal(data.ok, true);
    assert.equal(data.site, 'full');
  });
});
