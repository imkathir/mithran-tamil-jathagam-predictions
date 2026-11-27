// Marriage Compatibility & Jothidam Porutham engine
// Modules A–F: 10 Nakshatra Poruthams, Kuja Dosha + exceptions, Rahu-Ketu Sarpa Dosha (strictly from Lagna),
// 20-Year Dasa-Bhukti Family & Spouse impact, cross-chart Bhava & Graha analysis, final verdict.
import type { Dossier, Bilingual } from './engine';
import { GRAHA_INFO, RASI, NAKSHATRA, houseFrom, FRIENDS, ENEMIES, OWN, RASI_LORDS } from './engine';
import { YR } from './timeline';

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
export interface SarpaInfo {
  has: boolean;
  placements: { planet: string; house: number }[];
  axis: '1-7' | '2-8' | null;
  jupiterRelief: boolean;
  beneficSignRelief: boolean;
}
export type ImpactLevel = 'low' | 'moderate' | 'high';
export interface DbPeriodRow {
  start: Date; end: Date;
  maha: string; bhukti: string;
  family: { level: ImpactLevel; note: Bilingual };
  spouse: { level: ImpactLevel; notes: Bilingual[] };
  protection: Bilingual[];
  strong: boolean;
}
export interface D20Chart { rows: DbPeriodRow[]; familyBadge: ImpactLevel; spouseBadge: ImpactLevel }
export interface OverlapWindow { start: Date; end: Date; kind: 'highRisk' | 'protected'; detail: Bilingual }
export interface ModuleD20 {
  fromYear: number; toYear: number;
  groom: D20Chart; bride: D20Chart;
  overlaps: OverlapWindow[];
  score: number; summary: Bilingual;
}
export interface PoruthamResult {
  moduleA: { rows: PoruthamRow[]; score: number };
  moduleB: { bride: DoshaInfo; groom: DoshaInfo; verdict: Bilingual; verdictKey: string; score: number };
  moduleC: { brideSarpa: Bilingual; groomSarpa: Bilingual; brideInfo: SarpaInfo; groomInfo: SarpaInfo; verdict: Bilingual; score: number };
  moduleD: ModuleD20;
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

// ---------- Module C: Rahu-Ketu Sarpa Dosha — STRICTLY from Lagna ----------
// Trigger: Rahu or Ketu in the 1st or 2nd (or their 7th/8th axis counterparts) from Lagna.
// Cancellations: Jupiter aspect/conjunction on the axis, benefic sign placement, mutual balance.
const SARPA_BENEFIC_RASI = [0, 1, 3, 5, 8, 11]; // Mesham, Rishabam, Kadagam, Kanni, Dhanusu, Meenam

function sarpaDosha(d: Dossier): SarpaInfo {
  const rahu = gm(d, 'Rahu'), ketu = gm(d, 'Ketu');
  const placements: { planet: string; house: number }[] = [];
  (['Rahu', 'Ketu'] as const).forEach((planet) => {
    const h = houseFrom(d.lagnaRasi, gm(d, planet).rasi);
    if (h === 1 || h === 2 || h === 7 || h === 8) placements.push({ planet, house: h });
  });
  const has = placements.length > 0;
  const axis: '1-7' | '2-8' | null = !has ? null : placements.some((p) => p.house === 1 || p.house === 7) ? '1-7' : '2-8';
  // Jupiter's classical 5th / 7th / 9th aspect or conjunction on Rahu or Ketu (the axis)
  const jup = gm(d, 'Jupiter');
  const jupiterRelief = has && ([rahu, ketu].some((n) =>
    n.rasi === jup.rasi || n.aspectsReceived.some((a) => a.from === 'Jupiter' && [5, 7, 9].includes(a.num)),
  ));
  // Benefic sign placement of Rahu or Ketu
  const beneficSignRelief = has && (SARPA_BENEFIC_RASI.includes(rahu.rasi) || SARPA_BENEFIC_RASI.includes(ketu.rasi));
  return { has, placements, axis, jupiterRelief, beneficSignRelief };
}

function sarpaLabel(info: SarpaInfo): Bilingual {
  if (!info.has) {
    return {
      ta: 'சர்ப்ப தோஷம் இல்லை (லக்ன 1, 2-ம் வீடுகளில் ராகு/கேது இல்லை)',
      en: 'No Sarpa Dosha (Rahu/Ketu not in Lagna 1st/2nd houses)',
    };
  }
  const placeTa = (p: { planet: string; house: number }) =>
    p.house === 1 ? `${GRAHA_INFO[p.planet].ta} லக்னத்தில் (1-ம் வீடு)`
      : p.house === 2 ? `${GRAHA_INFO[p.planet].ta} லக்னத்திற்கு 2-ம் வீட்டில்`
        : `${GRAHA_INFO[p.planet].ta} லக்னத்திற்கு ${p.house}-ம் வீட்டில்`;
  const placeEn = (p: { planet: string; house: number }) =>
    p.house === 1 ? `${p.planet} in Lagna (1st house)`
      : p.house === 2 ? `${p.planet} in 2nd house from Lagna`
        : `${p.planet} in ${p.house}th house from Lagna`;
  const reliefTa = [
    info.jupiterRelief ? 'குரு பார்வை பரிகாரம்' : '',
    info.beneficSignRelief ? 'சுப ராசி விதிவிலக்கு' : '',
  ].filter(Boolean).join(' · ');
  const reliefEn = [
    info.jupiterRelief ? 'Jupiter aspect remedy' : '',
    info.beneficSignRelief ? 'Benefic sign exception' : '',
  ].filter(Boolean).join(' · ');
  return {
    ta: `சர்ப்ப தோஷம் உள்ளது — ${info.placements.map(placeTa).join(', ')} · அச்சு: Lagna ${info.axis}${reliefTa ? ` · ${reliefTa}` : ''}`,
    en: `Sarpa Dosha present — ${info.placements.map(placeEn).join(', ')} · axis: Lagna ${info.axis}${reliefEn ? ` · ${reliefEn}` : ''}`,
  };
}

// ---------- Module D: 20-Year Dasa-Bhukti Family & Spouse Impact ----------
const MONTH_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_TA = ['ஜன', 'பிப்', 'மார்', 'ஏப்', 'மே', 'ஜூன்', 'ஜூலை', 'ஆக', 'செப்', 'அக்', 'நவ', 'டிச'];
export const fmtYM = (dt: Date, lang: 'ta' | 'en') =>
  lang === 'ta' ? `${MONTH_TA[dt.getMonth()]} ${dt.getFullYear()}` : `${MONTH_EN[dt.getMonth()]} ${dt.getFullYear()}`;
export const fmtRange = (a: Date, b: Date, lang: 'ta' | 'en') => `${fmtYM(a, lang)} – ${fmtYM(b, lang)}`;

export const IMPACT_LABEL: Record<ImpactLevel, Bilingual> = {
  low: { ta: 'பாதுகாப்பானது', en: 'Secure' },
  moderate: { ta: 'மிதமான கவனம்', en: 'Moderate care' },
  high: { ta: 'பரிகாரம் தேவை', en: 'Remedy needed' },
};
export const CELL_LABEL: Record<ImpactLevel, Bilingual> = {
  low: { ta: 'குறைவு', en: 'Low' },
  moderate: { ta: 'மிதமான தாக்கம்', en: 'Moderate impact' },
  high: { ta: 'அதிக தாக்கம்', en: 'High impact' },
};

function lordOfHouse(d: Dossier, h: number): string {
  return RASI_LORDS[(d.lagnaRasi + h - 1) % 12];
}

/** Strong Kendra/Trikona (1,4,5,7,9,10) lord from lagna — or Jupiter/Venus protective period. */
function isProtectiveLord(d: Dossier, lord: string): boolean {
  const owned = (OWN[lord] ?? []).map((r) => houseFrom(d.lagnaRasi, r));
  const kendraTri = owned.some((h) => [1, 4, 5, 7, 9, 10].includes(h)) && !owned.some((h) => [6, 8, 12].includes(h));
  return kendraTri || lord === 'Jupiter' || lord === 'Venus';
}

/** Does the partner run a protective Dasa-Bhukti during [s,e]? */
function partnerProtective(other: Dossier, s: Date, e: Date): boolean {
  for (const m of other.dasa) {
    for (const b of m.bhuktis) {
      const os = b.start.getTime() > s.getTime() ? b.start.getTime() : s.getTime();
      const oe = b.end.getTime() < e.getTime() ? b.end.getTime() : e.getTime();
      if (oe <= os) continue;
      if (isProtectiveLord(other, m.lord) || isProtectiveLord(other, b.lord)) return true;
    }
  }
  return false;
}

interface PeriodEval {
  family: { level: ImpactLevel; note: Bilingual };
  spouse: { level: ImpactLevel; notes: Bilingual[] };
  protection: Bilingual[];
  rawFamily: ImpactLevel; rawSpouse: ImpactLevel;
  strong: boolean;
}

function evalPeriod(d: Dossier, other: Dossier, maha: string, bhukti: string, s: Date, e: Date, side: 'groom' | 'bride'): PeriodEval {
  const lords = [maha, bhukti];
  const jup = gm(d, 'Jupiter');
  const protection: Bilingual[] = [];

  // ---- A. Family stability (2, 4, 12 & 6/8) ----
  const dusthanaLords = [6, 8, 12].map((h) => lordOfHouse(d, h));
  const badFamilyHouses = [2, 4, 6, 8, 12];
  const t1Lords = lords.filter((l) => dusthanaLords.includes(l) || badFamilyHouses.includes(houseFrom(d.lagnaRasi, gm(d, l).rasi)));
  const mutual = (() => {
    const h = houseFrom(gm(d, maha).rasi, gm(d, bhukti).rasi);
    return [6, 8].includes(h) ? '6/8 (சஷ்டாஷ்டகம்)' as const : [2, 12].includes(h) ? '2/12 (துவிர்துவாதசம்)' as const : null;
  })();
  const lord2 = lordOfHouse(d, 2), lord4 = lordOfHouse(d, 4);
  const afflicts24 = (l: string) => [lord2, lord4].some((t) => {
    const tr = gm(d, t).rasi;
    return gm(d, l).rasi === tr || gm(d, l).aspectDetails.some((a) => a.targetRasi === tr);
  });
  const t2 = mutual !== null && (afflicts24(maha) || afflicts24(bhukti));
  const rawFamily: ImpactLevel = t2 ? 'high' : t1Lords.length > 0 ? 'moderate' : 'low';

  const famPartsTa: string[] = [];
  const famPartsEn: string[] = [];
  if (t1Lords.length > 0) {
    const names = t1Lords.map((l) => GRAHA_INFO[l].ta).join('/');
    const namesEn = t1Lords.join('/');
    famPartsTa.push(`${names} — 6/8/12-ம் அதிபதி அல்லது 2/4/6/8/12-ல் நிலை`);
    famPartsEn.push(`${namesEn} — 6th/8th/12th lord or in 2/4/6/8/12`);
  }
  if (t2) {
    famPartsTa.push(`தசா-புக்தி ${mutual} + 2/4 அதிபதி பாதிப்பு`);
    famPartsEn.push(`Dasa-Bhukti ${mutual} afflicting 2nd/4th lord`);
  }

  // ---- exceptions (family) ----
  const flagged = new Set([...t1Lords, ...(t2 ? lords : [])]);
  const reliefOwn = [...flagged].some((l) => l === maha || l === bhukti ? ['own', 'exalt'].includes(gm(d, l).dignityKey) : false);
  const reliefJup = [...flagged].some((l) =>
    (l === maha || l === bhukti) && (gm(d, l).rasi === jup.rasi || gm(d, l).aspectsReceived.some((a) => a.from === 'Jupiter')));
  const reliefPartner = rawFamily !== 'low' && partnerProtective(other, s, e);
  if (rawFamily !== 'low' && reliefOwn) protection.push({ ta: 'தசை/புக்தி அதிபதி ஆட்சி/உச்சம்', en: 'Dasa/Bhukti lord in own/exalted sign' });
  if (rawFamily !== 'low' && reliefJup) protection.push({ ta: 'குரு பார்வை/சேர்க்கை', en: 'Jupiter aspect/conjunction' });
  if (reliefPartner) {
    protection.push({
      ta: `இணையர் ஜாதகத்தில் கேந்திர/திரிகோண அல்லது குரு/சுக்கிர பாதுகாப்பு தசா-புக்தி (${fmtRange(s, e, 'ta')})`,
      en: `Partner runs Kendra/Trikona or Jupiter/Venus protective Dasa-Bhukti (${fmtRange(s, e, 'en')})`,
    });
  }
  const familyMitigated = rawFamily !== 'low' && (reliefOwn || reliefJup || reliefPartner);
  const family: { level: ImpactLevel; note: Bilingual } = {
    level: familyMitigated ? 'low' : rawFamily,
    note: famPartsTa.length
      ? {
        ta: `${familyMitigated ? 'குறைவு / பாதுகாப்பு உண்டு — ' : ''}${famPartsTa.join(' · ')}`,
        en: `${familyMitigated ? 'Low / protected — ' : ''}${famPartsEn.join(' · ')}`,
      }
      : { ta: 'குறைவு', en: 'Low' },
  };

  // ---- B. Spouse wellbeing ----
  const lord7 = lordOfHouse(d, 7), lord8 = lordOfHouse(d, 8), lord2s = lordOfHouse(d, 2);
  const h7Rasi = (d.lagnaRasi + 6) % 12, h8Rasi = (d.lagnaRasi + 7) % 12;
  const malefics = ['Mars', 'Saturn', 'Rahu', 'Ketu'];
  const karaka = side === 'groom' ? 'Venus' : 'Jupiter';
  const spouseTa = side === 'groom'
    ? { health: 'மனைவி ஆரோக்கிய கவனம்', care: 'கருத்து வேறுபாடு', distance: 'பிரிவு / வேலை நிமித்தமான தூரம்' }
    : { health: 'மாங்கல்ய ஸ்தான கவனம்', care: 'கணவர் நலன் & தொழில் கவனம்', distance: 'கருத்து வேறுபாடு' };
  const spouseEn = side === 'groom'
    ? { health: "Wife's health attention", care: 'Marital friction / differing views', distance: 'Separation / work-related distance' }
    : { health: 'Mangalya / longevity attention', care: "Husband's wellbeing & career attention", distance: 'Domestic friction' };
  const flags = new Set<string>();
  for (const l of lords) {
    const g = gm(d, l);
    if (l === lord7) flags.add('kalathra');
    if (l === lord8) flags.add('h8');
    if (l === lord2s) flags.add('maraka');
    if (l === karaka) flags.add('karaka');
    if (malefics.includes(l)) {
      const h = houseFrom(d.lagnaRasi, g.rasi);
      const asp7 = g.aspectDetails.some((a) => a.targetRasi === h7Rasi);
      const asp8 = g.aspectDetails.some((a) => a.targetRasi === h8Rasi);
      if (h === 7 || asp7) flags.add('malefic7');
      if (h === 8 || asp8) flags.add('malefic8');
      if (l === 'Saturn' || l === 'Rahu') flags.add('distance');
    }
  }
  const notes: Bilingual[] = [];
  const addNote = (key: string, ta: string, en: string) => {
    if (flags.has(key) && !notes.some((n) => n.ta === ta)) notes.push({ ta, en });
  };
  if (side === 'groom') {
    addNote('h8', spouseTa.health, spouseEn.health);
    addNote('maraka', spouseTa.health, spouseEn.health);
    addNote('malefic8', spouseTa.health, spouseEn.health);
    addNote('kalathra', spouseTa.care, spouseEn.care);
    addNote('karaka', spouseTa.care, spouseEn.care);
    addNote('malefic7', spouseTa.care, spouseEn.care);
    addNote('distance', spouseTa.distance, spouseEn.distance);
  } else {
    addNote('h8', spouseTa.health, spouseEn.health);
    addNote('malefic8', spouseTa.health, spouseEn.health);
    addNote('kalathra', spouseTa.care, spouseEn.care);
    addNote('karaka', spouseTa.care, spouseEn.care);
    addNote('maraka', spouseTa.care, spouseEn.care);
    addNote('malefic7', spouseTa.distance, spouseEn.distance);
    addNote('distance', spouseTa.care, spouseEn.care);
  }
  const healthClass = side === 'groom'
    ? ['h8', 'maraka', 'malefic8'].some((k) => flags.has(k))
    : ['h8', 'malefic8'].some((k) => flags.has(k));
  const rawSpouse: ImpactLevel = notes.length === 0 ? 'low' : healthClass ? 'high' : 'moderate';

  const spouseMitigated = rawSpouse !== 'low' && (reliefOwn || reliefJup || reliefPartner);
  const spouse: { level: ImpactLevel; notes: Bilingual[] } = {
    level: spouseMitigated ? 'low' : rawSpouse,
    notes: notes.length ? notes : [{ ta: 'குறைவு', en: 'Low' }],
  };
  if (spouseMitigated && !protection.length) {
    protection.push({ ta: 'விதிவிலக்கு (ஆட்சி/உச்சம் அல்லது குரு பார்வை)', en: 'Exception (own/exalt or Jupiter aspect)' });
  }

  const strong = isProtectiveLord(d, maha) || isProtectiveLord(d, bhukti);
  return { family, spouse, protection, rawFamily, rawSpouse, strong };
}

function chart20(d: Dossier, other: Dossier, now: Date, horizon: Date, side: 'groom' | 'bride'): D20Chart {
  const rows: DbPeriodRow[] = [];
  for (const m of d.dasa) {
    for (const b of m.bhuktis) {
      if (b.end.getTime() <= now.getTime() || b.start.getTime() >= horizon.getTime()) continue;
      const ev = evalPeriod(d, other, m.lord, b.lord, b.start, b.end, side);
      rows.push({
        start: b.start, end: b.end, maha: m.lord, bhukti: b.lord,
        family: ev.family, spouse: ev.spouse, protection: ev.protection, strong: ev.strong,
      });
    }
  }
  // badge aggregation: any unmitigated high → high; else any moderate / mitigated-high → moderate; else low
  const agg = (rows.map((r) => r.family.level).includes('high') ? 'high'
    : rows.map((r) => r.family.level).includes('moderate') ? 'moderate' : 'low') as ImpactLevel;
  const spouseAgg = (rows.map((r) => r.spouse.level).includes('high') ? 'high'
    : rows.map((r) => r.spouse.level).includes('moderate') ? 'moderate' : 'low') as ImpactLevel;
  return { rows, familyBadge: agg, spouseBadge: spouseAgg };
}

function moduleD20(bride: Dossier, groom: Dossier, now: Date): ModuleD20 {
  const horizon = new Date(now.getTime() + 20 * YR);
  const g = chart20(groom, bride, now, horizon, 'groom');
  const b = chart20(bride, groom, now, horizon, 'bride');

  // overlap windows: high-risk (both stressed, no protection) vs protected (one stressed, other strong)
  const raw: OverlapWindow[] = [];
  for (const gr of g.rows) {
    for (const br of b.rows) {
      const s = gr.start.getTime() > br.start.getTime() ? gr.start.getTime() : br.start.getTime();
      const e = gr.end.getTime() < br.end.getTime() ? gr.end.getTime() : br.end.getTime();
      if (e <= s) continue;
      const gStress = gr.family.level !== 'low' || gr.spouse.level !== 'low';
      const bStress = br.family.level !== 'low' || br.spouse.level !== 'low';
      const anyProtection = gr.protection.length > 0 || br.protection.length > 0;
      if (gStress && bStress && !anyProtection) {
        raw.push({
          start: new Date(s), end: new Date(e), kind: 'highRisk',
          detail: {
            ta: `அதிக ஆபத்து சாளரம்: ${fmtRange(new Date(s), new Date(e), 'ta')} — இரு ஜாதகங்களிலும் குடும்ப/துணை தாக்கம் (பரஸ்பர பாதுகாப்பு இல்லை)`,
            en: `High-risk window: ${fmtRange(new Date(s), new Date(e), 'en')} — family/spouse stress in both charts without mutual protection`,
          },
        });
      } else if ((gStress !== bStress) && ((gStress && (br.strong || br.protection.length > 0)) || (bStress && (gr.strong || gr.protection.length > 0)))) {
        raw.push({
          start: new Date(s), end: new Date(e), kind: 'protected',
          detail: {
            ta: `பாதுகாப்பு சாளரம்: ${fmtRange(new Date(s), new Date(e), 'ta')} — ஒரு தரப்பின் வலுவான தசா-புக்தி மற்றவரின் கடின காலத்தை சமநிலைப்படுத்துகிறது`,
            en: `Protected window: ${fmtRange(new Date(s), new Date(e), 'en')} — one partner's strong Dasa-Bhukti balances the other's tough period`,
          },
        });
      }
    }
  }
  // merge overlapping same-kind windows
  raw.sort((x, y) => x.start.getTime() - y.start.getTime());
  const overlaps: OverlapWindow[] = [];
  for (const w of raw) {
    const last = overlaps[overlaps.length - 1];
    if (last && last.kind === w.kind && w.start.getTime() <= last.end.getTime()) {
      if (w.end.getTime() > last.end.getTime()) last.end = w.end;
    } else overlaps.push({ ...w });
  }

  let score = 72;
  overlaps.forEach((w) => { score += w.kind === 'highRisk' ? -10 : 5; });
  score = Math.max(15, Math.min(95, score));

  const fromYear = now.getFullYear(), toYear = fromYear + 20;
  const highCount = overlaps.filter((w) => w.kind === 'highRisk').length;
  const protCount = overlaps.filter((w) => w.kind === 'protected').length;
  const summary: Bilingual = {
    ta: `அடுத்த 20 ஆண்டுகள் (${fromYear} – ${toYear}): ஆண் ஜாதகம் — குடும்பம் ${IMPACT_LABEL[g.familyBadge].ta}, மனைவி ${IMPACT_LABEL[g.spouseBadge].ta} · பெண் ஜாதகம் — குடும்பம் ${IMPACT_LABEL[b.familyBadge].ta}, கணவர் ${IMPACT_LABEL[b.spouseBadge].ta} · ${highCount} அதிக ஆபத்து & ${protCount} பாதுகாப்பு சாளரங்கள்.`,
    en: `Next 20 years (${fromYear} – ${toYear}): Groom — family ${IMPACT_LABEL[g.familyBadge].en}, wife ${IMPACT_LABEL[g.spouseBadge].en} · Bride — family ${IMPACT_LABEL[b.familyBadge].en}, husband ${IMPACT_LABEL[b.spouseBadge].en} · ${highCount} high-risk & ${protCount} protected windows.`,
  };
  return { fromYear, toYear, groom: g, bride: b, overlaps, score, summary };
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
  const bLabel = sarpaLabel(bSarpa), gLabel = sarpaLabel(gSarpa);
  const bothDosha = bSarpa.has && gSarpa.has;
  const bothClear = !bSarpa.has && !gSarpa.has;
  const mC = {
    brideSarpa: bLabel,
    groomSarpa: gLabel,
    brideInfo: bSarpa,
    groomInfo: gSarpa,
    verdict: bothDosha
      ? { ta: 'சம தோஷம் — பொருத்தமானது (Balanced Sarpa Dosha) — இரு தரப்பிலும் லக்ன ராகு-கேது 1/2 (7/8) நிலை', en: 'Balanced Sarpa Dosha — compatible (Rahu/Ketu in Lagna 1/2 or 7/8 on both sides)' }
      : bothClear
        ? { ta: 'இரு தரப்பிலும் சர்ப்ப தோஷம் இல்லை (லக்ன 1, 2-ம் வீடுகள் தெளிவு)', en: 'No Sarpa Dosha on either side (Lagna 1st/2nd clear)' }
        : ((bSarpa.has ? bSarpa : gSarpa).jupiterRelief || (bSarpa.has ? bSarpa : gSarpa).beneficSignRelief)
          ? { ta: 'ஒரே தரப்பில் சர்ப்ப தோஷம் — குரு பார்வை/சுப ராசி பரிகாரத்தால் தணிக்கப்படுகிறது', en: 'Sarpa Dosha on one side — mitigated by Jupiter aspect / benefic sign exception' }
          : { ta: 'ஒரே தரப்பில் சர்ப்ப தோஷம் — கவன ஆய்வு & பரிகாரம் தேவை', en: 'Sarpa Dosha on one side only — review with care & remedy needed' },
    score: bothDosha ? 100 : bothClear ? 95
      : ((bSarpa.has ? bSarpa : gSarpa).jupiterRelief || (bSarpa.has ? bSarpa : gSarpa).beneficSignRelief) ? 55 : 30,
  };

  const mD = moduleD20(bride, groom, now);
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
  mD.overlaps.filter((w) => w.kind === 'highRisk').slice(0, 2).forEach((w) => cautions.push({ ta: w.detail.ta, en: w.detail.en }));
  if (mE.score >= 60) strengths.push({ ta: `கலத்திர பாவ பலம் & காரகங்கள் வலுவாக உள்ளன (${mE.score}/100)`, en: `Kalathra bhava & karakas are strong (${mE.score}/100)` });
  const protCount = mD.overlaps.filter((w) => w.kind === 'protected').length;
  if (protCount > 0) strengths.push({ ta: `அடுத்த 20 ஆண்டுகளில் ${protCount} பாதுகாப்பு தசா-புக்தி சாளரங்கள் (இணையர் பரஸ்பர பாதுகாப்பு)`, en: `${protCount} protective Dasa-Bhukti windows in the next 20 years (mutual partner protection)` });

  const outlook: Bilingual = {
    ta: `அடுத்த 20 ஆண்டு (${mD.fromYear} – ${mD.toYear}) தசா-புக்தி ஆய்வு: ஆண் — குடும்பம் ${IMPACT_LABEL[mD.groom.familyBadge].ta}, மனைவி ${IMPACT_LABEL[mD.groom.spouseBadge].ta}; பெண் — குடும்பம் ${IMPACT_LABEL[mD.bride.familyBadge].ta}, கணவர் ${IMPACT_LABEL[mD.bride.spouseBadge].ta}. மொத்த பொருத்த மதிப்பெண் ${total}/100 — ${fv.ta}. ரஜ்ஜு/யோனி போன்ற முக்கிய பொருத்தங்களை முன்னிலைப்படுத்தி முடிவெடுக்கவும்.`,
    en: `20-Year Dasa-Bhukti outlook (${mD.fromYear} – ${mD.toYear}): Groom — family ${IMPACT_LABEL[mD.groom.familyBadge].en}, wife ${IMPACT_LABEL[mD.groom.spouseBadge].en}; Bride — family ${IMPACT_LABEL[mD.bride.familyBadge].en}, husband ${IMPACT_LABEL[mD.bride.spouseBadge].en}. Overall ${total}/100 — ${fv.en}. Give precedence to critical matches like Rajju and Yoni before deciding.`,
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
