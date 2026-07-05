/**
 * WorkMaker CRM-adapter (lead + tilbud).
 *
 * STATUS: Det er endnu UBEKRAEFTET om WorkMaker udstiller et skrivbart API til
 * oprettelse af leads/tilbud. Indtil WORKMAKER_API_URL + WORKMAKER_API_KEY er sat,
 * springer adapteren over (leadet er stadig gemt lokalt + sendt paa mail, saa
 * intet gaar tabt). Naar API'et er bekraeftet, implementeres kaldet herunder -
 * resten af systemet behoever ingen aendringer.
 */

export function createWorkMaker(config) {
  const { apiUrl, apiKey } = config.workmaker;
  const configured = Boolean(apiUrl && apiKey);

  return {
    configured,

    /**
     * @param {object} lead - normaliseret lead (se routes/lead.js)
     * @returns {Promise<{ok:boolean, skipped?:boolean, id?:string, reason?:string}>}
     */
    async createLead(lead) {
      if (!configured) {
        return { ok: false, skipped: true, reason: 'WorkMaker API ikke konfigureret' };
      }
      // TODO: bekraeft endpoint-kontrakt med WorkMaker og map felter praecist.
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      try {
        const res = await fetch(`${apiUrl.replace(/\/$/, '')}/leads`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            source: 'tilbudsmotor',
            reference: lead.ref,
            name: lead.kontakt.navn,
            email: lead.kontakt.email,
            phone: lead.kontakt.tlf,
            address: lead.adresse.betegnelse,
            note: lead.kontakt.note,
            quote: lead.quote,
            services: lead.valg,
          }),
          signal: ctrl.signal,
        });
        if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
        const data = await res.json().catch(() => ({}));
        return { ok: true, id: data.id || null };
      } catch (err) {
        return { ok: false, reason: err.message };
      } finally {
        clearTimeout(t);
      }
    },
  };
}
