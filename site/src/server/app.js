import express from 'express';
import helmet from 'helmet';
import { join } from 'node:path';
import { ROOT } from './config.js';
import { createAddressProvider } from './lib/address-provider.js';
import { createWorkMaker } from './lib/workmaker.js';
import { createMailer } from './lib/mailer.js';
import { createStore } from './lib/store.js';
import { createRateLimiter } from './lib/rate-limit.js';
import { addressRouter } from './routes/address.js';
import { productsRouter } from './routes/products.js';
import { leadRouter } from './routes/lead.js';

/**
 * Byg Express-appen. Afhaengigheder kan injiceres (til test); ellers bygges
 * de rigtige udgaver ud fra config.
 */
export function createApp(config, deps = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // bag reverse proxy: korrekt req.ip

  // Sikkerhedsheaders + streng CSP. Alt (JS/CSS/fonte) er self-hosted, saa
  // vi behoever hverken unsafe-inline eller eksterne origins.
  app.use(
    helmet({
      contentSecurityPolicy: {
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
      },
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use(express.json({ limit: '32kb' }));

  // Afhaengigheder
  const addressProvider = deps.addressProvider || createAddressProvider(config);
  const store = deps.store || createStore(config);
  const mailer = deps.mailer || createMailer(config);
  const workmaker = deps.workmaker || createWorkMaker(config);
  const rateLimiter = deps.rateLimiter || createRateLimiter(config.rateLimit);

  // Sundhedstjek
  app.get('/api/health', (_req, res) => res.json({ ok: true, provider: config.addressProvider }));

  // API
  app.use('/api/address', addressRouter({ addressProvider }));
  app.use('/api/products', productsRouter({ config }));
  app.use('/api/lead', leadRouter({ config, store, mailer, workmaker, rateLimiter, addressProvider }));

  // Statiske filer
  const clientDir = join(ROOT, 'src', 'client');
  const sharedDir = join(ROOT, 'src', 'shared');
  const fontDir = join(ROOT, 'node_modules', '@fontsource', 'dm-sans');
  app.use('/shared', express.static(sharedDir, { extensions: ['js'] }));
  app.use('/vendor/dm-sans', express.static(fontDir));
  app.use(express.static(clientDir, { extensions: ['html'] }));

  // API 404 (skal ikke ramme SPA-fallback)
  app.use('/api', (_req, res) => res.status(404).json({ error: 'not_found' }));

  return app;
}
