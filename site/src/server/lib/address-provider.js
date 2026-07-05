/**
 * Adresseudbyder - pluggbar.
 *
 * DAWA (api.dataforsyningen.dk) er gratis, token-loes og live til 01.10.2026.
 * Klimadatastyrelsens "Adressevaelger" er den officielle afloeser; adapteren
 * ligger klar og vaelges med ADDRESS_PROVIDER=adressevaelger naar token findes.
 *
 * Alle kald sker SERVER-side, saa ingen token/nyckel havner i browseren.
 * Node >= 18 har global fetch.
 */

const DAWA_BASE = 'https://api.dataforsyningen.dk';
const UA = 'karltoffel-tilbudsmotor/1.0';

async function fetchJson(url, { timeoutMs = 6000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} fra ${new URL(url).host}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

/* ------------------------------- DAWA ------------------------------- */

const dawa = {
  /** Autocomplete-forslag. Returnerer [{ id, tekst }]. */
  async suggest(q) {
    const url = `${DAWA_BASE}/adresser/autocomplete?q=${encodeURIComponent(q)}&per_side=8`;
    const data = await fetchJson(url);
    return (Array.isArray(data) ? data : [])
      .map((item) => ({
        id: item?.adresse?.id || '',
        adgangsadresseid: item?.adresse?.adgangsadresseid || '',
        tekst: item?.tekst || item?.forslagstekst || '',
      }))
      .filter((x) => x.id && x.tekst);
  },

  /** Slaa en enkelt adresse op paa id og returnér struktureret info. */
  async lookup(id) {
    const url = `${DAWA_BASE}/adresser/${encodeURIComponent(id)}?struktur=mini`;
    const a = await fetchJson(url);
    return {
      id: a.id,
      adgangsadresseid: a.adgangsadresseid || '',
      betegnelse: a.betegnelse || a.tekst || '',
      vejnavn: a.vejnavn || '',
      husnr: a.husnr || '',
      postnr: a.postnr || '',
      postnrnavn: a.postnrnavn || '',
      kommune: a.kommunekode || '',
      // WGS84 (lon/lat) fra DAWA mini-struktur
      koordinater: (a.x != null && a.y != null) ? { lon: Number(a.x), lat: Number(a.y) } : null,
    };
  },
};

/* --------------------------- Adressevaelger ------------------------- */
/* Stub: KDS' Adressevaelger. Udfyld naar token er tildelt (efter DAWA lukker). */

function makeAdressevaelger(token) {
  const BASE = 'https://adressevaelger.dk';
  return {
    async suggest(q) {
      const url = `${BASE}/husnumre/soeg?token=${encodeURIComponent(token)}&maksimum=8&tekst=${encodeURIComponent(q)}`;
      const data = await fetchJson(url);
      const fund = (data && Array.isArray(data.fund)) ? data.fund : [];
      return fund
        .filter((f) => f.type === 'husnummer')
        .map((f) => ({ id: f.id || f.titel, adgangsadresseid: f.id || '', tekst: f.titel }))
        .filter((x) => x.tekst);
    },
    async lookup(id) {
      const url = `${BASE}/husnumre/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}`;
      const a = await fetchJson(url);
      return {
        id,
        adgangsadresseid: id,
        betegnelse: a.betegnelse || a.titel || '',
        vejnavn: a.vejnavn || '',
        husnr: a.husnummer || '',
        postnr: a.postnr || '',
        postnrnavn: a.postnrnavn || '',
        kommune: a.kommunekode || '',
        koordinater: (a.x != null && a.y != null) ? { lon: Number(a.x), lat: Number(a.y) } : null,
      };
    },
  };
}

/** Vaelg udbyder ud fra config. */
export function createAddressProvider(config) {
  if (config.addressProvider === 'adressevaelger') {
    if (!config.adressevaelgerToken) {
      throw new Error('ADDRESS_PROVIDER=adressevaelger kraever ADRESSEVAELGER_TOKEN');
    }
    return makeAdressevaelger(config.adressevaelgerToken);
  }
  return dawa;
}

export { dawa };
