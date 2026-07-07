# UI/UX-analyse — Karltoffel Tilbudsmotor v1

**Genstand:** `prototype/karltoffel-tilbudsmotor-v1.html` (single-file demo, 5-trins tilbudsflow)
**Dato:** 2026-07-07
**Metode:** Audit mod 8 UI-principper (Balance, Kontrast, Emphasis, Hierarki, Proportion, Repetition, White Space, Movement) og 4 UX-principper (Familiarity, Consistency, Forgiveness, Accessibility). Alle kontrastforhold beregnet mod WCAG 2.x relativ luminans; alle kodepåstande verificeret mod kilden.

---

## Sammenfatning

Prototypens instinkter er i topklasse: gravesekvensen, det globale `:focus-visible`, ja/nej-knapgrammatikken og det brun/gul-bærende look (10:1+ kontrast gratis fra brandet). Tre ting spærrer for A-niveau:

1. **Rene fejl, ikke smag** — servicerækkens grid har 5 børn i 4 kolonner (linje 95), så *prisen* — hele pointen med en prismotor — falder ned i en implicit anden række på desktop. Trin 3 er en envejsdør uden persistens. Man kan sende et tilbud på 0 kr for nul services.
2. **WCAG AA-brud** — adresse-autocomplete har nul tastaturunderstøttelse (ingen `keydown` i hele filen), den løbende pris annonceres aldrig til skærmlæsere, og formularfejl er lydløse.
3. **Manglende token-lag** — næsten hver craft-issue stammer fra værdier tastet i hånden i stedet for trukket fra en skala: fire hardkodede neutraler uden for `:root`, seks border-radius-værdier i et 10px-bånd, `opacity` brugt som semantisk dæmper (som selv forårsager flere af kontrastbruddene).

### Scorecard

| Kategori | Princip | Karakter |
|---|---|---|
| UI | Balance | C+ |
| UI | Kontrast | B |
| UI | Emphasis | B |
| UI | Hierarki | B− |
| UI | Proportion | C |
| UI | Repetition | B− |
| UI | White Space | B |
| UI | Movement | B+ |
| UX | Familiarity | B |
| UX | Consistency | C |
| UX | Forgiveness | D+ |
| UX | Accessibility | D |

---

## Prioriteret triage (gør disse først)

1. **Ret grid-fejlen i `.row`** — 5 børn, 4 kolonner (linje 95). Tilføj 5. `auto`-spor. *(Kritisk, layout)*
2. **Combobox-tastatur + Escape** på adressefeltet — WAI-ARIA APG-mønster. *(Kritisk, a11y)*
3. **`aria-live` på prisen** — én debounced status-region annoncerer "1.240 kr pr. måned, 6 services". *(Kritisk, a11y — WCAG 4.1.3)*
4. **`role="alert"` + `aria-invalid` + fokus** på formularfejl. *(Kritisk, a11y)*
5. **"Ret adresse"-udgang fra trin 3** uden at nulstille state. *(Kritisk, forgiveness)*
6. **Ret `.err`-kontrasten** (gul-på-rød 4,1:1). *(Kritisk, a11y — WCAG 1.4.3)*
7. **Deaktivér CTA ved 0 services** — stop et 0 kr-tilbud. *(Høj, forgiveness)*
8. **Fokusstyring i `visStep()`** — flyt fokus til trinnets overskrift. *(Høj, a11y)*
9. **Stop `opacity` som semantisk dæmper** — retter `.row.off`-, `.err`- og caption-kontrasten på én gang. *(Høj, a11y)*
10. **Tokenisér skyggepaletten** (#5A4322/#3A2A12/#E4DFC8/#8A7D5E) og kollaps radius/type-skalaen. *(Høj, craft)*
11. **Tilføj en trinindikator** — orientering i et 5-trins flow. *(Høj, familiarity)*
12. **Enter skal virke** — pak trin 4 i `<form>`; Enter vælger første forslag på trin 1. *(Høj, familiarity)*

---

# UI

## Balance — C+
Disciplineret symmetrisk skelet undermineret af en strukturel grid-defekt.

**Styrker**
- Hero (linje 40–43) er lærebogs-symmetrisk-aksial: centreret `h1`, `p.sub` kappet ved 520px, `.adr-wrap` ved 640px, alt i 1040px-kolonnen; `9vh/12vh` løfter blokken lidt over midten — korrekt optisk centrering.
- Header (linje 25) er ren asymmetrisk balance: 200px logomasse venstre, let pill-badge højre, `space-between`.
- `.cta-bar` deler samme 1040px-skinne som `main` (linje 30, 118–123), og `padding-bottom:120px` sikrer at baren aldrig dækker sidste række.
- `.topbar`s 4-kol `.fakta` + 3-kol `.regnestrimmel` med ens `gap` og delelinjer læses som ét stabilt kort.

**Issues**
- **Kritisk** — Desktop-gridet er brudt: 5 børn, 4 spor. `.row{grid-template-columns:auto 1fr auto auto}` (linje 95), men `renderRows()` tilføjer fem børn (chk, navn, qty, freq, pris, linje 502–503). `.pris` flyder ned i en implicit 2. række, kolonne 1. **Fix:** `grid-template-columns:auto 1fr auto auto auto` + `.row .qty{justify-self:end}`.
- **Høj** — Mobil-remap (linje 110) laver en død højre-rende (64px qty-input alene i `1fr`) og inverteret vægt (tunge steppere nederst-venstre, pris nederst-højre). **Fix:** `"chk navn" "chk qty" "chk freq" "pris pris"` + pris som fodlinje.
- **Medium** — Sticky `.topbar` + fixed `.cta-bar` klemmer indholdsbåndet på mobil til ~250px. **Fix:** kollaps sticky-kortet til adr-linje + "Pris pr. md" på mobil.
- **Lav** — `.regnestrimmel` giver en forældreløs celle på mobil (3 i `repeat(2,1fr)`, linje 114). Gør det bevidst: `div:last-child{grid-column:1/-1}` som totallinje.

## Kontrast — B
Det brun/gul-bærende par er glimrende (10:1+), men fejlbanner, placeholder og fravalgte rækker fejler alle AA — og `opacity`-vanen er skyld i det.

| Par | Forhold | Krav | Resultat |
|---|---|---|---|
| Ivory på brun (brødtekst) | 11,2:1 | 4,5:1 | ✅ |
| Gul på brun (h1, labels) | 10,2:1 | 4,5:1 | ✅ |
| Bronze på ivory (12px meta) | 5,5:1 | 4,5:1 | ✅ |
| Gul på rød (`.err`, 14px) | **4,1:1** | 4,5:1 | ❌ |
| Placeholder #8a7d5e på ivory (19px) | **4,0:1** | 4,5:1 | ❌ |
| `.row.off` navn (opacity .45) | **≈3,3:1** | 4,5:1 | ❌ |
| `.row.off` note (≈.34 komposit) | **≈2,7:1** | 4,5:1 | ❌ |
| Bronze-kant på brun (`.btn-nej`) | **2,6:1** | 3:1 (1.4.11) | ❌ |

**Styrker:** de to signaturpar er AAA på hver overskrift, label og den inverterede `.cta-bar`; størrelseskontrast i `.regnestrimmel` (12px label / 23px værdi) er stærk; det ivory `.topbar`-kort springer ~9:1 ud fra siden; fokus-outline er 10,2:1.

**Issues**
- **Kritisk** — `.kontakt .err` gul-på-rød 4,1:1 (linje 131). **Fix:** ivory panel med rød tekst + rød venstrekant: `background:var(--ivory);color:#B03A28;border-left:4px solid var(--roed)` (≈5,6:1).
- **Høj** — `.row.off{opacity:.45}` (linje 96) gør stadig-interaktive rækker ulæselige. **Fix:** cap ved `opacity:.7`, signalér "off" via checkbox + dæmpet baggrund, ikke global alpha.
- **Medium** — Placeholder 4,0:1 (linje 46). **Fix:** `#6e6349` (≈5,4:1).
- **Medium** — `.btn-nej` bronze-kant 2,6:1 vs 3:1-kravet for UI-komponenter (linje 75). **Fix:** `#A67C3B` (≈3,4:1).
- **Lav** — `.demo-hint`/`.gaps` består (5,5:1/6,4:1) men dobbelt-dæmper med både lille størrelse og fade. Vælg én løftestang.

## Emphasis — B
Trin 1, 2 og 4 har hver ét umiskendeligt fokuspunkt; trin 3 hedger.

**Styrker:** trin 1 er en model-single-focal-skærm (ét 640px-input på 11:1 mørk grund); primær/sekundær-knapgrammatik er korrekt og genbrugt; `.cta-bar`-inversionen gør konverteringsknappen til det eneste solid-brun-på-gul element; gravesekvensen forpligter sig fuldt.

**Issues**
- **Høj** — Trin 3's fokus splittes tre veje: sticky ivory `.topbar`, 23px `#t-pris` og gul `.cta-bar` med 24px `#cta-pris` — prisen printes to gange i næsten samme størrelse i hver sin ende. **Fix:** lad CTA-baren eje tallet; dæmp `.regnestrimmel span` til 17px.
- **Høj** — Trin 1 har ingen synlig handlingsaffordance (intet submit, ingen pil/lup); fremdrift afhænger af async-listen (linje 47, 339). **Fix:** absolut-positioneret gul pileknap i `.adr-wrap`, 48px.
- **Medium** — Rækkepriser vinder ikke deres egen række: `.row .pris b` 17px = `.row .navn b` 17px (linje 98, 107). **Fix:** `.row .pris b{font-size:20px;color:var(--gul)}`.
- **Medium** — Freq-stepperne er rækkens højeste elementer (18 gule blokke over 9 rækker, linje 103). **Fix:** outline-stil, reservér solid gul til primære CTA'er.
- **Lav** — `#btn-send`/`#btn-tilbage` er lige store på trin 4 (linje 247); "Tilbage" bør være et tekstlink.

## Hierarki — B−
Ren type-skala på trin 1→2→4→5, men trin 3 — pengeskærmen — er det eneste trin uden synlig overskrift.

**Styrker:** sammenhængende clamp-stige (h1 34–64 → verify 26–40 → kontakt 26–38 → tak 30–46); `.fakta` label/værdi-inversion (12px/500 over 16px/700) er forbilledlig; rækkens læserækkefølge matcher beslutningsrækkefølgen; hero `line-height:1.04` er stram og rigtig.

**Issues**
- **Høj** — Trin 3 har ingen synlig overskrift: `#h2l` skubbet off-screen (`left:-9999px`, linje 209), så prismotorens hele værdiforslag åbner koldt med et datakort. **Fix:** render overskriften i snaga-unicase/gul, fx "Din have, regnet ud".
- **Medium** — `.regnestrimmel b` forker fra `.fakta b` (letter-spacing `.04em` mangler, linje 85/88). **Fix:** én regel for begge.
- **Medium** — `.demo-hint` forurener summary-kortets hierarki inde i sticky-arealet (linje 226). **Fix:** flyt ned til `.gaps`.
- **Medium** — Måned/år-paret i `.pris` underdifferentierer (17px vs 11,5px @ .7). Sæt måned ≫ år.
- **Lav** — `#dig-msg` fast 26px uden clamp (linje 61) kan wrappe grimt. **Fix:** `clamp(20px,5vw,26px)`.

## Proportion — C
De store greb er rigtige, men værdiskalaen under er ad-hoc drift, ikke et system.

**Styrker:** hero H1/sub ~3,5:1 display-forhold; 200px logo vs 12px badge er korrekt dominans; `#adr-input` er passende overdimensioneret; 1040px-container konsistent.

**Issues**
- **Høj** — Seks border-radius-værdier i et 10px-bånd (8/10/12/14/16/18) er ikke en skala. **Fix:** tre tokens — `--r-sm:8px`, `--r-md:12px`, `--r-lg:16px` + `999px` pills.
- **Høj** — Brøk- og off-skala-fontstørrelser: 12,5px, 11,5px, 14,5px, og 23px 1px under CTA'ens 24px (samme pris-figur, to størrelser). **Fix:** type-skala 12/13/14/16/17/19/24.
- **Medium** — Spacing er 2px-granulær, ikke 8pt-grid. **Fix:** snap til 8/12/16/24/32/40.
- **Medium** — Input-padding afviger 25% mellem trin 1 (`20px 22px`) og trin 4 (`15px 16px`) — tyndere ved konverteringen. **Fix:** `.kontakt input{padding:16px 18px}`.
- **Lav** — Freq-knapper 34px fejler både gridet og 44px touch-målet. **Fix:** 40–44px.

## Repetition — B−
Stærke motiver (gul-på-brun, versal-labels, pills), men knapsystemet forker og fire skygge-hexes omgår tokens.

**Styrker:** label-motivet (12–13px versal + letter-spacing + gul/bronze) går igen fem steder; ét globalt `:focus-visible`; pill-formen (`999px`) genbrugt; ja/nej-parret genbrugt verbatim på trin 4.

**Issues**
- **Høj** — Fire hardkodede neutraler er en skyggepalette: `#5A4322` (kort), `#3A2A12` (dig-bar), `#E4DFC8` (kanter), `#8A7D5E` (placeholder) — bærende, men ingen i `:root`. **Fix:** promovér til `--brun-lys/--brun-moerk/--ivory-dim/--ivory-mut` og opdatér designsystemet.
- **Høj** — `.btn-cta` (linje 123) er en fork af `.btn` (linje 73): `15px 26px` vs `16px 30px`. Funnelens vigtigste knap bruger ikke knapsystemet. **Fix:** `class="btn btn-cta"`, lad modifieren kun bære farve.
- **Medium** — `.btn-nej`s 2px-kant gør den 4px højere end `.btn-ja` (linje 75). **Fix:** padding-kompensation.
- **Medium** — Letter-spacing på versal-motivet har fire værdier (.08/.1/.12/.04em). **Fix:** ét `--track-label:.08em`.
- **Lav** — `.dig-bar` bruger `99px` hvor alt andet bruger `999px` (linje 63).

## White Space — B
Hero og terminaltrin ånder smukt; trin 3 er hvor luften slipper op.

**Styrker:** hero `9vh/12vh` med 640px-blok; measure-kontrol (`max-width:520/560`); `padding-bottom:120px`-reserve gennemtænkt.

**Issues**
- **Høj** — Sticky `.topbar` er en pladssluger på trin 3 (~220–260px pinnet), mens `.cta-bar` pinner bunden; arbejdszonen for de 9 rækker bliver ~350px. **Fix:** kun en slank summary-strimmel skal sticke; drop top-sticky på mobil.
- **Medium** — `.losning{padding:28px 0 0}` (linje 80) mangler top-luft vs 6–12vh på hvert andet trin. **Fix:** `6vh`.
- **Medium** — `.row`-tætheden underbetjener de fire kolonner; på mobil læses qty/freq/pris som én udifferentieret blok. **Fix:** `padding:18px 20px` desktop; hairline-separator på mobil-fodlinjen.
- **Lav** — 4px optiske margener er spredte magiske tal (linje 44, 52, 93, 116). **Fix:** ét `--inset-text:4px`.

## Movement — B+
Bevægelse er formålsbestemt, on-brand og mest tilgængelig; fejlene er orienteringshuller og to bogstavelige bugs.

**Styrker:** `#dig`-overlayet er en signatur gjort rigtigt (digbob −9°→7° + 5 tekster + progress bar); reduced-motion håndteres i *begge* lag (CSS 34–37 + JS 396–397); `stepin` er retningsbestemt; `.cta-bar` er scoped til trin 3.

**Issues**
- **Høj** — `html{scroll-behavior:smooth}` (linje 18) neutraliseres ikke i reduced-motion-blokken. **Fix:** `html{scroll-behavior:auto}` i media queryen.
- **Medium** — Død kode: `"instant" in window ? "instant" : "auto"` (linje 418) er altid `auto`, så trinskift smooth-scroller og slås visuelt med slide-in. **Fix:** `behavior:"instant"`.
- **Medium** — Ingen trinindikator; slide-in gør orienteringsarbejde den ikke kan afslutte. **Fix:** lille versal-progress-række.
- **Lav** — `.cta-bar` teleporterer ind (`display:none→block`, linje 118). **Fix:** `translateY(100%)→0` over 250ms (reduced-motion-guarded).
- **Lav** — Under reduced-motion springes dig-overlayet helt over (linje 397), så de brugere aldrig ser adresse-bekræftelsen. **Fix:** vis statisk i ~800ms.

---

# UX

## Familiarity — B
Læner sig op ad velafprøvede e-commerce-mønstre, men udelader wizardens mest velkendte element (progress) og honorerer aldrig Enter.

**Styrker:** adresse-først-autocomplete (som rejseplanen/boliga); sticky bund-CTA med løbende total; +/− steppere med disabled-grænser; dig-overlayet læses som en branded loader (men er en fabrikeret 3,1s-forsinkelse der maskerer nul arbejde — tåleligt ved 3s, lad det ikke vokse).

**Issues**
- **Høj** — Ingen trin-/progress-indikator i et 5-trins flow — den #1 årsag til wizard-frafald. **Fix:** "Trin 2 af 5" drevet fra `visStep()`.
- **Høj** — Enter gør intet nogen steder (hverken trin 1 eller 4 er en `<form>`). **Fix:** pak trin 4 i `<form>`; Enter på trin 1 vælger første forslag.
- **Medium** — `fortsaet()` (linje 378) muterer brugerens forespørgsel i stedet for at vælge — magisk. **Fix:** stil de rækker som "Fortsæt: …".
- **Lav** — "Besøg om året" = `max(freq)` (linje 308); abonnementsvante brugere forventer additivt. **Fix:** forklar bundlingen i UI-copy.

## Consistency — C
Det visuelle system er disciplineret, men interaktionsgrammatikken driver.

**Styrker:** stram token-disciplin (hver farve er en var, matcher designsystemet); alle priser gennem to formatters (`kr()`/`DKK2`); ét trinskifte-kodespor.

**Issues**
- **Høj** — Qty (rå `type=number`) vs freq (steppere) bruger to input-modeller på samme række, 16px fra hinanden — samme operation, to mekanismer, kun den ene med grænse-feedback. **Fix:** vælg én model pr. begrænsningstype.
- **Høj** — `.btn-nej` betyder tre ting: afvisning ("Nej, prøv igen"), tilbage-nav ("Tilbage") og genbrugt container med inline-override. Afvis-der-sletter-data bør ikke dele stil med neutral tilbage. **Fix:** distinkte behandlinger.
- **Medium** — Primær-CTA inverterer farver på den vigtigste skærm (`.btn-ja` gul/brun vs `.btn-cta` brun/gul); "den gule knap fører fremad"-reglen brydes ved konverteringen. Desuden mangler `.btn-cta`/`.btn-nej` hover.
- **Medium** — Pris-label-ordlyd driver (fire fraseringer for to begreber). **Fix:** standardisér på "/md" og "/år".
- **Lav** — Tilbage-tilgængelighed er inkonsistent pr. trin (trin 3 har ingen).

## Forgiveness — D+
Steppere clamper, API-fejl degraderer pænt, state overlever tilbage-nav — men trin 3 er en envejsdør, "Nej" sletter input, og funnelen sender glad et 0 kr-tilbud.

**Styrker:** freq-steppere er fuldt fejlsikrede (grænser i både handler og disabled-state); state overlever tilbage-nav (verificeret: re-render fra muteret `PRODUCTS`); adresse-API-fejl fanges og falder til demo-liste + note; qty kan ikke gå negativ/NaN (`Math.max(0, …||0)`).

**Issues**
- **Kritisk** — Trin 3 er en envejsdør uden persistens (ingen localStorage); viser topbaren forkert adresse, er eneste udvej en hard refresh der nulstiller alt. **Fix:** "Ret adresse"-link i `.topbar` der kalder `visStep("step-adresse")` uden at rydde state.
- **Høj** — Man kan sende et tilbud for nul: fravælg alle 9 rækker → "0 kr/md · 0 services", CTA forbliver live, ingen guard på `r.count` (linje 425, 428). **Fix:** `btn-kontakt.disabled = r.count === 0` + microcopy.
- **Høj** — "Nej, prøv igen" sletter arbejdet: `adrInput.value = ""` (linje 424). **Fix:** bevar input, genåbn listen.
- **Medium** — E-mail-validering er `indexOf("@") < 1` (linje 430) — accepterer `a@`, `x@y`; én generisk fejl for to felter uden at pege på hvilket. **Fix:** `input.checkValidity()` + `aria-invalid` + fokus.
- **Medium** — Qty har ingen øvre grænse (linje 479); `1e9` giver et vanvittigt millionbeløb. **Fix:** per-produkt `qmax`.
- **Medium** — `adrFejl` er en permanent faldlem (linje 330/343/353): ét netværksblip og det rigtige API prøves aldrig igen i sessionen. **Fix:** retry efter N sekunder.

## Accessibility — D
Fundamentet viser reel intention, men autocomplete har nul tastatur-wiring, prisen annonceres aldrig, fejl er lydløse, og fokus tabes ved hvert trinskift. Flere WCAG 2.1/2.2 AA-brud.

**Styrker:** globalt `:focus-visible` (3px gul, høj kontrast); reduced-motion i CSS *og* JS; programmatiske navne forsøgt overalt (qty, steppere, demo-SVG `role="img"`); `role="status" aria-live="polite"` på dig-overlayet; `lang="da"` + sr-only h2.

**Issues**
- **Kritisk (2.1.1 / 4.1.2 / 1.4.13)** — Autocomplete er en listbox kun af navn: `role="listbox"`/`option` er stemplet på, men der er ikke en eneste `keydown` i filen — ingen Arrow/Enter/Escape, ingen `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`. **Fix:** implementér WAI-ARIA APG combobox-mønsteret.
- **Kritisk (4.1.3)** — Prisen annonceres aldrig: `#t-pris`/`#cta-pris` opdateres via `textContent` uden `aria-live` (linje 518–522). Hele kalkulatorens pointe er usynlig for skærmlæsere. **Fix:** én debounced `aria-live="polite" aria-atomic="true"`-region: "1.240 kr pr. måned, 6 services".
- **Kritisk (4.1.3 / 3.3.1)** — Formularfejlen er lydløs: `#k-err` vises via class-toggle uden `role="alert"`, uden `aria-invalid`/`aria-describedby`, uden fokusflyt (linje 430–431). **Fix:** `role="alert"` + markér fejlfelt + `focus()`.
- **Høj (2.4.3)** — Fokus tabes til `<body>` ved hvert trinskift; tastaturbrugere genstarter tabbing fra toppen (linje 414–421). **Fix:** `tabindex="-1"` på hvert trins overskrift + `.focus()`.
- **Høj (1.4.3)** — `.row.off` fejler kontrast (≈3,4:1 / ≈2,9:1) — men det er felter brugeren skal læse for at gentilvælge. **Fix:** cap dæmpning; dæmp kun pris-kolonnen.
- **Medium (4.1.2)** — Checkbox-labels bliver forældede og er miswired: `aria-label` sættes én gang til "Fravælg/Tilvælg + navn" (linje 469) og opdateres aldrig, så tilstand og navn modsiger hinanden efter klik. **Fix:** `aria-label = p.navn`.
- **Medium (2.5.5)** — 34px stepper-mål (linje 103) består 2.2's 24px men ligger under 44/48px-vejledningen på pengeskærmen; `aria-label` på plain `<div class="logo">` (linje 141) ignoreres af AT — tilføj `role="img"`; placeholder 4,0:1.

---

*Fremstillet som led i UI/UX-analysen af tilbudsmotor-prototypen. Alle linjenumre refererer til `prototype/karltoffel-tilbudsmotor-v1.html` på analysetidspunktet.*
