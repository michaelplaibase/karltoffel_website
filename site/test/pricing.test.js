import test from 'node:test';
import assert from 'node:assert/strict';
import { computeQuote, mergeSelection, withMoms, lineAnnualExMoms } from '../src/shared/pricing.js';

const DEFAULTS = [
  { id: 'haek', pris: 58.75, qty: 65, freq: 1, on: true },
  { id: 'graes', pris: 1.60, qty: 450, freq: 16, on: true },
  { id: 'vinduer', pris: 15.30, qty: 14, freq: 6, on: true },
  { id: 'alge', pris: 3.30, qty: 60, freq: 1, on: true },
  { id: 'ukrudt', pris: 1.50, qty: 60, freq: 4, on: true },
  { id: 'tagrender', pris: 18.00, qty: 24, freq: 1, on: true },
];

test('lineAnnualExMoms multiplies pris*qty*freq', () => {
  assert.equal(lineAnnualExMoms({ pris: 58.75, qty: 65, freq: 1 }), 3818.75);
});

test('withMoms adds moms unless prices already include it', () => {
  assert.equal(withMoms(100, { pricesIncludeMoms: false, momsRate: 0.25 }), 125);
  assert.equal(withMoms(100, { pricesIncludeMoms: true, momsRate: 0.25 }), 100);
});

test('computeQuote: default active total (ex moms) is exact', () => {
  const q = computeQuote(DEFAULTS, { momsRate: 0.25, pricesIncludeMoms: false });
  assert.equal(q.annualExMoms, 17613.95);
  assert.equal(q.count, 6);
});

test('computeQuote: moms applied to headline figures', () => {
  const q = computeQuote(DEFAULTS, { momsRate: 0.25, pricesIncludeMoms: false });
  assert.ok(Math.abs(q.annualInclMoms - 22017.4375) < 1e-6);
  assert.ok(Math.abs(q.monthlyInclMoms - 22017.4375 / 12) < 1e-6);
});

test('computeQuote: visits is a range (min=max freq, max=sum freq)', () => {
  const q = computeQuote(DEFAULTS, {});
  assert.equal(q.minVisits, 16);              // max single frequency
  assert.equal(q.maxVisits, 1 + 16 + 6 + 1 + 4 + 1); // 29, sum of frequencies
});

test('computeQuote: an "on" service with qty 0 is not counted but flagged needsQty', () => {
  const items = [...DEFAULTS, { id: 'solcelle', pris: 25, qty: 0, freq: 1, on: true }];
  const q = computeQuote(items, {});
  assert.equal(q.count, 6); // solcelle excluded
  const line = q.lines.find((l) => l.id === 'solcelle');
  assert.equal(line.active, false);
  assert.equal(line.needsQty, true);
  assert.equal(line.annualInclMoms, 0);
});

test('computeQuote: off services contribute nothing', () => {
  const items = DEFAULTS.map((p) => ({ ...p, on: false }));
  const q = computeQuote(items, {});
  assert.equal(q.count, 0);
  assert.equal(q.annualExMoms, 0);
  assert.equal(q.minVisits, 0);
  assert.equal(q.maxVisits, 0);
});

test('mergeSelection clamps freq to [freqMin, freqMax] and takes pris from catalog only', () => {
  const catalog = [
    { id: 'graes', pris: 1.60, defaultQty: 450, defaultFreq: 16, freqMin: 1, freqMax: 26, defaultOn: true },
  ];
  // Client tries an out-of-range freq and a fake cheaper price.
  const merged = mergeSelection(catalog, [{ id: 'graes', qty: 500, freq: 999, on: true, pris: 0.01 }]);
  assert.equal(merged[0].pris, 1.60);   // catalog price wins
  assert.equal(merged[0].freq, 26);     // clamped to freqMax
  assert.equal(merged[0].qty, 500);
});

test('mergeSelection falls back to catalog defaults for missing selection', () => {
  const catalog = [{ id: 'haek', pris: 58.75, defaultQty: 65, defaultFreq: 1, freqMin: 1, freqMax: 3, defaultOn: true }];
  const merged = mergeSelection(catalog, []);
  assert.deepEqual(merged[0], { id: 'haek', pris: 58.75, qty: 65, freq: 1, on: true });
});

test('rounding: total is derived from exact sum, not from rounded lines', () => {
  // alge line = 3.30*60*1 = 198 ex moms -> 247.5 incl; monthly 20.625 -> rounds to 21.
  const q = computeQuote([{ id: 'alge', pris: 3.30, qty: 60, freq: 1, on: true }], { momsRate: 0.25 });
  assert.equal(q.annualExMoms, 198);
  assert.equal(q.annualInclMoms, 247.5); // exact, not pre-rounded
});
