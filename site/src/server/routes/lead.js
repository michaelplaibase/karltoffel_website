import { Router } from 'express';
import { validateLead } from '../lib/validate.js';
import { computeQuote, mergeSelection } from '../../shared/pricing.js';

export function leadRouter({ config, store, mailer, workmaker, rateLimiter, addressProvider }) {
  const router = Router();

  // POST /api/lead
  router.post('/', async (req, res) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';

    // 1) Rate limit
    const rl = rateLimiter.check(ip);
    if (!rl.allowed) {
      res.set('Retry-After', String(Math.ceil((rl.retryAfterMs || 0) / 1000)));
      return res.status(429).json({ ok: false, error: 'rate_limited' });
    }

    const body = req.body || {};

    // 2) Honeypot: botter udfylder det skjulte felt "firma". Kvitter pænt, drop lead.
    if (String(body.firma || '').trim() !== '') {
      return res.status(200).json({ ok: true, ref: null, dropped: true });
    }

    // 3) Validér
    const v = validateLead(body);
    if (!v.ok) {
      return res.status(400).json({ ok: false, errors: v.errors });
    }

    // 4) Genberegn prisen SERVER-side ud fra betroet katalog (klientpris ignoreres)
    const merged = mergeSelection(config.catalog.products, body.valg);
    const quote = computeQuote(merged, {
      momsRate: config.momsRate,
      pricesIncludeMoms: config.pricesIncludeMoms,
    });

    if (quote.count < 1) {
      return res.status(400).json({ ok: false, errors: { valg: 'Vaelg mindst én ydelse med en maengde.' } });
    }

    // 5) Verificér adressen igen server-side (undgaa forfalskede adresser)
    let adresse = { id: String(body.adresse.id), betegnelse: String(body.adresse.betegnelse || '') };
    try {
      const looked = await addressProvider.lookup(adresse.id);
      adresse = { id: looked.id, betegnelse: looked.betegnelse, postnr: looked.postnr, postnrnavn: looked.postnrnavn, koordinater: looked.koordinater };
    } catch {
      // Kan ikke verificere nu (fx udbyder nede) - behold det klienten sendte, marker det.
      adresse.uverificeret = true;
    }

    // 6) Byg normaliseret lead
    const catById = new Map(config.catalog.products.map((p) => [p.id, p]));
    const valg = merged.map((m) => {
      const cat = catById.get(m.id);
      const line = quote.lines.find((l) => l.id === m.id);
      return {
        id: m.id,
        navn: cat?.navn,
        enhedKort: cat?.enhedKort,
        qty: m.qty,
        freq: m.freq,
        on: m.on,
        active: line?.active || false,
        annualInclMoms: line?.annualInclMoms || 0,
      };
    });

    const lead = {
      ref: store.newRef(),
      modtaget: new Date().toISOString(),
      kilde: 'tilbudsmotor',
      adresse,
      kontakt: v.clean.kontakt,
      valg,
      quote: {
        count: quote.count,
        minVisits: quote.minVisits,
        maxVisits: quote.maxVisits,
        annualInclMoms: quote.annualInclMoms,
        monthlyInclMoms: quote.monthlyInclMoms,
        annualExMoms: quote.annualExMoms,
        momsRate: quote.momsRate,
      },
      ip,
      userAgent: req.get('user-agent') || '',
    };

    // 7) Persistér FOERST (aldrig miste et lead), derefter mail + CRM (best effort)
    const integrations = {};
    try {
      await store.saveLead(lead);
      integrations.stored = true;
    } catch (err) {
      integrations.stored = false;
      integrations.storeError = err.message;
    }
    try {
      integrations.mail = await mailer.sendLeadNotification(lead);
    } catch (err) {
      integrations.mail = { error: err.message };
    }
    try {
      integrations.workmaker = await workmaker.createLead(lead);
    } catch (err) {
      integrations.workmaker = { ok: false, reason: err.message };
    }

    if (integrations.stored === false && !integrations.mail?.messageId) {
      // Alt fejlede - meld fejl saa kunden proever igen i stedet for at tro alt gik godt.
      return res.status(500).json({ ok: false, error: 'lead_not_captured' });
    }

    return res.status(201).json({
      ok: true,
      ref: lead.ref,
      quote: lead.quote,
    });
  });

  return router;
}
