import { Router } from 'express';
import { buildPropertyContext } from '../lib/property-provider.js';

export function addressRouter({ addressProvider }) {
  const router = Router();

  // GET /api/address/suggest?q=Sundvej
  router.get('/suggest', async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (q.length < 3) return res.json({ suggestions: [] });
    try {
      const suggestions = await addressProvider.suggest(q);
      res.json({ suggestions });
    } catch (err) {
      // Aerlig fejl - klienten viser en pæn besked og lader brugeren proeve igen.
      res.status(502).json({ error: 'address_provider_unavailable', message: err.message });
    }
  });

  // GET /api/address/lookup?id=<adresse-id>
  router.get('/lookup', async (req, res) => {
    const id = String(req.query.id || '').trim();
    if (!id) return res.status(400).json({ error: 'missing_id' });
    try {
      const address = await addressProvider.lookup(id);
      res.json({ address, property: buildPropertyContext(address) });
    } catch (err) {
      res.status(502).json({ error: 'address_provider_unavailable', message: err.message });
    }
  });

  return router;
}
