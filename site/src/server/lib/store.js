/**
 * Lead-persistering. Hvert lead skrives som en JSON-fil i LEAD_STORE_DIR, saa
 * ingen henvendelse gaar tabt - ogsaa selvom mail eller WorkMaker fejler.
 * (Til stoerre volumen: skift til en database bag samme interface.)
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

export function createStore(config) {
  const dir = config.leadStoreDir;
  return {
    /** Generér en menneske-laesbar reference, fx K-20260705-3F9A2C. */
    newRef() {
      const d = new Date();
      const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
      const rand = randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
      return `K-${ymd}-${rand}`;
    },

    async saveLead(lead) {
      await mkdir(dir, { recursive: true });
      const file = join(dir, `${lead.ref}.json`);
      await writeFile(file, JSON.stringify(lead, null, 2), 'utf8');
      return file;
    },
  };
}
