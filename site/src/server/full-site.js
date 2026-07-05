/**
 * FULL-SITE app (QA-klon): serverer HELE det klonede karltoffel.dk (mirror/)
 * PLUS den nye tilbudsmotor paa /tilbud, i én Express-app.
 *
 * - Mirror serveres paa / (alle /p/, /c/, /assets, /f ...).
 * - Tilbudsmotoren paa /tilbud (dens assets ligger paa /css /js /shared /vendor,
 *   som ikke kolliderer med mirror-stierne).
 * - "Faa et tilbud" i det gamle site redirecter til /tilbud.
 *
 * wget-artefakt: mange mirror-filer har '?' i selve filnavnet (fx
 * "style.css?282376887.css"). serveMirror() slaar dem op via den RAA URL, saa
 * det virker uanset om hosten beholder %3F kodet eller afkoder til '?'.
 *
 * Den oprindelige createApp() (tilbudsmotor alene) er urørt - dette er en
 * separat sammensætning til QA-deployet.
 */
import express from 'express';
import helmet from 'helmet';
import { existsSync, statSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, sep } from 'node:path';
import { createRequire } from 'node:module';
import { createAddressProvider } from './lib/address-provider.js';
import { createWorkMaker } from './lib/workmaker.js';
import { createMailer } from './lib/mailer.js';
import { createStore } from './lib/store.js';
import { createRateLimiter } from './lib/rate-limit.js';
import { addressRouter } from './routes/address.js';
import { productsRouter } from './routes/products.js';
import { leadRouter } from './routes/lead.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const CLIENT_DIR = join(__dirname, '..', 'client');
const SHARED_DIR = join(__dirname, '..', 'shared');
const FONT_DIR = dirname(require.resolve('@fontsource/dm-sans/package.json'));
// mirror/ ligger i repo-roden (to niveauer over site/)
const MIRROR_DIR = process.env.MIRROR_DIR || join(__dirname, '..', '..', '..', 'mirror', 'karltoffel.dk');

const STRICT_CSP = {
  useDefaults: false,
  directives: {
    'default-src': ["'self'"],
    'script-src': ["'self'"],
    'style-src': ["'self'"],
    'img-src': ["'self'", 'data:'],
    'font-src': ["'self'"],
    'connect-src': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
  },
};

// Stier der hoerer til den nye tilbudsmotor (faar streng CSP).
function isAppPath(p) {
  return (
    p === '/tilbud' || p.startsWith('/tilbud/') || p.startsWith('/api') ||
    p.startsWith('/css') || p.startsWith('/js') || p.startsWith('/shared') ||
    p.startsWith('/vendor') || p === '/favicon.png' || p === '/appicon.png'
  );
}

/** Gæt content-type ud fra et wget-filnavn (evt. med '?...' i navnet). */
function guessType(name) {
  if (/\.css(\?|$)/i.test(name)) return 'text/css; charset=utf-8';
  if (/(^|\/)script\.js|\.m?js(\?|$)/i.test(name)) return 'application/javascript; charset=utf-8';
  if (/webp/i.test(name)) return 'image/webp';
  if (/\.png/i.test(name)) return 'image/png';
  if (/\.jpe?g/i.test(name)) return 'image/jpeg';
  if (/\.svg/i.test(name)) return 'image/svg+xml';
  if (/\.woff2/i.test(name)) return 'font/woff2';
  if (/\.ico/i.test(name)) return 'image/x-icon';
  return null;
}

function resolveWithin(base, rel) {
  const full = resolve(base, rel.replace(/^\/+/, ''));
  const rb = resolve(base);
  return full === rb || full.startsWith(rb + sep) ? full : null;
}

/**
 * Indeks over thumbnail-varianter i /f, keyed paa billed-hash -> stoerste variant.
 * wget hentede ikke alle srcset-stoerrelser, saa manglende stoerrelser (fx hero)
 * faldback'er til den stoerste tilgaengelige variant af samme billede.
 */
let thumbIndex = null;
function getThumbIndex(mirrorDir) {
  if (thumbIndex) return thumbIndex;
  thumbIndex = new Map();
  try {
    for (const name of readdirSync(join(mirrorDir, 'f'))) {
      const m = name.match(/([0-9a-f]{16,})_thumb\.(jpe?g|png)/i);
      if (!m) continue;
      const hash = m[1].toLowerCase();
      const w = Number((name.match(/w=(\d+)/) || [])[1] || 0);
      const cur = thumbIndex.get(hash);
      if (!cur || w > cur.w) thumbIndex.set(hash, { file: join(mirrorDir, 'f', name), w });
    }
  } catch { /* ingen /f - lad indeks vaere tomt */ }
  return thumbIndex;
}

/** Middleware der serverer mirroret, inkl. filnavne med '?' i sig. */
function serveMirror(mirrorDir) {
  const staticMw = express.static(mirrorDir, { extensions: ['html'], index: 'index.html' });
  const serveThumbFallback = (rel, res) => {
    const m = rel.match(/([0-9a-f]{16,})_thumb\.(jpe?g|png)/i);
    if (!m) return false;
    const alt = getThumbIndex(mirrorDir).get(m[1].toLowerCase());
    if (!alt || !existsSync(alt.file)) return false;
    res.type(guessType(alt.file) || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=3600');
    res.sendFile(alt.file);
    return true;
  };
  return (req, res, next) => {
    const raw = (req.originalUrl || req.url).split('#')[0];
    if (raw.includes('%3F') || raw.includes('%3f') || raw.includes('?')) {
      let rel;
      try { rel = decodeURIComponent(raw); } catch { rel = raw; }
      const full = resolveWithin(mirrorDir, rel);
      if (full && existsSync(full) && statSync(full).isFile()) {
        const type = guessType(rel);
        if (type) res.type(type);
        res.set('Cache-Control', 'public, max-age=3600');
        return res.sendFile(full);
      }
      // Manglende thumbnail-stoerrelse -> stoerste tilgaengelige variant
      if (serveThumbFallback(rel, res)) return;
      return next();
    }
    return staticMw(req, res, next);
  };
}

export function createFullSiteApp(config, deps = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // Streng CSP paa tilbudsmotoren; loesere headers (ingen CSP) paa mirroret,
  // som er et gammelt builder-site med inline scripts + eksterne kald.
  const strict = helmet({ contentSecurityPolicy: STRICT_CSP, crossOriginEmbedderPolicy: false });
  const loose = helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false, crossOriginResourcePolicy: false });
  app.use((req, res, next) => (isAppPath(req.path) ? strict : loose)(req, res, next));

  app.use(express.json({ limit: '32kb' }));

  // Afhaengigheder (samme som tilbudsmotoren)
  const addressProvider = deps.addressProvider || createAddressProvider(config);
  const store = deps.store || createStore(config);
  const mailer = deps.mailer || createMailer(config);
  const workmaker = deps.workmaker || createWorkMaker(config);
  const rateLimiter = deps.rateLimiter || createRateLimiter(config.rateLimit);

  // ---- Tilbudsmotor-API ----
  app.get('/api/health', (_req, res) => res.json({ ok: true, provider: config.addressProvider, site: 'full' }));
  app.use('/api/address', addressRouter({ addressProvider }));
  app.use('/api/products', productsRouter({ config }));
  app.use('/api/lead', leadRouter({ config, store, mailer, workmaker, rateLimiter, addressProvider }));

  // ---- Tilbudsmotor-frontend (paa /tilbud) ----
  app.get(['/tilbud', '/tilbud/'], (_req, res) => res.sendFile(join(CLIENT_DIR, 'index.html')));
  app.use('/css', express.static(join(CLIENT_DIR, 'css')));
  app.use('/js', express.static(join(CLIENT_DIR, 'js')));
  app.use('/shared', express.static(SHARED_DIR, { extensions: ['js'] }));
  app.use('/vendor/dm-sans', express.static(FONT_DIR));
  app.get('/favicon.png', (_req, res) => res.sendFile(join(CLIENT_DIR, 'favicon.png')));
  app.get('/appicon.png', (_req, res) => res.sendFile(join(CLIENT_DIR, 'appicon.png')));

  // ---- Broer fra det gamle site ----
  // Gammel tilbudsformular -> ny tilbudsmotor
  app.get('/p/faa-et-tilbud.html', (_req, res) => res.redirect(302, '/tilbud'));
  // Tilbudsmotorens samtykke-link -> mirrorets handelsbetingelser
  app.get('/handelsbetingelser', (_req, res) => res.redirect(302, '/p/handelsbetingelser.html'));

  // ---- Mirror (hele det klonede site) som fallback ----
  app.use(serveMirror(MIRROR_DIR));

  return app;
}

export { MIRROR_DIR };
