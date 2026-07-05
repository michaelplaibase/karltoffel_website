/**
 * Vercel serverless-entry.
 *
 * Vercel koerer ikke en langtidslevende server (app.listen). I stedet
 * eksporteres Express-appen som handler, og alle stier rutes hertil via
 * vercel.json (rewrites). Den lokale `npm start` (src/server/index.js) er
 * uaendret - dette er kun en ekstra indgang til samme app.
 */
import { config } from '../src/server/config.js';
import { createApp } from '../src/server/app.js';

export default createApp(config);
