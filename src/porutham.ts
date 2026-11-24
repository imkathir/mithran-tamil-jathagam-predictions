// Marriage Compatibility & Jothidam Porutham engine
// Modules A–F: 10 Nakshatra Poruthams, Kuja Dosha + exceptions, Rahu-Ketu dosha,
// Dasa Sandhi / collision timeline (25 years), cross-chart Bhava & Graha analysis, final verdict.
import type { Dossier, Bilingual } from './engine';
import { GRAHA_INFO, RASI, NAKSHATRA, houseFrom, FRIENDS, ENEMIES, OWN, RASI_LORDS, NATURAL_MALEFIC } from './engine';
import { YR, fmtLong } from './timeline';

const gm = (d: Dossier, id: string) => d.grahas.find((g) => g.id === id)!;

// ---------- Classical tables (index 0–26 = Ashwini..Revathi) ----------
// Gana: D = Deva, M = Manushya, R = Rakshasa
const GANA = 'DMRMDRDDRMMDRDRDRRMMDRRMMMD'.split('');
// Yoni animals
const YONI = [
  'Horse', 'Elephant', 'Sheep', 'Serpent', 'Serpent', 'Dog', 'Cat', 'Sheep', 'Cat', 'Rat', 'Rat',
  'Buffalo', 'Buffalo', 'Tiger', 'Tiger', 'Lion', 'Lion', 'Mongoose', 'Dog', 'Bear', 'Bear',
  'Cow', 'Cow', 'Horse', 'Monkey', 'Monkey', 'Elephant',
];
const YONI_TA: Record<string, string> = {
  Horse: 'குதிரை', Elephant: 'யானை', Sheep: 'ஆடு', Serpent: 'பாம்பு', Dog: 'நாய்', Cat: 'பூனை',
  Rat: 'எலி', Buffalo: 'எருமை', Tiger: 'புலி', Lion: 'சிங்கம்', Mongoose: 'கீரி', Bear: 'கரடி',
  Cow: 'பசு', Monkey: 'குரங்கு',
};
const YONI_ENEMIES = new Set(['Rat-Cat', 'Cat-Rat', 'Elephant-Lion', 'Lion-Elephant', 'Horse-Buffalo', 'Buffalo-Horse', 'Serpent-Mongoose', 'Mongoose-Serpent', 'Tiger-Cow', 'Cow-Tiger', 'Monkey-Sheep', 'Sheep-Monkey']);
// Rajju groups
const RAJJU: Record<string, number[]> = {
  Sira: [0, 8, 9, 17, 18, 26], Kanta: [1, 7, 10, 16, 19, 24], Uru: [2, 6, 11, 15, 20, 25],
  Thodai: [3, 5, 12, 14, 21], Pada: [4, 13, 22, 23],
};
const RAJJU_TA: Record<string, string> = { Sira: 'சிர (தலை)', Kanta: 'கண்ட (கழுத்து)', Uru: 'உரு (உடை)', Thodai: 'தோடை (கை)', Pada: 'பாத (கால்)' };
const rajjuOf = (idx: number) => Object.keys(RAJJU).find((k) => RAJJU[k].includes(idx))!;
// Vasya groups by rasi
const VASYA = ['Chatushpada', 'Chatushpada', 'Manava', 'Jalachara', 'Vanachara', 'Manava', 'Manava', 'Keeta', 'Chatushpada', 'Jalachara', 'Manava', 'Jalachara'];
const VASYA_TA: Record<string, string> = { Chatushpada: 'சதுष்பாதம் (நால்கால்)', Manava: 'மானவம் (மனிதம்)', Jalachara: 'ஜலசரம் (நீர்வாழ்)', Vanachara: 'வனசரம் (காட்டுயிர்)', Keeta: 'கீடம் (பூச்சி)' };

// Vasiya pairs
function vasiyaScore(bRasi: number, gRasi: number): { pts: number; detail: Bilingual } {
  const b = VASYA[bRasi], g = VASYA[gRasi];
  if (b === g) return { pts: 10, detail: { ta: `இருவரும் ${VASYA_TA[b]} — சிறந்த வசியம்`, en: `Both ${b} — excellent Vasiyam` } };
  const pair = [b, g].sort().join('-');
  if (pair === 'Chatushpada-Manava') return { pts: 6, detail: { ta: 'சதுஷ்பாதம்–மானவம் — நல்ல வசியம்', en: 'Chatushpada–Manava — good Vasiyam' } };
  if (pair === 'Chatushpada-Jalachara') return { pts: 5, detail: { ta: 'சதுஷ்பாதம்–ஜலசரம் — மத்திம வசியம்', en: 'Chatushpada–Jalachara — moderate Vasiyam' } };
  return { pts: 2, detail: { ta: `${VASYA_TA[b]}–${VASYA_TA[g]} — குறைந்த வசியம்`, en: `${b}–${g} — low Vasiyam` } };
}

export interface PoruthamRow { key: string; name: Bilingual; status: Bilingual; points: number; max: number; detail: Bilingual }
export interface DoshaInfo {
  hasDosha: boolean; cancelled: boolean;
  positions: { from: string; house: number }[];
  exceptions: Bilingual[];
}
export interface SandhiWindow { date: string; kind: 'sandhi' | 'sameMaha' | 'sameMahaBhukti' | 'protective'; detail: Bilingual }
export interface PoruthamResult {
  moduleA: { rows: PoruthamRow[]; score: number };
  moduleB: { bride: DoshaInfo; groom: DoshaInfo; verdict: Bilingual; verdictKey: string; score: number };
  moduleC: { brideSarpa: Bilingual; groomSarpa: Bilingual; verdict: Bilingual; score: number };
  moduleD: { windows: SandhiWindow[]; score: number; summary: Bilingual };
  moduleE: { rows: PoruthamRow[]; score: number };
  moduleF: { total: number; verdict: Bilingual; verdictKey: string; strengths: Bilingual[]; cautions: Bilingual[]; outlook: Bilingual };
}

function statusOf(pts: number, max: number): Bilingual {
  const r = pts / max;
  if (r >= 0.8) return { ta: 'உத்தமம்', en: 'High' };
  if (r >= 0.45) return { ta: 'மத்திமம்', en: 'Moderate' };
  return { ta: 'பொருத்தமில்லை', en: 'Mismatch' };
}

// ---------- Module A: 10 Nakshatra Poruthams ----------
function moduleA(bride: Dossier, groom: Dossier): { rows: PoruthamRow[]; score: number } {
  const B = gm(bride, 'Moon').nakIdx, G = gm(groom, 'Moon').nakIdx;
  const count = ((G - B + 27) % 27) + 1;
  const rows: PoruthamRow[] = [];
  const row = (key: string, ta: string, en: string, pts: number, dta: string, den: string) =>
    rows.push({ key, name: { ta, en }, status: statusOf(pts, 10), points: pts, max: 10, detail: { ta: dta, en: den } });

  // 1. Dinam
  const n = ((count - 1) % 9) + 1;
  const dinGood = [2, 4, 6, 8, 9].includes(n);
  const dinNames = ['', 'ஜன்மம்', 'சம்பத்', 'விபத்', 'க்ஷேமம்', 'பிரத்யக்', 'சாதனம்', 'நைதனம்', 'மித்ரம்', 'அதி மித்ரம்'];
  row('dinam', 'தினம்', 'Dinam', dinGood ? 10 : 1,
    `${count}-வது நட்சத்திர எண் (${dinNames[n]}) — ${dinGood ? 'உத்தமம்: ஆரோக்கியம், நீண்ட ஆயுள்' : 'ஜன்ம/விபத் நிலை — கவனம் தேவை'}`,
    `Star count ${count} (${dinNames[n]}) — ${dinGood ? 'auspicious: health & longevity' : 'Janma/Vipat class — needs care'}`);

  // 2. Ganam
  const gb = GANA[B], gg = GANA[G];
  const gPts = gb === gg ? 10 : (gb !== 'R' && gg !== 'R') ? 6 : 2;
  row('ganam', 'கணம்', 'Ganam', gPts,
    `பெண் ${gb === 'D' ? 'தேவகணம்' : gb === 'M' ? 'மானுஷ கணம்' : 'ராட்சச கணம்'} · ஆண் ${gg === 'D' ? 'தேவகணம்' : gg === 'M' ? 'மானுஷ கணம்' : 'ராட்சச கணம்'}`,
    `Bride ${gb === 'D' ? 'Deva' : gb === 'M' ? 'Manushya' : 'Rakshasa'} · Groom ${gg === 'D' ? 'Deva' : gg === 'M' ? 'Manushya' : 'Rakshasa'}`);

  // 3. Mahendram
  const mRes = count % 9;
  const mGood = [4, 7, 8, 0].includes(mRes);
  row('mahendram', 'மகேந்திரம்', 'Mahendram', mGood ? 10 : 2,
    `எண் ${count} — ${mGood ? 'புத்திர பாக்கியம், செல்வ வளர்ச்சி யோகம்' : 'மத்திமம்'}`,
    `Count ${count} — ${mGood ? 'progeny & prosperity yoga' : 'moderate'}`);

  // 4. Sthree Deergam
  const sdPts = count > 9 ? 10 : count >= 7 ? 6 : 2;
  row('sthree', 'ஸ்திரீ தீர்க்கம்', 'Sthree Deergam', sdPts,
    `பெண் நட்சத்திரத்திலிருந்து ஆண் ${count} நட்சத்திர தூரம் — ${count > 9 ? 'தீர்க்க ஆயுள் யோகம்' : count >= 7 ? 'மத்திமம்' : 'தூரம் குறைவு'}`,
    `Groom's star is ${count} from bride's — ${count > 9 ? 'long-life yoga' : count >= 7 ? 'moderate' : 'too close'}`);

  // 5. Yoni
  const yb = YONI[B], yg = YONI[G];
  const yEnemy = YONI_ENEMIES.has(`${yb}-${yg}`);
  const yPts = yb === yg ? 10 : yEnemy ? 0 : 5;
  row('yoni', 'யோனி', 'Yoni', yPts,
    `பெண் ${YONI_TA[yb]} · ஆண் ${YONI_TA[yg]} — ${yb === yg ? 'ஒரே யோனி (உத்தமம்)' : yEnemy ? 'எதிர் யோனி (பொருத்தமில்லை)' : 'மத்திம யோனி'}`,
    `Bride ${yb} · Groom ${yg} — ${yb === yg ? 'same yoni (excellent)' : yEnemy ? 'enemy yoni (mismatch)' : 'neutral yoni'}`);

  // 6. Rasi
  const br = gm(bride, 'Moon').rasi, gr = gm(groom, 'Moon').rasi;
  const rDist = ((gr - br + 12) % 12) + 1;
  const rPts = [6, 8].includes(rDist) ? 0 : [2, 12].includes(rDist) ? 4 : [5, 9].includes(rDist) ? 10 : rDist === 7 ? 9 : 8;
  row('rasi', 'ராசி', 'Rasi', rPts,
    `பெண் ${RASI[br].ta} → ஆண் ${RASI[gr].ta} (${rDist} ஆம் ராசி) — ${[6, 8].includes(rDist) ? '6/8 சஷ்டாஷ்டகம் (பொருத்தமில்லை)' : [2, 12].includes(rDist) ? '2/12 துவிர்துவாதசம் (மத்திமம்)' : [5, 9].includes(rDist) ? '5/9 திரிகோணம் (உத்தமம்)' : 'ஏற்புடைய ராசி தூரம்'}`,
    `Bride ${RASI[br].en.split(' ')[0]} → Groom ${RASI[gr].en.split(' ')[0]} (${rDist}th) — ${[6, 8].includes(rDist) ? '6/8 Shashtashtaka (mismatch)' : [2, 12].includes(rDist) ? '2/12 Dwirdwadasa (moderate)' : [5, 9].includes(rDist) ? '5/9 Trikona (excellent)' : 'acceptable distance'}`);

  // 7. Rasiyadhipathi
  const lb = RASI_LORDS[br], lg = RASI_LORDS[gr];
  const rlPts = lb === lg ? 8 : FRIENDS[lb]?.includes(lg) ? 10 : ENEMIES[lb]?.includes(lg) ? 0 : 5;
  row('rasiadhipathi', 'ராசியாதிபதி', 'Rasiyadhipathi', rlPts,
    `${GRAHA_INFO[lb].ta} (பெண்) · ${GRAHA_INFO[lg].ta} (ஆண்) — ${lb === lg ? 'ஒரே அதிபதி' : rlPts === 10 ? 'இயற்கை நட்பு' : rlPts === 0 ? 'இயற்கை பகை' : 'நடுநிலை'}`,
    `${lb} (bride) · ${lg} (groom) — ${lb === lg ? 'same lord' : rlPts === 10 ? 'natural friends' : rlPts === 0 ? 'natural enemies' : 'neutral'}`);

  // 8. Vasiyam
  const v = vasiyaScore(br, gr);
  row('vasiyam', 'வசியம்', 'Vasiyam', v.pts, v.detail.ta, v.detail.en);

  // 9. Rajju (critical)
  const rb = rajjuOf(B), rg = rajjuOf(G);
  const rjPts = rb === rg ? 0 : 10;
  row('rajju', 'ரஜ்ஜு', 'Rajju', rjPts,
    `பெண் ${RAJJU_TA[rb]} · ஆண் ${RAJJU_TA[rg]} — ${rb === rg ? 'ஒரே ரஜ்ஜு (கவனம் — சமாதான பொருத்தம் வேண்டும்)' : 'வேறு ரஜ்ஜு (உத்தமம்)'}`,
    `Bride ${rb} · Groom ${rg} — ${rb === rg ? 'same Rajju (critical — remedy match needed)' : 'different Rajju (excellent)'}`);

  // 10. Vedhai
  const vedhaiPair = (B + 15) % 27 === G;
  row('vedhai', 'வேதை', 'Vedhai', vedhaiPair ? 0 : 10,
    vedhaiPair ? `${NAKSHATRA[B].ta}–${NAKSHATRA[G].ta} வேதை ஜோடி (பொருத்தமில்லை)` : 'வேதை இல்லை (உத்தமம்)',
    vedhaiPair ? `${NAKSHATRA[B].en}–${NAKSHATRA[G].en} vedhai pair (mismatch)` : 'No vedhai (excellent)');

  const score = Math.round(rows.reduce((s, r) => s + r.points, 0));
  return { rows, score };
}

// ---------- Module B: Kuja Dosha ----------
function kujaDosha(d: Dossier): DoshaInfo {
  const mars = gm(d, 'Mars'), jup = gm(d, 'Jupiter'), ven = gm(d, 'Venus'), moon = gm(d, 'Moon');
  const positions: { from: string; house: number }[] = [];
  (['Lagna', 'Moon', 'Venus'] as const).forEach((from) => {
    const base = from === 'Lagna' ? d.lagnaRasi : from === 'Moon' ? moon.rasi : ven.rasi;
    const h = houseFrom(base, mars.rasi);
    if ([2, 4, 7, 8, 12].includes(h)) positions.push({ from, house: h });
  });
  const hasDosha = positions.length > 0;
  const exceptions: Bilingual[] = [];
  if (OWN.Mars.includes(mars.rasi)) exceptions.push({ ta: `செவ்வாய் ஆட்சி (${RASI[mars.rasi].ta})`, en: `Mars in own sign (${RASI[mars.rasi].en.split(' ')[0]})` });
  if (mars.rasi === 9) exceptions.push({ ta: 'செவ்வாய் உச்சம் (மகரம்)', en: 'Mars exalted (Makara)' });
  const jupAspectsMars = jup.aspectDetails.some((a) => a.targetRasi === mars.rasi && !a.traditional);
  const jupConjMars = jup.rasi === mars.rasi;
  if (jupAspectsMars || jupConjMars) exceptions.push({ ta: `குரு பார்வை/சேர்க்கை (குரு-சங்கயோகம்)`, en: `Jupiter aspect/conjunction (Guru-Mangala Yoga)` });
  if (mars.rasi === 4 || mars.rasi === 10) exceptions.push({ ta: 'செவ்வாய் சிம்மம்/கும்பத்தில்', en: 'Mars in Simha/Kumbha' });
  const lagnaRasi = d.lagnaRasi;
  if (lagnaRasi === 3 || lagnaRasi === 4) {
    const marsOwns = OWN.Mars.map((r) => houseFrom(lagnaRasi, r));
    if (marsOwns.includes(5) && marsOwns.includes(10)) exceptions.push({ ta: 'கடகம்/சிம்ம லக்னத்தில் யோககாரக செவ்வாய்', en: 'Mars Yogakaraka for Kataka/Simha Lagna' });
  }
  return { hasDosha, cancelled: hasDosha && exceptions.length > 0, positions, exceptions };
}

// ---------- Module C: Rahu-Ketu (Sarpa Dosha) ----------
function sarpaDosha(d: Dossier): { has: boolean; axes: string[]; jupiterMitigates: boolean } {
  const moon = gm(d, 'Moon'), rahu = gm(d, 'Rahu'), jup = gm(d, 'Jupiter');
  const axes: string[] = [];
  const check = (base: number, from: string) => {
    const h = houseFrom(base, rahu.rasi);
    if (h === 1 || h === 7) axes.push(`${from} 1-7`);
    if (h === 2 || h === 8) axes.push(`${from} 2-8`);
  };
  check(d.lagnaRasi, 'Lagna'); check(moon.rasi, 'Moon');
  const mitigates = jup.aspectDetails.some((a) => a.targetRasi === rahu.rasi && !a.traditional) || jup.rasi === rahu.rasi;
  return { has: axes.length > 0, axes, jupiterMitigates: mitigates };
}

// ---------- Module D: Dasa Sandhi & collisions (25 years) ----------
function moduleD(bride: Dossier, groom: Dossier, now: Date): { windows: SandhiWindow[]; score: number; summary: Bilingual } {
  const horizon = new Date(now.getTime() + 25 * YR);
  const changes = (d: Dossier) => d.dasa.filter((p) => p.end > now && p.start < horizon).map((p) => ({ lord: p.lord, start: p.start, end: p.end }));
  const bc = changes(bride), gc = changes(groom);
  const windows: SandhiWindow[] = [];
  let score = 72;

  // Dasa Sandhi: both change mahadasa within 12 months
  bc.forEach((b) => gc.forEach((g) => {
    const gap = Math.abs(b.start.getTime() - g.start.getTime()) / (365.25 * 86400000);
    if (gap <= 1 && b.start > now && g.start > now && b.start < horizon && g.start < horizon) {
      windows.push({
        date: fmtLong(b.start < g.start ? b.start : g.start, 'en'), kind: 'sandhi',
        detail: {
          ta: `தசா சந்திப்பு: ${fmtLong(b.start, 'ta')} (${GRAHA_INFO[b.lord].ta}) ↔ ${fmtLong(g.start, 'ta')} (${GRAHA_INFO[g.lord].ta}) — 12 மாதங்களுக்குள் இரு தசா மாற்றங்கள்`,
          en: `Dasa Sandhi: ${fmtLong(b.start, 'en')} (${b.lord}) ↔ ${fmtLong(g.start, 'en')} (${g.lord}) — both change within 12 months`,
        },
      });
      score -= 8;
    }
  }));

  // Same mahadasa / same maha+bhukti collisions
  const dusthanaLordIds = (d: Dossier) => {
    const s = new Set<string>();
    [6, 8, 12].forEach((h) => s.add(RASI_LORDS[(d.lagnaRasi + h - 1) % 12]));
    return s;
  };
  const bd = dusthanaLordIds(bride), gd = dusthanaLordIds(groom);
  bc.forEach((b) => gc.forEach((g) => {
    if (b.lord !== g.lord) return;
    const s = b.start > g.start ? b.start : g.start;
    const e = b.end < g.end ? b.end : g.end;
    if (e <= now || s >= horizon) return;
    const risky = bd.has(b.lord) || gd.has(b.lord) || NATURAL_MALEFIC.includes(b.lord);
    windows.push({
      date: fmtLong(s, 'en'), kind: risky ? 'sameMaha' : 'sameMahaBhukti',
      detail: {
        ta: `ஒரே மகாதசா: ${GRAHA_INFO[b.lord].ta} (${fmtLong(s, 'ta')} – ${fmtLong(e, 'ta')})${risky ? ' — துஷ்டான/பாவ அதிபதி; கவன காலம்' : ''}`,
        en: `Same Mahadasa: ${b.lord} (${fmtLong(s, 'en')} – ${fmtLong(e, 'en')})${risky ? ' — dusthana/malefic lord; careful window' : ''}`,
      },
    });
    score -= risky ? 12 : 5;
  }));

  // Protective: one partner runs kendra/trikona-lord dasa while other's is challenging
  const beneficLord = (d: Dossier, lord: string) => {
    const owned = (OWN[lord] ?? []).map((r) => houseFrom(d.lagnaRasi, r));
    return owned.some((h) => [1, 4, 5, 7, 9, 10].includes(h)) && !owned.some((h) => [6, 8, 12].includes(h));
  };
  bc.forEach((b) => gc.forEach((g) => {
    const s = b.start > g.start ? b.start : g.start;
    const e = b.end < g.end ? b.end : g.end;
    if (e <= now || s >= horizon) return;
    const bGood = beneficLord(bride, b.lord), gGood = beneficLord(groom, g.lord);
    if (bGood !== gGood) {
      const protector = bGood ? `பெண் ${GRAHA_INFO[b.lord].ta}` : `ஆண் ${GRAHA_INFO[g.lord].ta}`;
      const protectorEn = bGood ? `Bride ${b.lord}` : `Groom ${g.lord}`;
      windows.push({
        date: fmtLong(s, 'en'), kind: 'protective',
        detail: {
          ta: `பாதுகாப்பு காலம்: ${protector} கேந்திர/திரிகோண தசா — மற்றவரின் கடின தசாவை சமநிலைப்படுத்தும்`,
          en: `Protective period: ${protectorEn} Kendra/Trikona dasa offsets the partner's challenging dasa`,
        },
      });
      score += 5;
    }
  }));

  score = Math.max(15, Math.min(95, score));
  return {
    windows, score,
    summary: {
      ta: `அடுத்த 25 ஆண்டுகளில் ${windows.filter((w) => w.kind === 'sandhi').length} தசா சந்திப்புகள், ${windows.filter((w) => w.kind === 'sameMaha' || w.kind === 'sameMahaBhukti').length} ஒரே-தசா சந்திப்புகள், ${windows.filter((w) => w.kind === 'protective').length} பாதுகாப்பு காலங்கள்.`,
      en: `Over 25 years: ${windows.filter((w) => w.kind === 'sandhi').length} Dasa Sandhi windows, ${windows.filter((w) => w.kind === 'sameMaha' || w.kind === 'sameMahaBhukti').length} same-dasa collisions, ${windows.filter((w) => w.kind === 'protective').length} protective windows.`,
    },
  };
}

// ---------- Module E: Bhava & Graha cross-chart ----------
function moduleE(bride: Dossier, groom: Dossier): { rows: PoruthamRow[]; score: number } {
  const rows: PoruthamRow[] = [];
  const row = (key: string, ta: string, en: string, pts: number, dta: string, den: string) =>
    rows.push({ key, name: { ta, en }, status: statusOf(pts, 100), points: pts, max: 100, detail: { ta: dta, en: den } });

  const b7 = bride.bhavaBala[6].score, g7 = groom.bhavaBala[6].score;
  const p7 = Math.round((b7 + g7) / 2);
  row('kalathra', '7-ஆம் பாவம் (கலத்திரம்)', '7th House (Kalathra)', p7,
    `பெண் ${b7}/100 · ஆண் ${g7}/100 — சராசரி ${p7}`, `Bride ${b7}/100 · Groom ${g7}/100 — avg ${p7}`);

  const bLordId = RASI_LORDS[(bride.lagnaRasi + 6) % 12];
  const gLordId = RASI_LORDS[(groom.lagnaRasi + 6) % 12];
  const bL7 = gm(bride, bLordId), gL7 = gm(groom, gLordId);
  const pL7 = Math.round((bL7.strength + gL7.strength) / 2);
  row('lord7', '7-ஆம் பாவாதிபதி', '7th Lord', pL7,
    `பெண் ${GRAHA_INFO[bLordId].ta} ${bL7.dignity.ta} (${bL7.strength}) · ஆண் ${GRAHA_INFO[gLordId].ta} ${gL7.dignity.ta} (${gL7.strength})`,
    `Bride ${bLordId} ${bL7.dignity.en} (${bL7.strength}) · Groom ${gLordId} ${gL7.dignity.en} (${gL7.strength})`);

  const venusG = gm(groom, 'Venus'), jupiterB = gm(bride, 'Jupiter');
  const pKaraka = Math.round((venusG.strength + jupiterB.strength) / 2);
  row('karakas', 'சுக்கிரன் (ஆண்) & குரு (பெண்)', 'Venus (Groom) & Jupiter (Bride)', pKaraka,
    `சுக்கிரன் ${venusG.strength}/100 (${venusG.dignity.ta}) · குரு ${jupiterB.strength}/100 (${jupiterB.dignity.ta})`,
    `Venus ${venusG.strength}/100 (${venusG.dignity.en}) · Jupiter ${jupiterB.strength}/100 (${jupiterB.dignity.en})`);

  const p2 = Math.round((bride.bhavaBala[1].score + groom.bhavaBala[1].score) / 2);
  row('family2', '2-ஆம் பாவம் (குடும்பம்/தனம்)', '2nd House (Family/Wealth)', p2,
    `பெண் ${bride.bhavaBala[1].score} · ஆண் ${groom.bhavaBala[1].score}`, `Bride ${bride.bhavaBala[1].score} · Groom ${groom.bhavaBala[1].score}`);

  const p5 = Math.round((bride.bhavaBala[4].score + groom.bhavaBala[4].score) / 2);
  row('putra5', '5-ஆம் பாவம் (புத்திர பாவம்)', '5th House (Progeny)', p5,
    `பெண் ${bride.bhavaBala[4].score} · ஆண் ${groom.bhavaBala[4].score}`, `Bride ${bride.bhavaBala[4].score} · Groom ${groom.bhavaBala[4].score}`);

  const d9Stab = (d: Dossier) => d.grahas.filter((g) => g.vargottama || g.d9Dignity === 'exalt' || g.d9Dignity === 'own').length;
  const pD9 = Math.min(100, (d9Stab(bride) + d9Stab(groom)) * 12);
  row('d9', 'நவாம்ச (D9) நிலைத்தன்மை', 'D9 Navamsa Stability', pD9,
    `பெண் ${d9Stab(bride)} வலுவான D9 நிலைகள் · ஆண் ${d9Stab(groom)}`,
    `Bride ${d9Stab(bride)} strong D9 states · Groom ${d9Stab(groom)}`);

  const score = Math.round(rows.reduce((s, r) => s + r.points, 0) / rows.length);
  return { rows, score };
}

// ---------- Main ----------
export function computePorutham(bride: Dossier, groom: Dossier, now: Date): PoruthamResult {
  const A = moduleA(bride, groom);

  const bKuja = kujaDosha(bride), gKuja = kujaDosha(groom);
  let verdictKey = 'balanced';
  let mB: { verdict: Bilingual; score: number };
  if (!bKuja.hasDosha && !gKuja.hasDosha) {
    mB = { verdict: { ta: 'தோஷ சமநிலை உள்ளது — இரு ஜாதகங்களிலும் செவ்வாய் தோஷம் இல்லை', en: 'Balanced — no Kuja Dosha in either chart' }, score: 100 };
    verdictKey = 'balanced';
  } else if (bKuja.cancelled && gKuja.cancelled) {
    mB = { verdict: { ta: 'பரிகார செவ்வாய் — இரு தரப்பிலும் விதிவிலக்குகளால் தோஷம் நீங்கியது', en: 'Cancelled by Exception — dosha neutralised by classical exceptions on both sides' }, score: 88 };
    verdictKey = 'cancelled';
  } else if (bKuja.hasDosha && gKuja.hasDosha) {
    mB = { verdict: { ta: 'தோஷ சமநிலை உள்ளது — இரு தரப்பிலும் செவ்வாய் தோஷம் (பரஸ்பர சமநிலை)', en: 'Balanced — Kuja Dosha on both sides (mutual offset)' }, score: 72 };
    verdictKey = 'balanced';
  } else {
    mB = { verdict: { ta: 'தோஷ முரண்பாடு — ஒரே தரப்பில் மட்டும் செவ்வாய் தோஷம்; பரிகாரம்/பொருத்த ஆய்வு தேவை', en: 'Mismatch — Kuja Dosha on one side only; remedy and deeper matching needed' }, score: 30 };
    verdictKey = 'mismatch';
  }

  const bSarpa = sarpaDosha(bride), gSarpa = sarpaDosha(groom);
  const sameState = bSarpa.has === gSarpa.has;
  const mC = {
    brideSarpa: { ta: bSarpa.has ? `ராகு-கேது அச்சு: ${bSarpa.axes.join(', ')}${bSarpa.jupiterMitigates ? ' · குரு பார்வை பரிகாரம்' : ''}` : 'சர்ப்ப தோஷம் இல்லை', en: bSarpa.has ? `Rahu-Ketu axis: ${bSarpa.axes.join(', ')}${bSarpa.jupiterMitigates ? ' · Jupiter aspect mitigation' : ''}` : 'No Sarpa Dosha' },
    groomSarpa: { ta: gSarpa.has ? `ராகு-கேது அச்சு: ${gSarpa.axes.join(', ')}${gSarpa.jupiterMitigates ? ' · குரு பார்வை பரிகாரம்' : ''}` : 'சர்ப்ப தோஷம் இல்லை', en: gSarpa.has ? `Rahu-Ketu axis: ${gSarpa.axes.join(', ')}${gSarpa.jupiterMitigates ? ' · Jupiter aspect mitigation' : ''}` : 'No Sarpa Dosha' },
    verdict: {
      ta: sameState ? (bSarpa.has ? 'இரு தரப்பிலும் சர்ப்ப தோஷம் — பரஸ்பர சமநிலை' : 'இரு தரப்பிலும் சர்ப்ப தோஷம் இல்லை') : 'ஒரே தரப்பில் சர்ப்ப தோஷம் — கவன ஆய்வு தேவை',
      en: sameState ? (bSarpa.has ? 'Sarpa Dosha on both sides — mutual balance' : 'No Sarpa Dosha on either side') : 'Sarpa Dosha on one side only — review with care',
    },
    score: sameState ? (bSarpa.has ? (bSarpa.jupiterMitigates || gSarpa.jupiterMitigates ? 80 : 68) : 95) : 42,
  };

  const mD = moduleD(bride, groom, now);
  const mE = moduleE(bride, groom);

  const total = Math.round(A.score * 0.45 + mB.score * 0.12 + mC.score * 0.08 + mD.score * 0.10 + mE.score * 0.25);
  const fv = total >= 70
    ? { key: 'high', ta: 'மிகச் சிறப்பான பொருத்தம்', en: 'Highly Recommended' }
    : total >= 50
      ? { key: 'balance', ta: 'பரிகாரத்துடன் சேர்க்கலாம்', en: 'Compatible with Balance' }
      : { key: 'avoid', ta: 'தவிர்ப்பது நல்லது', en: 'Not Recommended' };

  const strengths: Bilingual[] = [];
  const cautions: Bilingual[] = [];
  A.rows.filter((r) => r.points / r.max >= 0.8).forEach((r) => strengths.push({ ta: `${r.name.ta}: ${r.detail.ta}`, en: `${r.name.en}: ${r.detail.en}` }));
  A.rows.filter((r) => r.points / r.max < 0.45).forEach((r) => cautions.push({ ta: `${r.name.ta}: ${r.detail.ta}`, en: `${r.name.en}: ${r.detail.en}` }));
  if (verdictKey === 'mismatch') cautions.push({ ta: mB.verdict.ta, en: mB.verdict.en });
  if (!mC.verdict.ta.includes('இல்லை') && mC.score < 60) cautions.push({ ta: mC.verdict.ta, en: mC.verdict.en });
  mD.windows.filter((w) => w.kind === 'sandhi').slice(0, 2).forEach((w) => cautions.push({ ta: w.detail.ta, en: w.detail.en }));
  if (mE.score >= 60) strengths.push({ ta: `கலத்திர பாவ பலம் & காரகங்கள் வலுவாக உள்ளன (${mE.score}/100)`, en: `Kalathra bhava & karakas are strong (${mE.score}/100)` });

  const outlook: Bilingual = {
    ta: `திருமணத்திற்குப் பின் முதல் காலம்: ${mD.windows.filter((w) => w.kind === 'protective').length} பாதுகாப்பு தசா சந்திப்புகள் உள்ளன. மொத்த பொருத்த மதிப்பெண் ${total}/100 — ${fv.ta}. ரஜ்ஜு/யோனி போன்ற முக்கிய பொருத்தங்களை முன்னிலைப்படுத்தி முடிவெடுக்கவும்.`,
    en: `Post-marriage outlook: ${mD.windows.filter((w) => w.kind === 'protective').length} protective dasa windows ahead. Overall ${total}/100 — ${fv.en}. Give precedence to critical matches like Rajju and Yoni before deciding.`,
  };

  return {
    moduleA: A,
    moduleB: { bride: bKuja, groom: gKuja, verdict: mB.verdict, verdictKey, score: mB.score },
    moduleC: mC,
    moduleD: mD,
    moduleE: mE,
    moduleF: { total, verdict: { ta: fv.ta, en: fv.en }, verdictKey: fv.key, strengths, cautions, outlook },
  };
}
