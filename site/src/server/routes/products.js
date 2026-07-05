import { Router } from 'express';

export function productsRouter({ config }) {
  const router = Router();

  // GET /api/products - katalog + prisregler til klientens live-visning.
  router.get('/', (_req, res) => {
    res.json({
      momsRate: config.momsRate,
      pricesIncludeMoms: config.pricesIncludeMoms,
      products: config.catalog.products.map((p) => ({
        id: p.id,
        navn: p.navn,
        kategori: p.kategori,
        enhed: p.enhed,
        enhedKort: p.enhedKort,
        pris: p.pris,
        note: p.note,
        maalHjaelp: p.maalHjaelp,
        defaultQty: p.defaultQty,
        defaultFreq: p.defaultFreq,
        freqMin: p.freqMin,
        freqMax: p.freqMax,
        defaultOn: p.defaultOn,
      })),
      unpricedServices: config.catalog.unpricedServices,
    });
  });

  return router;
}
