/**
 * Karltoffel tilbudsmotor - delt prismotor.
 *
 * Ren, sideeffekt-fri ES-modul der koeres IDENTISK i Node (serveren, som er
 * source of truth) og i browseren (til live-visning). Serveren genberegner
 * altid prisen her foer et lead gemmes, saa klienten aldrig kan forfalske en pris.
 *
 * Rettelser ift. v1-prototypen:
 *  - Besoeg/aar er nu et INTERVAL (minVisits = fuldt bundtet, maxVisits = intet bundtet)
 *    i stedet for et enkelt max-tal der systematisk undervurderede.
 *  - Moms haandteres eksplicit (kundevendte tal er inkl. moms).
 *  - Én afrundingskilde: totalen afrundes fra den eksakte sum, ikke fra summen
 *    af allerede afrundede linjer -> ingen 1-krones drift.
 *  - En tilvalgt ydelse uden maengde (qty <= 0) taeller ikke med, men markeres
 *    med needsQty saa UI kan bede om et tal.
 */

export const MOMS_RATE_DEFAULT = 0.25;

/** Laeg moms paa et beloeb, medmindre priserne allerede er inkl. moms. */
export function withMoms(amountExMoms, { pricesIncludeMoms = false, momsRate = MOMS_RATE_DEFAULT } = {}) {
  return pricesIncludeMoms ? amountExMoms : amountExMoms * (1 + momsRate);
}

/** Eksakt aarspris (ekskl. moms) for én produktlinje. */
export function lineAnnualExMoms(product) {
  const pris = Number(product.pris) || 0;
  const qty = Number(product.qty) || 0;
  const freq = Number(product.freq) || 0;
  return pris * qty * freq;
}

/** Er en linje aktiv (talt med i tilbuddet)? */
export function isActive(product) {
  return Boolean(product.on) && Number(product.qty) > 0 && Number(product.freq) > 0;
}

/**
 * Beregn et komplet tilbud.
 * @param {Array} products - liste af {id, pris, qty, freq, on}
 * @param {object} opts - {momsRate, pricesIncludeMoms}
 */
export function computeQuote(products, opts = {}) {
  const momsRate = Number.isFinite(opts.momsRate) ? opts.momsRate : MOMS_RATE_DEFAULT;
  const pricesIncludeMoms = Boolean(opts.pricesIncludeMoms);
  const cfg = { momsRate, pricesIncludeMoms };

  let annualExMoms = 0;
  let count = 0;
  const freqs = [];
  const lines = [];

  for (const p of products) {
    const exact = lineAnnualExMoms(p);
    const active = isActive(p) && exact > 0;
    const lineEx = active ? exact : 0;
    const lineIncl = withMoms(lineEx, cfg);
    lines.push({
      id: p.id,
      active,
      // needsQty: brugeren har sat flueben, men ikke angivet en maengde
      needsQty: Boolean(p.on) && !(Number(p.qty) > 0),
      annualExMoms: lineEx,
      annualInclMoms: lineIncl,
      monthlyInclMoms: lineIncl / 12,
    });
    if (!active) continue;
    annualExMoms += exact;
    count += 1;
    freqs.push(Number(p.freq));
  }

  const annualInclMoms = withMoms(annualExMoms, cfg);
  // Besoeg/aar som interval:
  //  - minVisits: alt kan bundtes paa den hyppigste ydelses besoeg (best case)
  //  - maxVisits: ingen bundtning, hver ydelse koerer for sig (worst case)
  const minVisits = freqs.length ? Math.max(...freqs) : 0;
  const maxVisits = freqs.reduce((a, b) => a + b, 0);

  return {
    count,
    minVisits,
    maxVisits,
    annualExMoms,
    annualInclMoms,
    monthlyInclMoms: annualInclMoms / 12,
    momsRate,
    pricesIncludeMoms,
    lines,
  };
}

/**
 * Fletter en klient-payload (kun id/qty/freq/on) sammen med de betroede
 * produktdefinitioner fra serveren. Ukendte id'er ignoreres; priser tages
 * ALTID fra kataloget, aldrig fra klienten.
 */
export function mergeSelection(catalog, selection) {
  const bySelId = new Map((selection || []).map((s) => [s.id, s]));
  return catalog.map((prod) => {
    const sel = bySelId.get(prod.id);
    const clampFreq = (f) => {
      const n = Math.round(Number(f));
      if (!Number.isFinite(n)) return prod.defaultFreq;
      return Math.min(prod.freqMax, Math.max(prod.freqMin, n));
    };
    return {
      id: prod.id,
      pris: prod.pris, // betroet
      qty: sel ? Math.max(0, Number(sel.qty) || 0) : prod.defaultQty,
      freq: sel ? clampFreq(sel.freq) : prod.defaultFreq,
      on: sel ? Boolean(sel.on) : prod.defaultOn,
    };
  });
}
