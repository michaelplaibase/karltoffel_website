/**
 * Server-side validering af lead-payloads. Klienten valideres ogsaa, men
 * serveren er den der beslutter - stol aldrig paa klientens input.
 */

// Pragmatisk e-mail-tjek (fuld RFC er ikke maalet): noget@noget.tld
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Dansk telefon: 8 cifre, evt. +45/mellemrum.
const PHONE_RE = /^(\+?45)?[\s]?(\d[\s]?){8}$/;

export function validateLead(body) {
  const errors = {};
  const b = body || {};
  const kontakt = b.kontakt || {};

  const navn = String(kontakt.navn || '').trim();
  if (navn.length < 2) errors.navn = 'Skriv dit fulde navn.';
  if (navn.length > 120) errors.navn = 'Navnet er for langt.';

  const email = String(kontakt.email || '').trim();
  if (!EMAIL_RE.test(email)) errors.email = 'Skriv en gyldig e-mail.';

  const tlf = String(kontakt.tlf || '').trim();
  if (tlf && !PHONE_RE.test(tlf)) errors.tlf = 'Telefonnummeret ser ikke rigtigt ud (8 cifre).';

  const note = String(kontakt.note || '');
  if (note.length > 2000) errors.note = 'Beskeden er for lang.';

  if (kontakt.consent !== true) errors.consent = 'Vi skal have dit samtykke for at kontakte dig.';

  if (!b.adresse || !String(b.adresse.id || '').trim()) {
    errors.adresse = 'Vaelg en adresse fra listen.';
  }

  if (!Array.isArray(b.valg)) {
    errors.valg = 'Ingen ydelser modtaget.';
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    clean: {
      kontakt: { navn, email, tlf, note: note.trim(), consent: true },
    },
  };
}
