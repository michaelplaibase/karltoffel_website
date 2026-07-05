/**
 * Ejendomsdata-udbyder.
 *
 * VIGTIGT / aerlighed: Haekmeter og plaeneareal - de to stoerste prisdrivere -
 * findes IKKE i noget offentligt register (BBR/Matriklen). De maa udledes af
 * geometri (matrikelpolygon minus bygningsfootprint), estimeres fra luftfoto,
 * eller bekraeftes af kunden. Derfor leverer denne udbyder KUN den verificerede
 * adresse + koordinater, og maengderne praesenteres i UI som redigerbare estimater
 * kunden bekraefter. Ingen opdigtede BBR-tal.
 *
 * BBR-felter (boligtype, opfoerelsesaar, boligareal) kraever Datafordeler-
 * credentials (uger om ansoegning). Adapteren nedenfor er en dokumenteret stub.
 */

/**
 * @param {object} address - resultat fra address-provider.lookup()
 * @returns bekraeftet ejendoms-kontekst (kun verificerede felter)
 */
export function buildPropertyContext(address) {
  return {
    adresse: address.betegnelse,
    postnr: address.postnr,
    postnrnavn: address.postnrnavn,
    koordinater: address.koordinater,
    // Maal er estimater kunden justerer - vi paastaar ikke at kende dem.
    maalErEstimat: true,
    kilde: 'Adresse verificeret via adresseregister. Havemaal er start-estimater du selv retter.',
    // Stub for fremtidig BBR-berigelse (kraever Datafordeler-adgang):
    bbr: null,
  };
}
