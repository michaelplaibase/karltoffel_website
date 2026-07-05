# Karltoffel Tilbudsmotor — production build

Produktionsklar udgave af tilbudsmotoren: statisk frontend + Node/Express-backend.
Afløser prototypen i `../prototype/karltoffel-tilbudsmotor-v1.html`.

Al forretningslogik (priser, validering, leads) afgøres **server-side** — klienten
kan ikke forfalske en pris, og ingen API-nøgler havner i browseren.

## Kom i gang

```bash
cd site
npm install
cp .env.example .env      # ret værdierne
npm start                 # -> http://localhost:3000
```

Uden `.env`: `npm run start:noenv` (kører på fornuftige defaults; leads gemmes
lokalt, men mailes ikke før `LEAD_EMAIL_TO`/SMTP er sat).

```bash
npm test                  # node:test — prismotor + API (20 tests)
```

## Arkitektur

```
site/
  data/products.json        WorkMaker-priser (snapshot 02.07.2026) + moms-config
  src/
    shared/pricing.js       Ren prismotor — kører IDENTISK i browser og server
    server/
      app.js                Express-app (helmet/CSP, static, ruter) — dep-injectable
      index.js              Bootstrap
      config.js             Env -> config
      routes/               address · products · lead
      lib/                  address-provider · property-provider · workmaker ·
                            mailer · store · validate · rate-limit
    client/                 index.html · css · js (ES-moduler, ingen build-step)
  test/                     pricing.test.js · server.test.js
```

### API

| Metode | Sti | Formål |
|---|---|---|
| GET | `/api/health` | Sundhedstjek |
| GET | `/api/products` | Katalog + moms-regler til klientens live-visning |
| GET | `/api/address/suggest?q=` | Adresseforslag (server-proxy til DAWA) |
| GET | `/api/address/lookup?id=` | Verificér én adresse + koordinater |
| POST | `/api/lead` | Validér, genberegn pris, gem, mail, WorkMaker |

## Hvad prototypens audit påpegede — og hvad der er rettet

| Problem i v1 | Status |
|---|---|
| Ingen backend / leads blev smidt væk | **Rettet** — leads valideres, genberegnes, **gemmes** (JSON pr. lead) og mailes; WorkMaker-adapter klar |
| API-token i klientens JS | **Rettet** — alle eksterne kald er server-side; ingen token i browseren |
| Falsk adresseopslag (opdigtet endpoint/token) | **Rettet** — rigtig DAWA-integration, pluggbar til Adressevælgeren |
| `besøg/år = max(freq)` undervurderede | **Rettet** — vises nu som interval (min = bundtet, maks = usammenlagt), fx `16–29` |
| Ingen moms | **Rettet** — kundevendte priser vises inkl. moms (konfigurerbart) |
| Afrundingsdrift mellem linjer og total | **Rettet** — totalen afrundes fra den eksakte sum |
| Tilvalgt ydelse med mængde 0 talte forkert | **Rettet** — tælles ikke med, markeres “angiv mængde” |
| Fravalgt række viste stadig fuld pris | **Rettet** — inaktive rækker viser “—” |
| Svag e-mail-validering, ingen honeypot/GDPR | **Rettet** — server-validering, honeypot, rate limit, samtykke-checkbox |
| Ufuldstændig ARIA-combobox, ingen fokus-styring | **Rettet** — fuld combobox (pil/Enter/Esc, activedescendant) + fokus på trinskift |
| Latent XSS (`innerHTML` fra produktfeed) | **Rettet** — al DOM bygges med `textContent`/`createElement` |
| Google/Adobe-fonte (GDPR/licens) | **Delvist** — DM Sans self-hostet (GDPR ok). Se “Åbne beslutninger” |
| Ingen CSP/sikkerhedsheaders | **Rettet** — helmet med streng CSP uden `unsafe-inline` |

## Ærlighed om data (vigtigt)

- **Havemål er estimater, kunden bekræfter.** Hækmeter og plæneareal — de to
  største prisdrivere — findes **ikke** i BBR/Matriklen. Vi opdigter dem ikke:
  adressen verificeres, og målene præsenteres som redigerbare estimater. `property-provider.js`
  har en dokumenteret stub til fremtidig BBR-berigelse (kræver Datafordeler-adgang).
- **Priser er et estimat.** Enhedspriser er ægte (WorkMaker), men enhederne er
  tolket ud fra produktnavne og afventer bekræftelse (se nedenfor).

## Åbne beslutninger / eksterne blokkere (kan ikke løses i kode)

1. **Enheder + moms** — bekræft med Thomas hvad hver WorkMaker-enhed dækker, og
   om priserne er inkl./ekskl. moms (`PRICES_INCLUDE_MOMS`). Flytter kundepriser.
2. **WorkMaker skrive-API** — ubekræftet om det findes. `lib/workmaker.js` aktiveres
   automatisk når `WORKMAKER_API_URL`/`_KEY` sættes; indtil da gemmes+mailes leads.
3. **Adresse efter 01.10.2026** — DAWA lukker. Sæt `ADDRESS_PROVIDER=adressevaelger`
   + token når det tildeles (adapter ligger klar).
4. **BBR/Matriklen/skråfoto** — kræver Datafordeler/Dataforsyning-credentials
   (uger om ansøgning) for at auto-udfylde mål og vise rigtige skråfotos.
5. **Display-font** — “snaga-unicase-display” er proprietær (Adobe). Enten licensér
   kittet til produktions-domænet eller vælg en fri erstatning; pt. fallback til DM Sans.
6. **3 ydelser mangler pris** (fliserens, soignering af bede, robotplæneklipper) +
   pakker/Gavekort/Erhverv er ikke modelleret endnu (kataloget er config-drevet, så
   det er let at udvide — pakker anbefales som presets over samme motor).

## Deployment-noter

- Kør bag en reverse proxy (nginx/Caddy) med TLS. `trust proxy` er slået til.
- Sæt SMTP + `LEAD_EMAIL_TO` så leads mailes; `data/leads/` bør ligge på persistent volume.
- CSP er self-contained — tilføj kun nye origins hvis du bevidst tilføjer eksterne assets.
- Fonte serveres pt. fra `node_modules/@fontsource/dm-sans`. Til en ren build kan de
  kopieres ind i et `public/`-artefakt (fx med esbuild/vite) — ikke påkrævet for at køre.
