import { computeQuote } from '/shared/pricing.js';
import { kr, kr2, visitsText } from './format.js';

const $ = (id) => document.getElementById(id);
const prefersReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------- STATE ------------------------------- */
const state = {
  cfg: { momsRate: 0.25, pricesIncludeMoms: false },
  items: [],          // {id, navn, note, enhed, enhedKort, pris, qty, freq, on, freqMin, freqMax, maalHjaelp}
  unpriced: [],
  address: null,      // {id, betegnelse, ...}
  property: null,
};

const STEPS = ['step-adresse', 'step-verify', 'step-losning', 'step-kontakt', 'step-tak'];

/* --------------------------- INIT / PRODUCTS ------------------------- */
async function init() {
  buildProgress();
  wireStaticHandlers();
  wireCombobox();
  try {
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    state.cfg = { momsRate: data.momsRate, pricesIncludeMoms: data.pricesIncludeMoms };
    state.items = data.products.map((p) => ({
      ...p,
      qty: p.defaultQty,
      freq: p.defaultFreq,
      on: p.defaultOn,
    }));
    state.unpriced = data.unpricedServices || [];
  } catch (err) {
    setStatus('Kunne ikke hente ydelser lige nu. Genindlæs siden.');
  }
}

/* ----------------------------- PROGRESS ------------------------------ */
function buildProgress() {
  const ol = $('progress');
  ol.innerHTML = '';
  STEPS.forEach(() => ol.appendChild(document.createElement('li')));
}
function updateProgress(currentId) {
  const idx = STEPS.indexOf(currentId);
  [...$('progress').children].forEach((li, i) => {
    li.className = i < idx ? 'done' : i === idx ? 'current' : '';
  });
}

/* ------------------------------- STEPS ------------------------------- */
function showStep(id) {
  STEPS.forEach((sid) => { $(sid).hidden = sid !== id; });
  $('cta-bar').hidden = id !== 'step-losning';
  updateProgress(id);
  window.scrollTo({ top: 0, behavior: prefersReduced() ? 'auto' : 'smooth' });
  // Fokus-styring: flyt fokus til det aktive trin, saa tastatur/skaermlaeser
  // faar besked om hvor de er.
  const el = $(id);
  el.focus({ preventScroll: true });

  if (id === 'step-verify') renderVerify();
  if (id === 'step-losning') renderLosning();
}

/* --------------------------- ADDRESS COMBOBOX ------------------------ */
let suggestTimer = null;
let suggestCtrl = null;
let suggestions = [];
let activeIndex = -1;

function wireCombobox() {
  const input = $('adr-input');
  input.addEventListener('input', () => {
    const q = input.value.trim();
    clearTimeout(suggestTimer);
    activeIndex = -1;
    if (q.length < 3) { closeList(); return; }
    suggestTimer = setTimeout(() => fetchSuggestions(q), 220);
  });
  input.addEventListener('keydown', onComboKey);
  document.addEventListener('click', (e) => { if (!e.target.closest('.combobox')) closeList(); });
}

async function fetchSuggestions(q) {
  if (suggestCtrl) suggestCtrl.abort();
  suggestCtrl = new AbortController();
  try {
    const res = await fetch('/api/address/suggest?q=' + encodeURIComponent(q), { signal: suggestCtrl.signal });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    suggestions = data.suggestions || [];
    renderList();
    setStatus(suggestions.length ? '' : 'Ingen match endnu. Skriv lidt mere af adressen.');
  } catch (err) {
    if (err.name === 'AbortError') return;
    suggestions = [];
    renderList();
    setStatus('Adresseopslag svarer ikke lige nu. Prøv igen om et øjeblik.');
  }
}

function renderList() {
  const list = $('adr-list');
  const input = $('adr-input');
  list.innerHTML = '';
  if (!suggestions.length) { closeList(); return; }
  suggestions.forEach((s, i) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.id = 'adr-opt-' + i;
    b.setAttribute('role', 'option');
    b.setAttribute('tabindex', '-1');
    b.textContent = s.tekst;
    b.addEventListener('click', () => selectAddress(s));
    li.appendChild(b);
    list.appendChild(li);
  });
  list.hidden = false;
  input.setAttribute('aria-expanded', 'true');
  setActive(-1);
}

function setActive(i) {
  const list = $('adr-list');
  const buttons = [...list.querySelectorAll('button')];
  activeIndex = i;
  buttons.forEach((b, bi) => {
    const on = bi === i;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  $('adr-input').setAttribute('aria-activedescendant', i >= 0 ? 'adr-opt-' + i : '');
}

function onComboKey(e) {
  if ($('adr-list').hidden) return;
  const n = suggestions.length;
  if (e.key === 'ArrowDown') { e.preventDefault(); setActive((activeIndex + 1) % n); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((activeIndex - 1 + n) % n); }
  else if (e.key === 'Enter') {
    if (activeIndex >= 0) { e.preventDefault(); selectAddress(suggestions[activeIndex]); }
  } else if (e.key === 'Escape') { closeList(); }
}

function closeList() {
  const list = $('adr-list');
  list.hidden = true;
  list.innerHTML = '';
  $('adr-input').setAttribute('aria-expanded', 'false');
  $('adr-input').removeAttribute('aria-activedescendant');
  activeIndex = -1;
}

function setStatus(msg) { $('adr-status').textContent = msg; }

/* ------------------------- SELECT + DIG SEQUENCE --------------------- */
async function selectAddress(sug) {
  closeList();
  $('adr-input').value = sug.tekst;
  state.address = { id: sug.id, betegnelse: sug.tekst };

  const lookup = fetchLookup(sug.id);
  try {
    const result = await runDig(sug.tekst, lookup);
    state.address = result.address;
    state.property = result.property;
    showStep('step-verify');
  } catch (err) {
    setStatus('Kunne ikke hente adressen. Prøv en anden, eller igen om lidt.');
  }
}

async function fetchLookup(id) {
  const res = await fetch('/api/address/lookup?id=' + encodeURIComponent(id));
  if (!res.ok) throw new Error('lookup ' + res.status);
  return res.json(); // {address, property}
}

const DIG_MSGS = ['Slår din adresse op…', 'Måler grunden op…', 'Kigger på taget fra oven…', 'Regner på det…'];

async function runDig(adrText, promise) {
  if (prefersReduced()) return promise; // spring animationen over
  const dig = $('dig'), msg = $('dig-msg'), fill = $('dig-fill');
  $('dig-adr').textContent = adrText;
  dig.hidden = false;
  msg.textContent = DIG_MSGS[0];
  fill.style.width = '15%';
  let i = 0;
  const timer = setInterval(() => {
    i = (i + 1) % DIG_MSGS.length;
    msg.textContent = DIG_MSGS[i];
    fill.style.width = Math.min(90, 15 + i * 25) + '%';
  }, 650);
  const minTime = new Promise((r) => setTimeout(r, 1700));
  try {
    const [res] = await Promise.all([promise, minTime]);
    fill.style.width = '100%';
    await new Promise((r) => setTimeout(r, 300));
    return res;
  } finally {
    clearInterval(timer);
    dig.hidden = true;
  }
}

/* ------------------------------- VERIFY ------------------------------ */
function renderVerify() {
  $('verify-adr').textContent = state.address?.betegnelse || '';
  const p = state.property;
  let coords = '';
  if (p?.koordinater) coords = `Koordinater: ${p.koordinater.lat.toFixed(5)}, ${p.koordinater.lon.toFixed(5)} · `;
  $('verify-coords').textContent = coords + (p?.kilde || '');
}

/* ------------------------------ LOSNING ------------------------------ */
function renderLosning() {
  $('t-adr').textContent = state.address?.betegnelse || 'Din adresse';
  const pct = Math.round(state.cfg.momsRate * 100);
  $('moms-note').textContent = `Priser vises inkl. ${pct}% moms. Estimat — endelig pris bekræftes ved besøg.`;
  if (state.unpriced.length) {
    const navne = state.unpriced.map((u) => u.navn).join(', ');
    $('unpriced-note').textContent = `Følgende mangler pris i WorkMaker og gives som særskilt tilbud: ${navne}.`;
  }
  renderRows();
}

function renderRows() {
  const wrap = $('rows');
  wrap.innerHTML = '';
  state.items.forEach((p) => {
    const row = document.createElement('div');
    row.className = 'row' + (p.on ? '' : ' off');
    row.dataset.id = p.id;

    // Checkbox
    const chk = document.createElement('input');
    chk.type = 'checkbox'; chk.className = 'chk'; chk.checked = p.on;
    chk.setAttribute('aria-label', p.navn);
    chk.addEventListener('change', () => { p.on = chk.checked; update(); });

    // Navn + note
    const navn = document.createElement('div');
    navn.className = 'navn';
    const b = document.createElement('b'); b.textContent = p.navn;
    const small = document.createElement('small');
    small.textContent = `${p.note} · ${kr2(p.pris)} kr pr. ${p.enhedKort}`;
    navn.append(b, small);
    const warn = document.createElement('small');
    warn.className = 'qty-warn'; warn.hidden = true;
    warn.textContent = 'Angiv en mængde for at få prisen med.';
    navn.append(warn);

    // Qty
    const qty = document.createElement('div');
    qty.className = 'qty';
    const qi = document.createElement('input');
    qi.type = 'number'; qi.min = '0'; qi.value = p.qty; qi.inputMode = 'numeric';
    qi.setAttribute('aria-label', `Mængde for ${p.navn} i ${p.enhed}`);
    qi.addEventListener('input', () => { p.qty = Math.max(0, parseFloat(qi.value) || 0); update(); });
    const ql = document.createElement('span'); ql.textContent = p.enhedKort;
    qty.append(qi, ql);

    // Freq stepper
    const freq = document.createElement('div');
    freq.className = 'freq';
    const minus = stepBtn('−', `Færre besøg med ${p.navn}`);
    const fv = document.createElement('span'); fv.className = 'fv';
    const plus = stepBtn('+', `Flere besøg med ${p.navn}`);
    const syncFreq = () => {
      fv.textContent = `${p.freq}x pr. år`;
      minus.disabled = p.freq <= p.freqMin;
      plus.disabled = p.freq >= p.freqMax;
    };
    minus.addEventListener('click', () => { if (p.freq > p.freqMin) { p.freq--; syncFreq(); update(); } });
    plus.addEventListener('click', () => { if (p.freq < p.freqMax) { p.freq++; syncFreq(); update(); } });
    syncFreq();
    freq.append(minus, fv, plus);

    // Price
    const pris = document.createElement('div');
    pris.className = 'pris';

    row.append(chk, navn, qty, freq, pris);
    wrap.appendChild(row);
  });
  update();
}

function stepBtn(sign, label) {
  const b = document.createElement('button');
  b.type = 'button'; b.textContent = sign; b.setAttribute('aria-label', label);
  return b;
}

function update() {
  const q = computeQuote(state.items, state.cfg);
  const lineById = new Map(q.lines.map((l) => [l.id, l]));

  [...$('rows').children].forEach((row) => {
    const p = state.items.find((it) => it.id === row.dataset.id);
    const line = lineById.get(p.id);
    row.classList.toggle('off', !p.on);
    const priceEl = row.querySelector('.pris');
    const warnEl = row.querySelector('.qty-warn');
    warnEl.hidden = !line.needsQty;
    if (line.active) {
      priceEl.classList.remove('inactive');
      priceEl.innerHTML = '';
      const b = document.createElement('b'); b.textContent = `${kr(line.monthlyInclMoms)}/md`;
      const s = document.createElement('small'); s.textContent = `${kr(line.annualInclMoms)} pr. år`;
      priceEl.append(b, s);
    } else {
      priceEl.classList.add('inactive');
      priceEl.innerHTML = '';
      const b = document.createElement('b'); b.textContent = '—';
      priceEl.append(b);
    }
  });

  $('t-count').textContent = q.count;
  $('t-visits').textContent = visitsText(q.minVisits, q.maxVisits);
  $('t-pris').textContent = kr(q.monthlyInclMoms);
  $('cta-pris').textContent = `${kr(q.monthlyInclMoms)}/md`;
  $('cta-detalje').textContent = `${q.count} ydelser · ${visitsText(q.minVisits, q.maxVisits)} besøg/år · inkl. moms`;
  $('btn-kontakt').disabled = q.count < 1;
}

/* ------------------------------ KONTAKT ------------------------------ */
const ERR_FIELDS = ['navn', 'email', 'tlf', 'note', 'consent'];

function clearErrors() {
  ERR_FIELDS.forEach((f) => { const e = $('err-' + f); if (e) { e.hidden = true; e.textContent = ''; } });
  ['k-navn', 'k-mail', 'k-tlf'].forEach((id) => $(id).removeAttribute('aria-invalid'));
  $('err-form').hidden = true;
}
function showErrors(errors) {
  clearErrors();
  const map = { navn: 'k-navn', email: 'k-mail', tlf: 'k-tlf' };
  Object.entries(errors).forEach(([k, msg]) => {
    const el = $('err-' + k);
    if (el) { el.textContent = msg; el.hidden = false; }
    if (map[k]) $(map[k]).setAttribute('aria-invalid', 'true');
  });
  if (errors.adresse || errors.valg) {
    $('err-form').textContent = errors.adresse || errors.valg;
    $('err-form').hidden = false;
  }
}

async function submitLead(e) {
  e.preventDefault();
  const btn = $('btn-send');
  const payload = {
    adresse: { id: state.address?.id, betegnelse: state.address?.betegnelse },
    valg: state.items.map((i) => ({ id: i.id, qty: i.qty, freq: i.freq, on: i.on })),
    kontakt: {
      navn: $('k-navn').value,
      email: $('k-mail').value,
      tlf: $('k-tlf').value,
      note: $('k-note').value,
      consent: $('k-consent').checked,
    },
    firma: $('k-firma').value, // honeypot
  };
  btn.disabled = true;
  try {
    const res = await fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) {
      renderTak(data);
      showStep('step-tak');
    } else if (res.status === 400 && data.errors) {
      showErrors(data.errors);
    } else if (res.status === 429) {
      $('err-form').textContent = 'For mange forsøg. Prøv igen om lidt.';
      $('err-form').hidden = false;
    } else {
      $('err-form').textContent = 'Noget gik galt. Prøv igen, eller ring til os.';
      $('err-form').hidden = false;
    }
  } catch (err) {
    $('err-form').textContent = 'Kunne ikke sende lige nu. Tjek din forbindelse og prøv igen.';
    $('err-form').hidden = false;
  } finally {
    btn.disabled = false;
  }
}

function renderTak(data) {
  const q = data.quote || {};
  const valgt = state.items
    .filter((i) => i.on && i.qty > 0 && i.freq > 0)
    .map((i) => `${i.navn} (${i.freq}x/år)`)
    .join(', ');
  const opsum = $('tak-opsum');
  opsum.innerHTML = '';
  const addLine = (label, val) => {
    const div = document.createElement('div');
    const strong = document.createElement('strong'); strong.textContent = label + ' ';
    div.append(strong, document.createTextNode(val));
    opsum.appendChild(div);
  };
  addLine('Adresse:', state.address?.betegnelse || '');
  addLine('Valgt:', valgt || '(ingen)');
  addLine('Estimat:', `${kr(q.monthlyInclMoms || 0)}/md inkl. moms · ${visitsText(q.minVisits, q.maxVisits)} besøg om året`);
  $('tak-ref').textContent = data.ref ? `Din reference: ${data.ref}` : '';
}

/* ---------------------------- STATIC WIRING -------------------------- */
function wireStaticHandlers() {
  $('btn-ja').addEventListener('click', () => showStep('step-losning'));
  $('btn-nej').addEventListener('click', () => {
    $('adr-input').value = '';
    showStep('step-adresse');
    $('adr-input').focus();
  });
  $('btn-kontakt').addEventListener('click', () => showStep('step-kontakt'));
  $('btn-tilbage').addEventListener('click', () => showStep('step-losning'));
  $('btn-forfra').addEventListener('click', () => window.location.reload());
  $('kontakt-form').addEventListener('submit', submitLead);
}

init();
