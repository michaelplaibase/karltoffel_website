import { config } from './config.js';
import { createApp } from './app.js';

const app = createApp(config);

const server = app.listen(config.port, () => {
  console.log(`Karltoffel tilbudsmotor koerer paa http://localhost:${config.port}`);
  console.log(`  adresseudbyder: ${config.addressProvider}`);
  console.log(`  moms: ${(config.momsRate * 100).toFixed(0)}% (priser inkl. moms: ${config.pricesIncludeMoms})`);
  if (!config.leadEmailTo) console.log('  ADVARSEL: LEAD_EMAIL_TO ikke sat - leads gemmes lokalt men mailes ikke.');
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => server.close(() => process.exit(0)));
}
