const DKK0 = new Intl.NumberFormat('da-DK', { maximumFractionDigits: 0 });
const DKK2 = new Intl.NumberFormat('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const kr = (n) => `${DKK0.format(Math.round(n))} kr`;
export const kr2 = (n) => DKK2.format(n);

/** Besøg om året som tekst: ét tal hvis min==max, ellers et interval. */
export function visitsText(min, max) {
  if (max <= 0) return '0';
  return min === max ? String(min) : `${min}–${max}`;
}
