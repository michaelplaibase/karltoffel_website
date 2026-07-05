/**
 * Lokal server for HELE sitet (mirror + tilbudsmotor). Til QA lokalt:
 *   npm install && npm start   ->  http://localhost:3000
 * Paa Vercel bruges api/index.js i stedet (serverless).
 */
import { config } from './site/src/server/config.js';
import { createFullSiteApp } from './site/src/server/full-site.js';

const app = createFullSiteApp(config);
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`Karltoffel full site (mirror + tilbudsmotor) paa http://localhost:${port}`);
  console.log(`  tilbudsmotor:  http://localhost:${port}/tilbud`);
});
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => server.close(() => process.exit(0)));
