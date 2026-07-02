# Karltoffel designsystem + content-inventory
Kilde: karltoffel-mirror.zip (205 filer, 41 MB), analyseret 2026-07-02.

## 1. Farver (fra --theme-vars i style.css)
| Token | Hex | Brug |
|---|---|---|
| Primær brun | #4C3718 | Baggrund, headings, tekst (52 forekomster) |
| Accent gul | #FFF87B | Kort, knapper, headings på brun (35) |
| Ivory | #FFFFF0 | Lys baggrund, inputfelter |
| Bronze | #86612A / #8A6931 | Card-accent, knap-ikoner |
| Fejlrød | #CC4B37 | Formularvalidering |
| Neutrale | #CACACA, #E6E6E6, #8A8A8A | Borders, disabled |

Kontrastpar: brun-på-gul og gul-på-brun er sitets bærende look.

## 2. Typografi
| Rolle | Font | Kilde | Licens |
|---|---|---|---|
| Display/headings | snaga-unicase-display | Adobe Fonts kit: use.typekit.net/qfz3lyk.css | Kræver aktivt Adobe Fonts-abonnement. Kit-URL kan genbruges |
| Brødtekst | DM Sans | Google Fonts | Fri |
| Sekundær (importeret) | Hanken Grotesk | Google Fonts | Fri |
| Ikoner | Font Awesome 6 Sharp (selfhosted woff2) | I mirror under /assets/fontawesome/6.6.0/ | Sharp = Pro-licens. Skal bekræftes, ellers skift til fri variant |

## 3. Brand-assets (klar til genbrug, ligger i mirror /f/design/)
karltoffel-logo.svg, karltoffel-logo-gul.svg, favicon.png, appicon.png, texture.png (papirtekstur), kartoffelhalv-ny.png, ikon_ristet.svg

## 4. Tone of voice (eksempler fra sitet)
- H1: "Fast hus- og haveservice til heldige karltofler"
- "Mindre bøvl. Mere overskud"
- "Det gør ikke noget, at naboen bliver grøn af misundelse"
- "Din have ringede. Den har brug for vores hjælp."
- Meta: "Vi holder hus og have skarpt, så du kan bruge tiden på noget sjovere."

Stil: legende, korte sætninger, kartoffel-ordspil, du-form.

## 5. Sidestruktur (23 sider)
**Nav:** Det vi ordner, Pakker & priser, Erhverv, Gavekort, Om Karltoffel

**/p/ (8):** forside (=index), det-vi-ordner, pakker-priser, erhverv, faa-et-tilbud, om-karltoffel, handelsbetingelser, cookiepolitik

**/c/det-vi-ordner/ (14 ydelser):** vinduesvask, haekklipning, ukrudtsbekaempelse, graespleje, algerens, beskaering, bortskaffelse-haveaffald, solcellevask, fliserens, tagrenderens, soignering-af-bede, robotplaeneklipper-service, vask-hus-garage-ned, gavekort

**Pakker (13):** Sæsonpakken, Skræddersy selv, All inclusive, Villapakken, Sommerhuspakken, Nulstillingspakken, Fotopakken, Nabopakken, Basispakken, Forårspakken, Efterårspakken, Festpakken, Erhvervspakken. Prisformater i HTML: kr/år, kr pr/gang, "Fra 199 kr pr/gang".

## 6. Bekræftede fund i mirror
1. Tilbudsformularens "Service/pakke"-dropdown indeholder statisk kun gavekort-valg + "Andet?". Ydelses-checkboxene (felt 35[]) er tomme i HTML. Tidligere provisorisk fund er nu bekræftet: formularen JS-populeres eller er reelt død for alt andet end gavekort.
2. Pakkerne deler identisk ydelsesindhold på tværs af pristrin (kendt fejl, stadig live).
3. script.js (872 KB) er builder-runtime + Leaflet + Fancybox. Ingen prislogik at genbruge. Genbruges ikke.
4. style.css er 614 KB compiled builder-CSS. Vi genbruger tokens og assets, ikke filen.

## 7. Genbrugsstrategi til ny build
- Genbrug: farvetokens, fonte (via Adobe-kit), logo/tekstur-assets, tone of voice, sidestruktur og al tekst fra /c/-siderne
- Byg nyt: al HTML/CSS/JS, tilbudsflow, pakkelogik
- Afvent: rigtige priser fra WorkMaker Produkter (CSV undervejs)
