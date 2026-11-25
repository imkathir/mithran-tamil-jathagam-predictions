import { useEffect, useState } from 'react';
import type { Dossier, Bilingual, GrahaEval } from '../engine';
import { RASI, NAKSHATRA, OWN, EXALT, DEBIL, fmtDate, navamsaRasi } from '../engine';
import { canvasToIndexedPngDataUrl } from '../png';
import type { TimelineRow } from '../timeline';
import type { PoruthamResult } from '../porutham';
import { buildDasa36 } from '../dasa36';
import {
  RASI_REF, NAKSHATRA_REF, BHAVA_REF, DASA_YEARS, PLANET_NAMES,
} from '../data/jothidam-reference-data';
import { DEFAULT_PROFILE_NAME, profileName, type Lang } from '../i18n';

export interface PdfPoruthamData { bride: string; groom: string; result: PoruthamResult }

type DocLang = 'ta' | 'en' | 'bi';

const BI = (x: Bilingual, dl: DocLang) => (dl === 'ta' ? x.ta : dl === 'en' ? x.en : `${x.ta} / ${x.en}`);
const L = (ta: string, en: string, dl: DocLang) => (dl === 'ta' ? ta : dl === 'en' ? en : `${ta} / ${en}`);
const pn = (id: string, dl: DocLang) => BI({ ta: PLANET_NAMES[id].ta, en: PLANET_NAMES[id].en }, dl);
const rasiName = (i: number, dl: DocLang) => BI({ ta: RASI[i].ta, en: RASI[i].en }, dl);
const nakName = (i: number, dl: DocLang) => BI({ ta: NAKSHATRA[i].ta, en: NAKSHATRA[i].en }, dl);
const degMin = (deg: number) => `${Math.floor(deg)}° ${String(Math.floor((deg % 1) * 60)).padStart(2, '0')}'`;
const esc = (s: string) => s
  .normalize('NFC')
  .replace(/\$([^$]*)\$/g, '$1')
  .replace(/\\theta/g, 'θ')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

interface Atom { html: string }

const SECTIONS = [
  { id: 1, ta: 'தென்னிந்திய ராசி & நவாம்ச கட்டங்கள்', en: 'South Indian 4x4 Charts — Rasi & Navamsa' },
  { id: 2, ta: 'அடுத்த 36 மாத தசாபுத்தி & கோச்சார பலன்கள்', en: 'Next 36 Months Combined Dasa-Bhukti & Gochara Prediction' },
  { id: 3, ta: 'பிறப்பு முதல் 70 வயது தசாபுத்தி பலன்கள்', en: 'Birth to 70 Years Dasa-Bhukti Life Prediction' },
  { id: 4, ta: 'கிரக நிலைகள் & பார்வை அட்டவணை', en: '9-Graha Ephemeris & Planetary Paarvai Matrix' },
  { id: 5, ta: '40 காரணிகள் நுண்ணாய்வு', en: '40-Factor Classical Graha Inspector' },
  { id: 6, ta: 'பலம், யோகங்கள் & சர்வாஷ்டகவர்க்கம்', en: 'Strength, Yogas & Sarvashtakavarga' },
  { id: 7, ta: 'ஐந்து துறை வாழ்க்கை பலன்கள்', en: 'Five-Domain Classical Predictions' },
  { id: 8, ta: 'திருமணப் பொருத்தம் & 20 ஆண்டு ஆய்வு', en: 'Marriage Compatibility & 20-Year Stability Report' },
  { id: 9, ta: 'ஜோதிட அடிப்படை வழிகாட்டி', en: 'Jothidam Reference Guide Appendix' },
];

/** Sections 1-3 are the core trio checked by default; the rest are opt-in. */
const DEFAULT_SECTION_IDS = [1, 2, 3];

// ---------- panchangam helpers (tithi / yoga / karana from Sun–Moon longitudes) ----------
function badgeFor(planet: string, rasi: number): string {
  if ((OWN[planet] ?? []).includes(rasi)) return 'ஆ';
  if (EXALT[planet] === rasi) return 'உ';
  if (DEBIL[planet] === rasi) return 'நீ';
  return '';
}

// ---------- shared style (literal colors — no CSS variables, for html2canvas fidelity) ----------
const PDF_CSS = `
#pdf-stage { position: fixed; left: -20000px; top: 0; width: 794px; background: #fff; z-index: -1; }
.p-page { width: 794px; height: 1123px; box-sizing: border-box; padding: 64px 52px 52px; background: #fff; color: #111827;
  position: relative; overflow: hidden; font-family: 'Noto Sans Tamil', 'Plus Jakarta Sans', sans-serif; font-size: 10.5px; line-height: 1.55; }
.p-head { position: absolute; top: 0; left: 0; right: 0; height: 58px; padding: 13px 52px 0; border-bottom: 1px solid #E5E7EB;
  font-size: 8px; color: #52525B; letter-spacing: 0.05em; text-transform: uppercase; display: flex; justify-content: space-between; gap: 16px; }
.p-head b { color: #111827; font-weight: 600; }
.p-foot { position: absolute; bottom: 0; left: 0; right: 0; height: 44px; padding: 13px 52px 0; border-top: 1px solid #E5E7EB;
  font-size: 8px; color: #A1A1AA; letter-spacing: 0.05em; display: flex; justify-content: space-between; text-transform: uppercase; }
.p-h1 { font-size: 18px; font-weight: 700; margin: 0 0 4px; line-height: 1.3; }
.p-h2 { font-size: 12px; font-weight: 700; color: #B91C1C; margin: 20px 0 8px; letter-spacing: 0.03em; border-bottom: 1px solid #B91C1C; padding-bottom: 4px; }
.p-h3 { font-size: 10.5px; font-weight: 700; margin: 14px 0 6px; color: #111827; }
.p-sub { font-size: 9px; color: #52525B; margin-bottom: 12px; }
.p-note { font-size: 8.5px; color: #A1A1AA; margin-top: 6px; }
.p-tbl { width: 100%; border-collapse: collapse; }
.p-tbl th { font-size: 7.5px; text-transform: uppercase; letter-spacing: 0.07em; color: #A1A1AA; font-weight: 600; text-align: left; padding: 5px 6px; border-bottom: 1.5px solid #111827; }
.p-tbl td { font-size: 9px; color: #52525B; padding: 4.5px 6px; border-bottom: 1px solid #E5E7EB; vertical-align: top; }
.p-tbl td.pk { color: #111827; font-weight: 600; }
.p-tbl td.n, .p-tbl th.n { font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; }
.p-tbl td.c, .p-tbl th.c { text-align: center; }
.p-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 20px; }
.p-kv { display: flex; justify-content: space-between; gap: 12px; border-bottom: 1px solid #E5E7EB; padding: 4px 0; font-size: 9.5px; }
.p-kv .k { color: #A1A1AA; text-transform: uppercase; letter-spacing: 0.05em; font-size: 8px; font-weight: 600; }
.p-kv .v { color: #111827; font-weight: 600; text-align: right; }
.p-si { width: 100%; border-collapse: collapse; table-layout: fixed; }
.p-si td { border: 1px solid #E5E7EB; height: 86px; padding: 5px 6px; vertical-align: top; font-size: 8.5px; color: #52525B; }
.p-si td.lagna { box-shadow: inset 0 0 0 1px #111827; }
.p-si .tag { font-size: 8px; font-weight: 700; color: #111827; letter-spacing: 0.04em; }
.p-si .gl { display: block; font-family: 'JetBrains Mono', monospace; font-size: 8px; white-space: nowrap; }
.p-si .bg { display: inline-block; min-width: 13px; text-align: center; font-size: 7px; font-weight: 700; color: #fff; border-radius: 2px; padding: 0 2px; }
.p-si .bg.a { background: #15803D; } .p-si .bg.u { background: #1D4ED8; } .p-si .bg.nb { background: #B45309; }
.p-si .center { text-align: center; vertical-align: middle; color: #A1A1AA; font-size: 8px; letter-spacing: 0.08em; text-transform: uppercase; }
.p-bar { display: inline-block; height: 5px; background: #B91C1C; vertical-align: middle; border-radius: 1px; }
.p-chip { display: inline-block; border: 1px solid #E5E7EB; border-radius: 3px; padding: 1px 6px; font-size: 8px; color: #52525B; margin: 1px 3px 1px 0; letter-spacing: 0.03em; }
.p-medal { display: inline-block; border: 1.5px solid #111827; border-radius: 50%; width: 22px; height: 22px; line-height: 21px; text-align: center; font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 700; color: #111827; }
.p-verdict { border: 1.5px solid #111827; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; gap: 16px; margin: 10px 0; }
.p-verdict .vt { font-size: 13px; font-weight: 700; }
.p-verdict .vs { font-family: 'JetBrains Mono', monospace; font-size: 15px; color: #B91C1C; font-weight: 700; }
.p-body p { margin: 6px 0; color: #3F3F46; font-size: 9.5px; line-height: 1.65; }
.p-atom { width: 100%; }
.p-h3 { break-after: avoid; page-break-after: avoid; }
.p-tbl td, .p-tbl th { overflow: visible; line-height: 1.6; }
.center.wm { color: #D4D4D8; letter-spacing: 2px; font-size: 11px; }
tr { break-inside: avoid; page-break-inside: avoid; }
thead { display: table-header-group; }
`;

// ---------- section builders ----------

function siTable(grid: Record<number, string[]>, lagnaRasi: number, label: string, d: Dossier, dl: DocLang): string {
  const gm: Record<string, GrahaEval> = {};
  for (const g of d.grahas) gm[g.id] = g;
  const cells: string[] = [];
  for (let row = 0; row < 4; row++) {
    const tds: string[] = [];
    for (let col = 0; col < 4; col++) {
      const rasi = Object.keys(GRID).find((k) => GRID[Number(k)][0] === row && GRID[Number(k)][1] === col);
      if (rasi === undefined) { tds.push(row === 1 && col === 1 ? '<td class="center wm">மித்ரன்</td>' : '<td></td>'); continue; }
      const ri = Number(rasi);
      const lines = (grid[ri] ?? []).map((s) => {
        const id = s.split(' ')[0];
        const b = badgeFor(id, ri);
        const name = esc(BI({ ta: PLANET_NAMES[id].ta, en: PLANET_NAMES[id].en }, dl));
        const deg = gm[id] ? ` ${Math.floor(gm[id].deg)}°` : '';
        return `<span class="gl">${name}${deg}${b ? ` <span class="bg ${b === 'ஆ' ? 'a' : b === 'உ' ? 'u' : 'nb'}">${b}</span>` : ''}</span>`;
      }).join('');
      const lagnaMark = ri === lagnaRasi ? `<span class="gl" style="font-weight:700;color:#B91C1C">${L('லக்', 'Asc', dl)}</span>` : '';
      tds.push(`<td class="${ri === lagnaRasi ? 'lagna' : ''}"><span class="tag">${esc(RASI[ri].ta)}</span>${lagnaMark}${lines}</td>`);
    }
    cells.push(`<tr>${tds.join('')}</tr>`);
  }
  return `<div class="p-h3">${esc(label)}</div><table class="p-si"><tbody>${cells.join('')}</tbody></table>`;
}

const GRID: Record<number, [number, number]> = {
  11: [0, 0], 0: [0, 1], 1: [0, 2], 2: [0, 3],
  10: [1, 0], 3: [1, 3],
  9: [2, 0], 4: [2, 3],
  8: [3, 0], 7: [3, 1], 6: [3, 2], 5: [3, 3],
};

export function sectionCharts(d: Dossier, dl: DocLang): Atom[] {
  const p = d.profile;
  const moon = d.grahas.find((g) => g.id === 'Moon')!;
  const kv = (k: string, v: string) => `<div class="p-kv"><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span></div>`;
  const html = `
    <div class="p-h2">${L('1. தென்னிந்திய ராசி & நவாம்ச கட்டங்கள்', '1. South Indian 4x4 Charts — Rasi & Navamsa', dl)}</div>
    <div class="p-grid2">
      <div>
        ${kv(L('பெயர்', 'Name', dl), profileName(p.name, dl))}
        ${kv(L('பிறந்த தேதி', 'Date of Birth', dl), p.date)}
        ${kv(L('பிறந்த நேரம்', 'Time of Birth', dl), p.time)}
        ${kv(L('பிறந்த இடம்', 'Place', dl), p.placeName)}
      </div>
      <div>
        ${kv(L('லக்னம்', 'Lagna', dl), `${rasiName(d.lagnaRasi, dl)} ${degMin(d.lagnaLon % 30)}`)}
        ${kv(L('ராசி (சந்திரன்)', 'Rasi (Moon)', dl), rasiName(moon.rasi, dl))}
        ${kv(L('நட்சத்திரம்', 'Star', dl), `${nakName(moon.nakIdx, dl)} · ${L(`${moon.pada}-ம் பாதம்`, `Pada ${moon.pada}`, dl)}`)}
      </div>
    </div>
    <div class="p-sub">${L('தென்னிந்திய 4×4 அமைப்பு · ஆட்சி (ஆ) · உச்சம் (உ) · நீச்சம் (நீ) பேட்ஜ்கள் · கருப்பு எல்லை = லக்னம்', 'South Indian 4×4 format · dignity badges: own (ஆ), exalt (உ), debil (நீ) · heavy border = Lagna', dl)}</div>
    ${siTable(d.rasiGrid, d.lagnaRasi, L('ராசி குண்டலி (D1)', 'Rasi Chart (D1)', dl), d, dl)}
    ${siTable(d.navamsaGrid, navamsaRasi(d.lagnaLon), L('நவாம்ச குண்டலி (D9)', 'Navamsa Chart (D9)', dl), d, dl)}
    <div class="p-note">${L('நவாம்ச லக்னம்: லக்னத்தின் சிடீரியல் தூரத்திலிருந்து கணக்கிடப்படுகிறது (Dhanusu 4°53\u2032 → 2-ம் நவாம்சம் = ரிஷபம்).', 'Navamsa lagna is computed from the Lagna sidereal longitude (Dhanusu 4\u203253\u2032 → 2nd navamsa = Rishabam).', dl)}</div>
  `;
  return [{ html }];
}

export function section36Months(d: Dossier, dl: DocLang): Atom[] {
  const data = buildDasa36(d, new Date());
  const atoms: Atom[] = [{
    html: `
      <div class="p-h2">${L('2. அடுத்த 36 மாத தசாபுத்தி & கோச்சார பலன்கள்', '2. Next 36 Months Combined Dasa-Bhukti & Gochara Prediction', dl)}</div>
      <div class="p-sub">${esc(data.windowLabel)} · ${L('இப்போது நடப்பு', 'Active now', dl)}: ${esc(pn(data.activeNow.maha, dl))}–${esc(pn(data.activeNow.bhukti, dl))}–${esc(pn(data.activeNow.antara, dl))}</div>
    `,
  }];
  const chunk = 10;
  for (let i = 0; i < data.months.length; i += chunk) {
    const rows = data.months.slice(i, i + chunk).map((m) => {
      const shortTa = m.prediction.ta;
      const shortEn = m.prediction.en;
      const bandColor = m.net >= 80 ? '#15803D' : m.net >= 60 ? '#111827' : m.net >= 40 ? '#52525B' : '#B91C1C';
      return `<tr>
        <td class="n c pk">${m.index}</td>
        <td class="pk">${esc(BI(m.label, dl))}</td>
        <td class="n">${esc(pn(m.maha, dl))}–${esc(pn(m.bhukti, dl))}–${esc(pn(m.antara, dl))}</td>
        <td><bdi>${esc(BI(m.transitSummary, dl))}</bdi>${m.gocharaFlags.length ? `<div class="p-note">${m.gocharaFlags.map((f) => esc(BI(f.label, dl))).join(' · ')}</div>` : ''}</td>
        <td class="n c pk" style="color:${bandColor}">${m.net}<div class="p-note" style="color:${bandColor}">${esc(BI(m.bandLabel, dl))}</div></td>
        <td>${dl !== 'en' ? esc(shortTa) : ''}${dl === 'bi' ? '<br/>' : ''}${dl !== 'ta' ? `<span style="color:#A1A1AA">${esc(shortEn)}</span>` : ''}</td>
      </tr>`;
    }).join('');
    atoms.push({
      html: `<table class="p-tbl">
        <thead><tr>
          <th class="n c">#</th><th>${L('மாதம்', 'Month', dl)}</th><th>${L('தசை–புக்தி–அந்தரம்', 'Dasa–Bhukti–Antara', dl)}</th>
          <th>${L('கோச்சார நிலை', 'Gochara', dl)}</th><th class="n c">${L('மதிப்பெண்', 'Net', dl)}</th><th>${L('பலன்', 'Prediction', dl)}</th>
        </tr></thead>
        <tbody>${rows}</tbody></table>`,
    });
  }
  return atoms;
}

export function sectionEphemeris(d: Dossier, dl: DocLang): Atom[] {
  const rows = d.grahas.map((g) => `
    <tr>
      <td class="pk">${esc(pn(g.id, dl))}</td>
      <td class="n">${esc(rasiName(g.rasi, dl))} ${degMin(g.deg)}</td>
      <td class="n">${esc(nakName(g.nakIdx, dl))} · ${L(`${g.pada}-ம் பாதம்`, `Pada ${g.pada}`, dl)}</td>
      <td class="n c">${g.strength}</td>
      <td class="n">${g.aspectDetails.map((a) => `${a.num}${a.traditional ? '*' : ''}→${a.targetHouse}`).join(' ') || '—'}</td>
      <td class="n">${g.aspectsReceived.map((a) => `${a.from}(${a.num}${a.traditional ? '*' : ''})`).join(' ') || '—'}</td>
    </tr>`).join('');
  const ids = d.grahas.map((g) => g.id);
  const matrix = ids.map((from) => {
    const gr = d.grahas.find((x) => x.id === from)!;
    const tds = ids.map((to) => {
      if (to === from) return '<td class="c n">·</td>';
      const hits = gr.aspectDetails.filter((a) => a.grahasInTarget.includes(to)).map((a) => `${a.num}${a.traditional ? '*' : ''}`);
      return `<td class="c n">${hits.join(',') || ''}</td>`;
    }).join('');
    return `<tr><td class="pk">${esc(PLANET_NAMES[from].abbr)}</td>${tds}</tr>`;
  }).join('');
  const html = `
    <div class="p-h2">${L('4. கிரக நிலைகள் & பார்வை அட்டவணை', '4. 9-Graha Ephemeris & Planetary Paarvai Matrix', dl)}</div>
    <table class="p-tbl">
      <thead><tr>
        <th>${L('கிரகம்', 'Graha', dl)}</th><th>${L('ராசி / பாகை', 'Rasi / Degree', dl)}</th><th>${L('நட்சத்திரம் / பாதம்', 'Star / Pada', dl)}</th>
        <th class="n c">${L('வலு /100', 'Str /100', dl)}</th><th>${L('பார்வை (கொடுப்பது)', 'Paarvai Given', dl)}</th><th>${L('பார்வை (பெறுவது)', 'Paarvai Received', dl)}</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="p-note">${L('* = மரபு விதிப்படியான பார்வை. பார்வை எண்கள் 5/7/8 (ராசி), 3/4, 9/10, 2/12 (நட்சத்திரம்).', '* = traditional aspect. Numbers 5/7/8 (rasi-based), 3/4, 9/10, 2/12 (star-based).', dl)}</div>
    <div class="p-h3">${L('பார்வை மேட்ரிக்ஸ் (வரிசை = பார்க்கும் கிரகம், நெடுவரிசை = பார்க்கப்படும் கிரகம்)', 'Paarvai Matrix (row = aspecting graha, column = aspected graha)', dl)}</div>
    <table class="p-tbl">
      <thead><tr><th></th>${ids.map((i) => `<th class="c n">${esc(PLANET_NAMES[i].abbr)}</th>`).join('')}</tr></thead>
      <tbody>${matrix}</tbody>
    </table>
  `;
  return [{ html }];
}

export function sectionInspector(d: Dossier, dl: DocLang): Atom[] {
  const atoms: Atom[] = [{ html: `<div class="p-h2">${L('5. 40 காரணிகள் நுண்ணாய்வு', '5. 40-Factor Classical Graha Inspector', dl)}</div><div class="p-sub">${L('ஒவ்வொரு கிரகத்திற்கும் பாரம்பரிய 40 காரணிகளின் உண்மை மதிப்பீடுகள்.', 'Live verdicts for all 40 classical factors, per graha.', dl)}</div>` }];
  for (const g of d.grahas) {
    const half = Math.ceil(g.factors.length / 2);
    const col = (fs: typeof g.factors) => fs.map((f) => `<div class="p-kv"><span class="k">${f.n}. ${esc(BI(f.label, dl))}</span><span class="v">${esc(BI(f.value, dl))}</span></div>`).join('');
    atoms.push({
      html: `
        <div class="p-h3">${esc(pn(g.id, dl))} — ${esc(BI(g.dignity, dl))} · ${L('வலு', 'Str', dl)} ${g.strength}/100</div>
        <div class="p-grid2"><div>${col(g.factors.slice(0, half))}</div><div>${col(g.factors.slice(half))}</div></div>
      `,
    });
  }
  return atoms;
}

export function sectionStrength(d: Dossier, dl: DocLang): Atom[] {
  const savRows = RASI.map((r, i) => {
    const cols = Object.keys(d.bav).map((p) => `<td class="n c">${d.bav[p][i]}</td>`).join('');
    const total = Object.keys(d.bav).reduce((s, p) => s + d.bav[p][i], 0);
    return `<tr><td class="pk">${esc(r.ta)}</td>${cols}<td class="n c pk">${total}</td></tr>`;
  }).join('');
  const totals = Object.keys(d.bav).map((p) => `<td class="n c pk">${d.bav[p].reduce((a, b) => a + b, 0)}</td>`).join('');
  const bavRows = d.bhavaBala.map((b) => `
    <tr><td class="n c pk">${b.house}</td><td>${esc(RASI[b.rasi].ta)}</td><td class="n c">${b.sav}</td>
    <td class="n c"><span class="p-bar" style="width:${b.score}px"></span> ${b.score}</td></tr>`).join('');
  const yogaRows = d.yogas.map((y) => `
    <tr><td class="pk">${esc(BI(y.name, dl))}</td><td>${y.grahas.map((g) => esc(pn(g, dl))).join(', ')}</td>
    <td>${esc(BI(y.effect, dl))}</td><td class="c">${esc(BI({ ta: y.nature === 'benefic' ? 'சுபம்' : y.nature === 'malefic' ? 'பாவம்' : 'சமம்', en: y.nature }, dl))}</td></tr>`).join('');
  const html = `
    <div class="p-h2">${L('6. பலம், யோகங்கள் & சர்வாஷ்டகவர்க்கம்', '6. Strength, Yogas & Sarvashtakavarga', dl)}</div>
    <div class="p-h3">${L('சர்வாஷ்டகவர்கம் (SAV) — 337 பிண்டுகள்', 'Sarvashtakavarga (SAV) — 337 bindus', dl)}</div>
    <table class="p-tbl">
      <thead><tr><th>${L('ராசி', 'Rasi', dl)}</th>${Object.keys(d.bav).map((p) => `<th class="c n">${esc(PLANET_NAMES[p].abbr)}</th>`).join('')}<th class="c n">Σ</th></tr></thead>
      <tbody>${savRows}<tr><td class="pk">Σ</td>${totals}<td class="n c pk">337</td></tr></tbody>
    </table>
    <div class="p-h3">${L('பாவ பலம் (0–100)', 'Bhava Bala (0–100)', dl)}</div>
    <table class="p-tbl">
      <thead><tr><th class="n c">${L('வீடு', 'H', dl)}</th><th>${L('ராசி', 'Rasi', dl)}</th><th class="n c">SAV</th><th class="n c">${L('பலம்', 'Score', dl)}</th></tr></thead>
      <tbody>${bavRows}</tbody>
    </table>
    <div class="p-h3">${L('யோகங்கள்', 'Yogas', dl)}</div>
    <table class="p-tbl">
      <thead><tr><th>${L('யோகம்', 'Yoga', dl)}</th><th>${L('கிரகங்கள்', 'Grahas', dl)}</th><th>${L('பலன்', 'Effect', dl)}</th><th class="c">${L('தன்மை', 'Nature', dl)}</th></tr></thead>
      <tbody>${yogaRows || '<tr><td>—</td></tr>'}</tbody>
    </table>
  `;
  return [{ html }];
}

export function sectionPredictions(d: Dossier, dl: DocLang): Atom[] {
  const atoms: Atom[] = [{ html: `<div class="p-h2">${L('7. ஐந்து துறை வாழ்க்கை பலன்கள்', '7. Five-Domain Classical Predictions', dl)}</div><div class="p-sub">${L('40 காரணிகளின் எடையிடப்பட்ட தொகுப்பு · விதி அடிப்படை பட்டியலுடன்', 'Weighted synthesis of 40 factors, with rule-basis citations', dl)}</div>` }];
  for (const p of d.predictions) {
    const cite = p.contributors.slice(0, 4).map((c) => BI(c, dl)).join(' · ');
    atoms.push({
      html: `
        <div class="p-h3">${esc(BI(p.title, dl))} — <b>${Math.round(p.rating)}</b>/100</div>
        <div class="p-body">
          ${dl !== 'en' ? `<p>${esc(p.body.ta)}</p>` : ''}
          ${dl !== 'ta' ? `<p>${esc(p.body.en)}</p>` : ''}
        </div>
        <div class="p-note">${L('விதி அடிப்படை:', 'Rule basis:', dl)} ${esc(cite)}</div>
      `,
    });
  }
  return atoms;
}

export function sectionTimeline(rows: TimelineRow[], dl: DocLang): Atom[] {
  const atoms: Atom[] = [{ html: `<div class="p-h2">${L('3. பிறப்பு முதல் 70 வயது தசாபுத்தி பலன்கள்', '3. Birth to 70 Years Dasa-Bhukti Life Prediction', dl)}</div><div class="p-sub">${L('முழு வரிசை அட்டவணை · வயது வாரியான வாழ்க்கை கால கணிப்புகள்', 'Full chronological table with age-calibrated predictions', dl)}</div>` }];
  const chunk = 15;
  for (let i = 0; i < rows.length; i += chunk) {
    const body = rows.slice(i, i + chunk).map((r) => {
      const cat = BI(r.prediction.category, dl);
      const txt = (dl === 'en' ? r.prediction.body.en : r.prediction.body.ta).replace(/\s+/g, ' ');
      const short = txt;
      return `<tr>
        <td class="n">${fmtDate(r.start)} – ${fmtDate(r.end)}</td>
        <td class="n c">${Math.floor(r.ageStart)}y ${Math.round((r.ageStart % 1) * 12)}m</td>
        <td class="pk">${esc(pn(r.dasaLord, dl))}–${esc(pn(r.bhuktiLord, dl))}</td>
        <td class="c">${r.status === 'active' ? L('நடப்பு', 'Active', dl) : r.status === 'completed' ? '✓' : ''}</td>
        <td>${esc(cat)} — ${esc(short)}</td>
      </tr>`;
    }).join('');
    atoms.push({
      html: `<table class="p-tbl">
        <thead><tr><th>${L('காலம்', 'Period', dl)}</th><th class="n c">${L('வயது', 'Age', dl)}</th><th>${L('தசா–புக்தி', 'Dasa–Bhukti', dl)}</th><th class="c">${L('நிலை', 'St', dl)}</th><th>${L('சுருக்க பலன்', 'Life-phase Summary', dl)}</th></tr></thead>
        <tbody>${body}</tbody></table>`,
    });
  }
  return atoms;
}

function doshaText(hasDosha: boolean, cancelled: boolean, dl: DocLang): string {
  const base = hasDosha ? L('செவ்வாய் தோஷம் உள்ளது', 'Kuja dosha present', dl) : L('தோஷம் இல்லை', 'No dosha', dl);
  return base + (cancelled ? L(' (குரு/சந்திர ராசி ரத்து)', ' (cancelled by Guru/Moon-rasi rule)', dl) : '');
}

export function sectionMarriage(pd: PdfPoruthamData, dl: DocLang): Atom[] {
  const r = pd.result;
  const rowsA = r.moduleA.rows.map((x) => `<tr><td class="pk">${esc(BI(x.name, dl))}</td><td>${esc(BI(x.status, dl))}</td><td class="n c">${x.points}/${x.max}</td><td>${esc(BI(x.detail, dl))}</td></tr>`).join('');
  const rowsE = r.moduleE.rows.map((x) => `<tr><td class="pk">${esc(BI(x.name, dl))}</td><td>${esc(BI(x.status, dl))}</td><td class="n c">${x.points}/${x.max}</td><td>${esc(BI(x.detail, dl))}</td></tr>`).join('');
  const html1 = `
    <div class="p-h2">${L('8. திருமணப் பொருத்தம் & 20 ஆண்டு ஆய்வு', '8. Marriage Compatibility & 20-Year Stability Report', dl)}</div>
    <div class="p-sub">${esc(pd.bride)} · ${esc(pd.groom)}</div>
    <div class="p-verdict">
      <span class="vt">${esc(BI(r.moduleF.verdict, dl))}</span>
      <span class="vs">${r.moduleF.total} / 100</span>
    </div>
    <div class="p-h3">${L('மாட்யூல் A — 10 பொருத்தங்கள் (71 மதிப்பெண்கள்)', 'Module A — The 10 Poruthams (71 points)', dl)}</div>
    <table class="p-tbl">
      <thead><tr><th>${L('பொருத்தம்', 'Porutham', dl)}</th><th>${L('நிலை', 'Status', dl)}</th><th class="n c">${L('மதிப்பெண்', 'Pts', dl)}</th><th>${L('விளக்கம்', 'Detail', dl)}</th></tr></thead>
      <tbody>${rowsA}</tbody>
    </table>
    <div class="p-h3">${L('மாட்யூல் B — செவ்வாய் தோஷம் & ராகு/கேது', 'Module B — Kuja Dosha & Rahu/Ketu', dl)}</div>
    <div class="p-body"><p>
      ${L('மணமகள்', 'Bride', dl)}: ${esc(doshaText(r.moduleB.bride.hasDosha, r.moduleB.bride.cancelled, dl))}.
      ${L('மணமகன்', 'Groom', dl)}: ${esc(doshaText(r.moduleB.groom.hasDosha, r.moduleB.groom.cancelled, dl))}.
      ${esc(BI(r.moduleB.verdict, dl))} (${r.moduleB.score}/30)
    </p></div>
  `;
  const html2 = `
    <div class="p-h3">${L('மாட்யூல் C — சர்ப்ப தோஷம்', 'Module C — Sarpa Dosha', dl)}</div>
    <div class="p-body"><p>${L('மணமகள்', 'Bride', dl)}: ${esc(BI(r.moduleC.brideSarpa, dl))} · ${L('மணமகன்', 'Groom', dl)}: ${esc(BI(r.moduleC.groomSarpa, dl))}<br/>${esc(BI(r.moduleC.verdict, dl))} (${r.moduleC.score}/10)</p></div>
    <div class="p-h3">${L('மாட்யூல் D — தசா சந்தி & பாதுகாப்பு ஜன்னல்கள்', 'Module D — Dasa Sandhi Windows', dl)}</div>
    <table class="p-tbl">
      <thead><tr><th>${L('தேதி', 'Date', dl)}</th><th>${L('வகை', 'Kind', dl)}</th><th>${L('விளக்கம்', 'Detail', dl)}</th></tr></thead>
      <tbody>${r.moduleD.windows.map((w) => `<tr><td class="n pk">${esc(w.date)}</td><td>${esc(BI({ ta: w.kind === 'sandhi' ? 'தசா சந்தி' : w.kind === 'sameMaha' ? 'ஒரே மகாதசை' : w.kind === 'sameMahaBhukti' ? 'மகாதசை-புக்தி' : 'பாதுகாப்பு', en: w.kind }, dl))}</td><td>${esc(BI(w.detail, dl))}</td></tr>`).join('')}</tbody>
    </table>
    <div class="p-note">${esc(BI(r.moduleD.summary, dl))}</div>
    <div class="p-h3">${L('மாட்யூல் E — நவீன பொருத்தங்கள்', 'Module E — Adaptive (Modern) Poruthams', dl)}</div>
    <table class="p-tbl">
      <thead><tr><th>${L('பொருத்தம்', 'Porutham', dl)}</th><th>${L('நிலை', 'Status', dl)}</th><th class="n c">${L('மதிப்பெண்', 'Pts', dl)}</th><th>${L('விளக்கம்', 'Detail', dl)}</th></tr></thead>
      <tbody>${rowsE}</tbody>
    </table>
    <div class="p-h3">${L('மாட்யூல் F — 20-ஆண்டு குடும்ப நிலைத்தன்மை', 'Module F — 20-Year Family Stability', dl)}</div>
    <div class="p-body">
      <p><b>${L('வலிமைகள்', 'Strengths', dl)}:</b> ${r.moduleF.strengths.map((s) => esc(BI(s, dl))).join(' · ')}</p>
      <p><b>${L('எச்சரிக்கைகள்', 'Cautions', dl)}:</b> ${r.moduleF.cautions.map((s) => esc(BI(s, dl))).join(' · ')}</p>
      <p>${esc(BI(r.moduleF.outlook, dl))}</p>
    </div>
  `;
  return [{ html: html1 }, { html: html2 }];
}

export function sectionReference(dl: DocLang): Atom[] {
  const rasiRows = RASI_REF.map((r) => `<tr>
    <td class="pk">${esc(L(r.ta, r.en, dl))}</td>
    <td>${r.lords.map((l) => esc(pn(l, dl))).join(', ')}</td>
    <td>${r.exalt.map((e) => `${esc(pn(e.planet, dl))} ${e.degree}°${e.traditional ? '†' : ''}`).join(', ') || '—'}</td>
    <td>${r.debil.map((e) => `${esc(pn(e.planet, dl))} ${e.degree}°${e.traditional ? '†' : ''}`).join(', ') || '—'}</td>
  </tr>`).join('');
  const dasaLine = Object.keys(DASA_YEARS).map((p) => `${PLANET_NAMES[p].ta} ${DASA_YEARS[p]}y`).join(' · ');
  const atoms: Atom[] = [{
    html: `
      <div class="p-h2">${L('9. ஜோதிட அடிப்படை வழிகாட்டி', '9. Jothidam Reference Guide Appendix', dl)}</div>
      <div class="p-h3">${L('ராசி ஆட்சி/உச்சம்/நீச்சம் அட்டவணை', 'Rasi Dignity Table (Own / Exaltation / Debilitation)', dl)}</div>
      <table class="p-tbl">
        <thead><tr><th>${L('ராசி', 'Rasi', dl)}</th><th>${L('ஆட்சி', 'Own Lords', dl)}</th><th>${L('உச்சம் (பரமோச்சம்)', 'Exalt (Paramocham)', dl)}</th><th>${L('நீச்சம் (பரமோநீச்சம்)', 'Debil (Paramoneecham)', dl)}</th></tr></thead>
        <tbody>${rasiRows}</tbody>
      </table>
      <div class="p-note">† ${L('ராகு/கேது மரபு நிலைகள்', 'Rahu/Ketu traditional positions', dl)}</div>
      <div class="p-h3">${L('விம்சோத்தரி தசா ஆண்டுகள்', 'Vimshottari Dasa Years', dl)}</div>
      <div class="p-sub">${esc(dasaLine)}</div>
    `,
  }];
  const chunk = 14;
  for (let i = 0; i < NAKSHATRA_REF.length; i += chunk) {
    const rows = NAKSHATRA_REF.slice(i, i + chunk).map((n) => `<tr>
      <td class="n c pk">${n.index + 1}</td>
      <td class="pk">${esc(L(n.ta, n.en, dl))}</td>
      <td class="n">${Math.floor(n.startDeg)}°–${Math.floor(n.endDeg)}°</td>
      <td>${esc(pn(n.lord, dl))}</td>
      <td class="n c">${DASA_YEARS[n.lord]}y</td>
    </tr>`).join('');
    atoms.push({
      html: `${i === 0 ? `<div class="p-h3">${L('27 நட்சத்திரங்கள் & அதிபதிகள்', '27 Nakshatras & Star Lords', dl)}</div>` : ''}
      <table class="p-tbl">
        <thead><tr><th class="n c">#</th><th>${L('நட்சத்திரம்', 'Nakshatra', dl)}</th><th class="n">${L('பாகை வீச்சு', 'Span', dl)}</th><th>${L('அதிபதி', 'Lord', dl)}</th><th class="n c">${L('தசா', 'Dasa', dl)}</th></tr></thead>
        <tbody>${rows}</tbody></table>`,
    });
  }
  const bhRows = BHAVA_REF.map((b) => `<tr>
    <td class="n c pk">${b.house}</td>
    <td class="pk">${esc(L(b.ta, b.en, dl))} (${esc(b.sanskrit)})</td>
    <td>${b.categories.map((c) => esc(BI(c, dl))).join(' · ')}</td>
    <td>${b.significations.map((s) => esc(BI(s, dl))).join(', ')}</td>
  </tr>`).join('');
  atoms.push({
    html: `
      <div class="p-h3">${L('12 பாவங்கள் — காரகத்துவம்', '12 Bhavas — Significations', dl)}</div>
      <table class="p-tbl">
        <thead><tr><th class="n c">${L('வீடு', 'H', dl)}</th><th>${L('பெயர்', 'Name', dl)}</th><th>${L('பிரிவுகள்', 'Categories', dl)}</th><th>${L('காரகத்துவம்', 'Significations', dl)}</th></tr></thead>
        <tbody>${bhRows}</tbody></table>
    `,
  });
  return atoms;
}

// ---------- pagination + render ----------
async function generatePdf(
  d: Dossier, rows: TimelineRow[], porutham: PdfPoruthamData | null,
  dl: DocLang, selected: Set<number>, onProgress: (s: string) => void,
): Promise<{ url: string; filename: string }> {
  const generated = fmtDate(new Date());
  const atoms: Atom[] = [];
  if (selected.has(1)) atoms.push(...sectionCharts(d, dl));
  if (selected.has(2)) atoms.push(...section36Months(d, dl));
  if (selected.has(3)) atoms.push(...sectionTimeline(rows, dl));
  if (selected.has(4)) atoms.push(...sectionEphemeris(d, dl));
  if (selected.has(5)) atoms.push(...sectionInspector(d, dl));
  if (selected.has(6)) atoms.push(...sectionStrength(d, dl));
  if (selected.has(7)) atoms.push(...sectionPredictions(d, dl));
  if (selected.has(8) && porutham) atoms.push(...sectionMarriage(porutham, dl));
  if (selected.has(9)) atoms.push(...sectionReference(dl));

  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([import('jspdf'), import('html2canvas')]);

  let stage = document.getElementById('pdf-stage');
  if (!stage) {
    const style = document.createElement('style');
    style.textContent = PDF_CSS;
    document.head.appendChild(style);
    stage = document.createElement('div');
    stage.id = 'pdf-stage';
    document.body.appendChild(stage);
  }
  stage.innerHTML = '';
  const fs = (document as Document & { fonts: FontFaceSet }).fonts;
  await Promise.all([
    fs.load('400 16px "Noto Sans Tamil"'), fs.load('600 16px "Noto Sans Tamil"'), fs.load('700 16px "Noto Sans Tamil"'),
    fs.load('400 16px "Plus Jakarta Sans"'), fs.load('600 16px "Plus Jakarta Sans"'), fs.load('700 16px "Plus Jakarta Sans"'),
    fs.load('400 16px "JetBrains Mono"'), fs.load('500 16px "JetBrains Mono"'),
  ]).catch(() => undefined);
  await fs.ready;

  // measure each atom
  const meas = document.createElement('div');
  meas.className = 'p-atom';
  stage.appendChild(meas);
  const heights = atoms.map((a) => {
    meas.innerHTML = a.html;
    return meas.offsetHeight;
  });
  stage.removeChild(meas);

  // greedy pack into pages (content capacity ≈ 1123 − 64 − 52 with safety margin)
  const CAPACITY = 965;
  const packed: Atom[][] = [];
  let page: Atom[] = [];
  let used = 0;
  for (let i = 0; i < atoms.length; i++) {
    const h = heights[i] * 1.04 + 2;
    if (used + h > CAPACITY && page.length > 0) { packed.push(page); page = []; used = 0; }
    page.push(atoms[i]);
    used += h + 8;
  }
  if (page.length > 0) packed.push(page);

  const moon = d.grahas.find((g) => g.id === 'Moon')!;
  const head = `<div class="p-head">
    <span><b>${esc(profileName(d.profile.name, dl))}</b> · ${L('லக்னம்', 'Lagna', dl)} ${esc(rasiName(d.lagnaRasi, dl))} ${degMin(d.lagnaLon % 30)} · ${L('ராசி', 'Rasi', dl)} ${esc(rasiName(moon.rasi, dl))} · ${L('நட்சத்திரம்', 'Star', dl)} ${esc(nakName(moon.nakIdx, dl))} ${moon.pada} · ${esc(d.profile.panchangamMode)}</span>
    <span>${dl === 'ta' ? 'தமிழ்' : dl === 'en' ? 'English' : 'தமிழ் + English'}</span>
  </div>`;

  const pageEls: HTMLElement[] = [];
  packed.forEach((pageAtoms, i) => {
    const el = document.createElement('div');
    el.className = 'p-page';
    el.innerHTML = `${head}<div class="p-body">${pageAtoms.map((a) => a.html).join('')}</div>
      <div class="p-foot"><span>${L('மித்ரன் பிரிடிக்ஷன்ஸ் — ஜோதிட எஞ்சின்', 'Mithran Predictions — Jothidam Engine', dl)} · ${generated}</span>
      <span class="n">${L('பக்கம்', 'Page', dl)} ${i + 1} / ${packed.length}</span></div>`;
    stage!.appendChild(el);
    pageEls.push(el);
  });

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  for (let i = 0; i < pageEls.length; i++) {
    onProgress(`${i + 1} / ${pageEls.length}`);
    await new Promise((r) => requestAnimationFrame(r));
    const canvas = await html2canvas(pageEls[i], { scale: 2, backgroundColor: '#ffffff', logging: false });
    if (i > 0) pdf.addPage();
    // Palette PNG (1 byte/pixel inside the PDF) — falls back to plain PNG on old platforms.
    const img = (await canvasToIndexedPngDataUrl(canvas)) ?? canvas.toDataURL('image/png');
    pdf.addImage(img, 'PNG', 0, 0, 210, 297, undefined, 'SLOW');
  }
  const nameForFile = d.profile.name === DEFAULT_PROFILE_NAME
    ? 'Tamizh'
    : (d.profile.name.trim().replace(/\s+/g, '_').replace(/[^\w\u0B80-\u0BFF-]/g, '') || 'Jathagam');
  const filename = `${nameForFile}_Jathagam_${d.profile.date}.pdf`;
  const out = pdf.output('bloburl') as unknown as string | URL;
  const url = typeof out === 'string' ? out : out.href;
  stage.innerHTML = '';
  return { url, filename };
}

// ---------- modal UI ----------
export default function PdfDossier({ d, rows, porutham, uiLang }: {
  d: Dossier; rows: TimelineRow[]; porutham: PdfPoruthamData | null; uiLang: Lang;
}) {
  const [open, setOpen] = useState(false);
  const [docLang, setDocLang] = useState<DocLang>(uiLang);
  const [selected, setSelected] = useState<Set<number>>(new Set(DEFAULT_SECTION_IDS));
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState<{ url: string; filename: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Esc closes the modal at any time; background scroll is locked while it is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open]);

  const enabled = (id: number) => id !== 8 || porutham !== null;
  const count = SECTIONS.filter((s) => selected.has(s.id)).length;
  const setAll = (on: boolean) => setSelected(on ? new Set(SECTIONS.filter((s) => enabled(s.id)).map((s) => s.id)) : new Set());
  const toggle = (id: number) => {
    if (!enabled(id)) return;
    const n = new Set(selected);
    if (n.has(id)) n.delete(id); else n.add(id);
    setSelected(n);
  };

  const run = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const r = await generatePdf(d, rows, porutham, docLang, selected, setProgress);
      setResult(r);
      // Auto-download (works in normal browsers; sandboxed previews block it — the panel below covers that).
      try {
        const a = document.createElement('a');
        a.href = r.url;
        a.download = r.filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch { /* blocked by sandbox — inline preview remains available */ }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  return (
    <>
      <button className="pdf-btn" onClick={() => setOpen(true)}>
        <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M8 1.5v8m0 0L5 6.5m3 3 3-3M2.5 11v2a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-2" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {uiLang === 'ta' ? 'ஜாதகக் குறிப்பு பதிவிறக்கம்' : 'Download Jathagam PDF'}
      </button>

      {open && (
        <div className="modal-backdrop" onClick={() => !busy && setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{uiLang === 'ta' ? 'ஜாதகக் குறிப்பு பதிவிறக்கம்' : 'Download Jathagam PDF Dossier'}</h3>
              <button type="button" className="modal-x" onClick={() => setOpen(false)} aria-label={uiLang === 'ta' ? 'மூடு' : 'Close'} title={uiLang === 'ta' ? 'மூடு (Esc)' : 'Close (Esc)'}>×</button>
            </div>

            {result && (
              <div className="pdf-result">
                <div className="pdf-result-head">
                  <span className="pdf-ready">{uiLang === 'ta' ? 'PDF தயார் —' : 'PDF ready —'} <b>{result.filename}</b></span>
                  <a className="primary-btn" href={result.url} download={result.filename}>
                    {uiLang === 'ta' ? 'பதிவிறக்கு / Download' : 'Download PDF'}
                  </a>
                  <button className="pdf-btn" onClick={() => { setResult(null); }}>
                    {uiLang === 'ta' ? 'மீண்டும் உருவாக்கு' : 'Generate Again'}
                  </button>
                  <button type="button" className="modal-x" onClick={() => setOpen(false)} aria-label={uiLang === 'ta' ? 'மூடு' : 'Close'} title={uiLang === 'ta' ? 'மூடு (Esc)' : 'Close (Esc)'}>×</button>
                </div>
              </div>
            )}

            {!result && (<>
            <div className="modal-row">
              <span className="modal-label">{uiLang === 'ta' ? 'மொழி' : 'Language'}</span>
              <div className="seg">
                {([['ta', 'தமிழ் மட்டும்', 'Tamil Only'], ['en', 'English மட்டும்', 'English Only'], ['bi', 'இருமொழி', 'Bilingual']] as const).map(([k, ta, en]) => (
                  <button key={k} className={docLang === k ? 'on' : ''} onClick={() => setDocLang(k)}>{uiLang === 'ta' ? ta : en}</button>
                ))}
              </div>
            </div>

            <div className="modal-row">
              <span className="modal-label">{uiLang === 'ta' ? 'பக்க அமைப்பு' : 'Layout'}</span>
              <span className="modal-fixed">{uiLang === 'ta' ? 'A4 செங்குத்து (அச்சு-தயார் பஞ்சாங்க வடிவம்)' : 'A4 Portrait (Print-Ready Panchangam Format)'}</span>
            </div>

            <div className="modal-row">
              <label className="modal-check master">
                <input type="checkbox" checked={count === SECTIONS.filter((s) => enabled(s.id)).length} onChange={(e) => setAll(e.target.checked)} />
                <span>{uiLang === 'ta' ? 'அனைத்தையும் தேர்ந்தெடு' : 'Select All'}</span>
              </label>
              <button className="pdf-btn" onClick={() => setSelected(new Set(DEFAULT_SECTION_IDS.filter(enabled)))}>
                {uiLang === 'ta' ? 'இயல்புநிலை 3 பகுதிகள்' : 'Reset to Default 3'}
              </button>
            </div>

            <div className="modal-sections">
              {SECTIONS.map((s) => (
                <label key={s.id} className={`modal-check${enabled(s.id) ? '' : ' disabled'}`}>
                  <input type="checkbox" checked={selected.has(s.id)} disabled={!enabled(s.id)} onChange={() => toggle(s.id)} />
                  <span className="num">{s.id}</span>
                  <span>{uiLang === 'ta' ? s.ta : s.en}</span>
                  {!enabled(s.id) && <span className="modal-req">{uiLang === 'ta' ? 'மணமகன்/மணமகள் விவரம் தேவை' : 'Needs bride & groom charts'}</span>}
                </label>
              ))}
            </div>

            {error && (
              <div className="pdf-error">{uiLang === 'ta' ? 'பிழை: ' : 'Error: '}{error}</div>
            )}
            <div className="modal-foot">
              <span className="modal-count">{count} / 9 {uiLang === 'ta' ? 'பகுதிகள் தேர்ந்தெடுக்கப்பட்டுள்ளன' : 'Sections Selected'}</span>
              <button className="primary-btn" disabled={count === 0 || busy} onClick={run}>
                {busy
                  ? (uiLang === 'ta' ? `உருவாக்கப்படுகிறது… ${progress}` : `Generating… ${progress}`)
                  : (uiLang === 'ta' ? 'உறுதி செய்து PDF பதிவிறக்கு' : 'Confirm & Download PDF')}
              </button>
            </div>
            </>)}
          </div>
        </div>
      )}
    </>
  );
}
