import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(__dirname, '..', '..');

function bool(v, fallback = false) {
  if (v === undefined) return fallback;
  return /^(1|true|yes|on)$/i.test(String(v).trim());
}
function num(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

const catalog = JSON.parse(readFileSync(join(ROOT, 'data', 'products.json'), 'utf8'));

export const config = {
  port: num(process.env.PORT, 3000),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Prislogik
  momsRate: num(process.env.MOMS_RATE, catalog.momsRate ?? 0.25),
  pricesIncludeMoms: bool(process.env.PRICES_INCLUDE_MOMS, catalog.pricesIncludeMoms ?? false),

  // Adresseudbyder: 'dawa' (gratis, live til 01.10.2026) eller 'adressevaelger' (KDS-afloeser)
  addressProvider: process.env.ADDRESS_PROVIDER || 'dawa',
  adressevaelgerToken: process.env.ADRESSEVAELGER_TOKEN || '',

  // Lead-modtagelse. Paa Vercel er projekt-filsystemet read-only; kun /tmp kan
  // skrives (efemert - fint til QA/demo). Default derfor til /tmp der.
  leadStoreDir: process.env.LEAD_STORE_DIR || (process.env.VERCEL ? '/tmp/leads' : join(ROOT, 'data', 'leads')),
  leadEmailTo: process.env.LEAD_EMAIL_TO || '',
  leadEmailFrom: process.env.LEAD_EMAIL_FROM || 'tilbud@karltoffel.dk',

  // SMTP (valgfrit - uden dette logges mails som JSON i stedet for at sendes)
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: num(process.env.SMTP_PORT, 587),
    secure: bool(process.env.SMTP_SECURE, false),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },

  // WorkMaker CRM (endnu ubekraeftet API - adapter er stubbet indtil dette saettes)
  workmaker: {
    apiUrl: process.env.WORKMAKER_API_URL || '',
    apiKey: process.env.WORKMAKER_API_KEY || '',
  },

  // Rate limiting for lead-endpoint
  rateLimit: {
    windowMs: num(process.env.RATE_WINDOW_MS, 10 * 60 * 1000),
    max: num(process.env.RATE_MAX, 5),
  },

  catalog,
};

/** Produktdefinitioner (uden metafelter). */
export function getProducts() {
  return config.catalog.products;
}
