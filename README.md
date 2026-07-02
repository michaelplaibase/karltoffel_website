# Karltoffel Web

Rebuild af karltoffel.dk med tilbudsmotor som kerne. CRM bygges ovenpaa (Fenster-kerne + WorkMaker lead/tilbud).

## Struktur
- `mirror/` : wget-scrape af det gamle site (reference, rettes ikke)
- `docs/` : designsystem, farver, fonte, sidestruktur, content-inventory
- `prototype/` : tilbudsmotor v1, single-file HTML med rigtige WorkMaker-priser
- `site/` : det nye site bygges her (oprettes af Claude Code)

## Koer mirroret lokalt
```
cd mirror && python3 -m http.server 8000
```
Aabn http://localhost:8000/karltoffel.dk/

## Noeglebeslutninger
- Adresseopslag: Adressevaelgeren (Klimadatastyrelsen), DAWAs officielle afloeser. DAWA lukker 01.10.2026
- Priser: WorkMaker Produkter er source of truth (CSV 02.07.2026 indlagt i prototypen)
- Enheder pr. produkt er tolket ud fra navne og afventer bekraeftelse fra Thomas
