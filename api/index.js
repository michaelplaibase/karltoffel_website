/**
 * Vercel serverless-entry for HELE sitet (QA-klon).
 * Rutes alt hertil via vercel.json. Serverer mirror + tilbudsmotor.
 */
import { config } from '../site/src/server/config.js';
import { createFullSiteApp } from '../site/src/server/full-site.js';

export default createFullSiteApp(config);
