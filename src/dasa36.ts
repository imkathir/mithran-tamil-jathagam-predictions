// dasa36.ts — Next-36-Month combined Vimshottari Dasa-Bhukti-Antara + monthly Gochara engine.
// Pure, deterministic, browser-side. Every month is synthesized from the exact planetary
// alignment on the 1st and 15th of that month. No past periods, nothing beyond 36 months.

import type { Dossier, Bilingual, DasaPeriod, GrahaEval } from './engine';
import {
  ASPECT_SPEC, EXALT, DEBIL, OWN, MOOLATRIKONA, NATURAL_BENEFIC, NATURAL_MALEFIC,
  NAK_LORDS, houseFrom, julianDayUTC, siderealLongitudes, lagnaSidereal,
  norm360,
} from './engine';

export type Band = 'peak' | 'progress' | 'steady' | 'caution';

export const BAND_LABEL: Record<Band, Bilingual> = {
  peak: { ta: 'மிகச் சிறப்பான யோக மாதம்', en: 'Peak Auspicious Month' },
  progress: { ta: 'முன்னேற்றம் & லாபம்', en: 'Progressive Month' },
  steady: { ta: 'சமநிலை & உழைப்பு', en: 'Moderate & Steady' },
  caution: { ta: 'கவனம் & பொறுமை தேவை', en: 'Caution & Patience' },
};

export interface MonthEntry {
  index: number;                 // 1..36
  year: number; month0: number;  // JS month 0-11
  label: Bilingual;              // 'நவம்பர் 2026' / 'November 2026'
  short: string;                 // "Nov '26"
  maha: string; bhukti: string; antara: string;
  dasaScore: number; gocharaScore: number; net: number;
  band: Band; bandLabel: Bilingual;
  sadeSati: boolean; ashtamaSani: boolean; guruBala: boolean;
  rahuKetuShift: boolean;
  doubleTransit: { house: number; area: Bilingual }[];
  gocharaFlags: { key: string; label: Bilingual; good: boolean }[];
  transitSummary: Bilingual;     // '8-ல் சனி (அஷ்டம சனி) · 2-ல் குரு …'
  prediction: Bilingual;         // 2-3 classical sentences
}

export interface Dasa36 {
  activeNow: { maha: string; bhukti: string; antara: string; antaraStart: Date; antaraEnd: Date };
  slowNow: { id: string; rasi: number; fromMoon: number }[];
  windowLabel: string;           // 'Nov 2026 – Oct 2029'
  months: MonthEntry[];
}

// ---------- helpers ----------
const MONTH_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_TA = ['ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்', 'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்'];

const jdLocal = (y: number, mo0: number, day: number, h: number, mi: number, offMin: number) => {
  const utc = new Date(Date.UTC(y, mo0, day, h, mi) - offMin * 60000);
  return julianDayUTC(utc.getUTCFullYear(), utc.getUTCMonth() + 1, utc.getUTCDate(), utc.getUTCHours(), utc.getUTCMinutes());
};

interface PeriodsAt { maha: string; bhukti: string; antara: string; antaraStart: Date; antaraEnd: Date }

function periodsAt(dasa: DasaPeriod[], at: Date): PeriodsAt {
  for (const m of dasa) {
    if (at >= m.start && at < m.end) {
      for (const b of m.bhuktis) {
        if (at >= b.start && at < b.end) {
          for (const a of b.antaras) {
            if (at >= a.start && at < a.end) return { maha: m.lord, bhukti: b.lord, antara: a.lord, antaraStart: a.start, antaraEnd: a.end };
          }
          const last = b.antaras[b.antaras.length - 1];
          return { maha: m.lord, bhukti: b.lord, antara: last ? last.lord : b.lord, antaraStart: last ? last.start : b.start, antaraEnd: last ? last.end : b.end };
        }
      }
    }
  }
  return { maha: 'Ketu', bhukti: 'Ketu', antara: 'Ketu', antaraStart: at, antaraEnd: at };
}

// ---------- dasa layer (60%) ----------
function dignityScore(g: GrahaEval | undefined): number {
  if (!g) return 0;
  if (EXALT[g.id] === g.rasi) return 8;
  if ((OWN[g.id] ?? []).includes(g.rasi)) return 6;
  if (MOOLATRIKONA[g.id] === g.rasi) return 5;
  if (DEBIL[g.id] === g.rasi) return g.neechaBhanga ? -4 : -8;
  return 0;
}

// நட்சத்திர சாரம்: houses from the lord's rasi to its star-lord's rasi —
// உடு (Udu) 2,5,8,9,12 → +5 · சமம் (Sama) 1,4,7 → 0 · சரம் (Sara) 3,6,10,11 → −5
function saramScore(lord: string, byId: Record<string, GrahaEval>): number {
  const g = byId[lord];
  if (!g) return 0;
  const starLordId = NAK_LORDS[g.nakIdx % 9];
  const sl = byId[starLordId];
  if (!sl) return 0;
  const h = houseFrom(g.rasi, sl.rasi);
  if (h === 2 || h === 5 || h === 8 || h === 9 || h === 12) return 5;
  if (h === 3 || h === 6 || h === 10 || h === 11) return -5;
  return 0;
}

function paarvaiScore(g: GrahaEval | undefined): number {
  if (!g) return 0;
  let s = 0;
  for (const a of g.aspectsReceived) {
    if (NATURAL_BENEFIC.includes(a.from)) s += 3;
    else if (NATURAL_MALEFIC.includes(a.from)) s -= 3;
  }
  return Math.max(-6, Math.min(6, s));
}

function d9Score(g: GrahaEval | undefined): number {
  if (!g) return 0;
  if (EXALT[g.id] === g.d9) return 3;
  if ((OWN[g.id] ?? []).includes(g.d9)) return 3;
  if (DEBIL[g.id] === g.d9) return -3;
  return 0;
}

// Mutual relationship: 5/9 → +4 · 1/7 → 0 · 2/12 → −2 · 6/8 → −4
function mutualScore(a: GrahaEval | undefined, b: GrahaEval | undefined): number {
  if (!a || !b) return 0;
  const h = houseFrom(a.rasi, b.rasi);
  if (h === 5 || h === 9) return 4;
  if (h === 1 || h === 7) return 0;
  if (h === 2 || h === 12) return -2;
  if (h === 6 || h === 8) return -4;
  return 0;
}

function dasaScoreOf(p: PeriodsAt, byId: Record<string, GrahaEval>): number {
  const lords = [p.maha, p.bhukti, p.antara];
  let s = 50;
  for (const lord of lords) {
    const g = byId[lord];
    s += dignityScore(g) + saramScore(lord, byId) + paarvaiScore(g) + d9Score(g);
    if (g && g.neechaBhanga && DEBIL[lord] === g.rasi) s += 2;
  }
  s += mutualScore(byId[p.maha], byId[p.bhukti]) + mutualScore(byId[p.bhukti], byId[p.antara]);
  return Math.max(0, Math.min(100, Math.round(s)));
}

// ---------- gochara layer (40%) ----------
export interface GocharaSnap {
  at: Date;
  lagnaRasi: number;
  positions: { id: string; rasi: number; fromMoon: number; fromLagna: number; retro: boolean }[];
  sadeSati: boolean; sadePeak: boolean; ashtamaSani: boolean; saniGood: boolean;
  guruBala: boolean;
  rahuHouse: number; ketuHouse: number;
  doubleTransit: { house: number; area: Bilingual }[];
  score: number;
}

const TRANSIT_IDS = ['Saturn', 'Jupiter', 'Rahu', 'Ketu', 'Mars', 'Sun', 'Venus', 'Mercury'] as const;
const SLOW_IDS = ['Saturn', 'Jupiter', 'Rahu', 'Ketu'] as const;

const DT_AREAS: Record<number, Bilingual> = {
  10: { ta: 'தொழில் (10)', en: 'Career (10th)' },
  2: { ta: 'செல்வம் (2)', en: 'Wealth (2nd)' },
  11: { ta: 'லாபம் (11)', en: 'Gains (11th)' },
  6: { ta: 'போட்டி/வெற்றி (6)', en: 'Competition/Victory (6th)' },
};

// Transit planet at house `pHouse` (1-based from lagna) hits target house `tHouse` by occupation or aspect.
function hits(pHouse: number, tHouse: number, planet: string): boolean {
  if (pHouse === tHouse) return true;
  const spec = ASPECT_SPEC[planet];
  const counts = spec ? spec.nums : [7];
  for (const num of counts) {
    const target = ((pHouse - 1 + num - 1) % 12) + 1;
    if (target === tHouse) return true;
  }
  return false;
}

function gocharaSnap(d: Dossier, at: Date): GocharaSnap {
  const y = at.getUTCFullYear(), mo = at.getUTCMonth(), day = at.getUTCDate();
  const jd = jdLocal(y, mo, day, 6, 0, d.profile.timezoneOffsetMinutes);
  const jd2 = jdLocal(y, mo, day + 2, 6, 0, d.profile.timezoneOffsetMinutes);
  const lons = siderealLongitudes(jd, d.profile.panchangamMode).longitudes;
  const lons2 = siderealLongitudes(jd2, d.profile.panchangamMode).longitudes;
  const lagnaLon = lagnaSidereal(jd, d.profile.latitude, d.profile.longitude, d.profile.panchangamMode).lagna;
  const lagnaRasi = Math.floor(norm360(lagnaLon) / 30);
  const moon = d.grahas.find((g) => g.id === 'Moon')!;
  const janmaRasi = moon.rasi;

  const positions = TRANSIT_IDS.map((id) => {
    const lon = lons[id];
    const rasi = Math.floor(norm360(lon) / 30);
    const retro = id === 'Rahu' || id === 'Ketu' ? true : norm360(lons2[id] - lon) > 180;
    return { id, rasi, fromMoon: houseFrom(janmaRasi, rasi), fromLagna: houseFrom(lagnaRasi, rasi), retro };
  });
  const byP = (id: string) => positions.find((p) => p.id === id)!;

  const sat = byP('Saturn'), jup = byP('Jupiter'), rahu = byP('Rahu'), ketu = byP('Ketu'), mars = byP('Mars');

  const sadeSati = sat.fromMoon === 12 || sat.fromMoon === 1 || sat.fromMoon === 2;
  const sadePeak = sat.fromMoon === 1;
  const ashtamaSani = sat.fromMoon === 8;
  const saniGood = sat.fromMoon === 3 || sat.fromMoon === 6 || sat.fromMoon === 11;
  const guruBala = jup.fromMoon === 2 || jup.fromMoon === 5 || jup.fromMoon === 7 || jup.fromMoon === 9 || jup.fromMoon === 11;

  const doubleTransit: { house: number; area: Bilingual }[] = [];
  for (const tHouse of [10, 2, 11, 6]) {
    const satHit = hits(sat.fromLagna, tHouse, 'Saturn');
    const jupHit = hits(jup.fromLagna, tHouse, 'Jupiter');
    if (satHit && jupHit) doubleTransit.push({ house: tHouse, area: DT_AREAS[tHouse] });
  }

  let score = 50;
  if (sadeSati) score += sadePeak ? -13 : -11;
  if (ashtamaSani) score -= 12;
  if (saniGood) score += 6;
  if (guruBala) score += 11;
  if (rahu.fromMoon === 6 || rahu.fromMoon === 10 || rahu.fromMoon === 11) score += 5;
  else if (rahu.fromMoon === 1 || rahu.fromMoon === 5 || rahu.fromMoon === 9) score -= 6;
  else score -= 2;
  if (ketu.fromMoon === 6 || ketu.fromMoon === 10 || ketu.fromMoon === 11) score += 3;
  else if (ketu.fromMoon === 1 || ketu.fromMoon === 5 || ketu.fromMoon === 9) score -= 5;
  let dtScore = 0;
  for (const dt of doubleTransit) dtScore += dt.house === 10 ? 7 : dt.house === 6 ? 6 : 7;
  score += Math.min(12, dtScore);
  if (mars.fromMoon === 1 || mars.fromMoon === 4 || mars.fromMoon === 8) score -= 3;
  else if (mars.fromMoon === 3 || mars.fromMoon === 6 || mars.fromMoon === 11) score += 3;
  const sun = byP('Sun');
  if (sun.fromMoon === 10 || sun.fromMoon === 11) score += 3;
  const ven = byP('Venus');
  if ([1, 2, 4, 5, 9, 11].includes(ven.fromMoon)) score += 3;
  const mer = byP('Mercury');
  if ([2, 4, 6, 8, 10, 11].includes(mer.fromMoon)) score += 2;

  return {
    at, lagnaRasi, positions, sadeSati, sadePeak, ashtamaSani, saniGood, guruBala,
    rahuHouse: rahu.fromMoon, ketuHouse: ketu.fromMoon, doubleTransit,
    score: Math.max(0, Math.min(100, Math.round(score))),
  };
}

// ---------- flags + summary ----------
function monthFlags(s1: GocharaSnap, s2: GocharaSnap, rahuKetuShift: boolean): MonthEntry['gocharaFlags'] {
  const flags: MonthEntry['gocharaFlags'] = [];
  if (s1.sadeSati || s2.sadeSati) flags.push({ key: 'sadeSati', label: { ta: 'ஏழரைச் சனி', en: 'Sade Sati' }, good: false });
  if (s1.ashtamaSani || s2.ashtamaSani) flags.push({ key: 'ashtamaSani', label: { ta: 'அஷ்டம சனி', en: 'Ashtama Sani' }, good: false });
  if (s1.guruBala || s2.guruBala) flags.push({ key: 'guruBala', label: { ta: 'குரு பலம்', en: 'Guru Balam' }, good: true });
  if (s1.saniGood && s2.saniGood) flags.push({ key: 'saniGood', label: { ta: 'சனி 3/6/11 — சாதகம்', en: 'Saturn 3/6/11 — favorable' }, good: true });
  const dtSeen = new Set<number>();
  for (const snap of [s1, s2]) {
    for (const dt of snap.doubleTransit) {
      if (dtSeen.has(dt.house)) continue;
      dtSeen.add(dt.house);
      flags.push({ key: `dt${dt.house}`, label: { ta: `இரட்டைப் பெயர்ச்சி ${dt.area.ta}`, en: `Double Transit ${dt.area.en}` }, good: true });
    }
  }
  if (rahuKetuShift) flags.push({ key: 'rahuKetu', label: { ta: 'ராகு-கேது பெயர்ச்சி', en: 'Rahu-Ketu shift' }, good: false });
  return flags;
}

function transitSummaryOf(s: GocharaSnap): Bilingual {
  const parts = s.positions.filter((p) => SLOW_IDS.includes(p.id as (typeof SLOW_IDS)[number]) || (p.id === 'Mars' && (p.fromMoon === 1 || p.fromMoon === 4 || p.fromMoon === 8))).map((p) => {
    let tag = '';
    if (p.id === 'Saturn') {
      if (p.fromMoon === 1 || p.fromMoon === 2 || p.fromMoon === 12) tag = p.fromMoon === 1 ? ' (ஜென்ம சனி)' : ' (ஏழரைச் சனி)';
      else if (p.fromMoon === 8) tag = ' (அஷ்டம சனி)';
    } else if (p.id === 'Jupiter' && [2, 5, 7, 9, 11].includes(p.fromMoon)) tag = ' (குரு பலம்)';
    return `${p.fromMoon}-ல் ${PLANET_TA[p.id]}${tag}`;
  });
  const partsEn = s.positions.filter((p) => SLOW_IDS.includes(p.id as (typeof SLOW_IDS)[number]) || (p.id === 'Mars' && (p.fromMoon === 1 || p.fromMoon === 4 || p.fromMoon === 8))).map((p) => {
    let tag = '';
    if (p.id === 'Saturn') {
      if (p.fromMoon === 1 || p.fromMoon === 2 || p.fromMoon === 12) tag = p.fromMoon === 1 ? ' (Janma Sani)' : ' (Sade Sati)';
      else if (p.fromMoon === 8) tag = ' (Ashtama Sani)';
    } else if (p.id === 'Jupiter' && [2, 5, 7, 9, 11].includes(p.fromMoon)) tag = ' (Guru Balam)';
    return `${PLANET_EN[p.id]} in ${p.fromMoon}${tag}`;
  });
  return { ta: parts.join(' · '), en: partsEn.join(' · ') };
}

const PLANET_TA: Record<string, string> = { Saturn: 'சனி', Jupiter: 'குரு', Rahu: 'ராகு', Ketu: 'கேது', Mars: 'செவ்வாய்', Sun: 'சூரியன்', Venus: 'சுக்கிரன்', Mercury: 'புதன்' };
const PLANET_EN: Record<string, string> = { Saturn: 'Saturn', Jupiter: 'Jupiter', Rahu: 'Rahu', Ketu: 'Ketu', Mars: 'Mars', Sun: 'Sun', Venus: 'Venus', Mercury: 'Mercury' };

// ---------- prediction synthesis (rule-based, bilingual) ----------
function buildPrediction(p: { dasaScore: number; band: Band; sadeSati: boolean; ashtamaSani: boolean; guruBala: boolean; doubleTransit: { house: number; area: Bilingual }[] }): Bilingual {
  const dt = (h: number) => p.doubleTransit.some((x) => x.house === h);
  const ta: string[] = [];
  const en: string[] = [];

  if (p.dasaScore >= 65) {
    ta.push('தசா-புக்தி-அந்தர அதிபதிகள் வலுவான நிலையில் இருப்பதால், தொழில் முன்னேற்றமும் புதிய வாய்ப்புகளும் இயல்பாக அமையும்.');
    en.push('The Dasa-Bhukti-Antara lords hold strong natal dignity this month, so career progress and new opportunities come naturally.');
  } else if (p.dasaScore >= 45) {
    ta.push('தசா ஓட்டம் சீராக உள்ளது — உழைப்புக்கேற்ற பலன் கிடைக்கும்; முக்கிய முடிவுகளில் பொறுமை பலன் தரும்.');
    en.push('The dasa flow is steady — effort will be rewarded; patience pays off in important decisions.');
  } else {
    ta.push('தசா-புக்தி கலவையான பலனைத் தருவதால், பெரிய முதலீடுகள் மற்றும் அவசர மாற்றங்களைத் தள்ளிப்போடுவது நலம்.');
    en.push('The dasa combination gives mixed results — defer large investments and hasty changes.');
  }

  const positives: string[] = [];
  const positivesEn: string[] = [];
  if (p.guruBala) {
    positives.push('குரு பலம் உள்ளதால் குடும்ப ஒற்றுமை, கல்வி மற்றும் பொருளாதார வளர்ச்சி கூடும்.');
    positivesEn.push('Guru Balam strengthens family harmony, learning and finances.');
  }
  if (dt(10)) {
    positives.push('10-ஆம் இட இரட்டைப் பெயர்ச்சியால் பணியிட அங்கீகாரம், பதவி உயர்வு வாய்ப்பு உண்டு.');
    positivesEn.push('Double transit on the 10th favours recognition and promotion at work.');
  }
  if (dt(2) || dt(11)) {
    positives.push('செல்வ/லாப இடங்களில் இரட்டைப் பெயர்ச்சி — புதிய வருமான வழிகள், சேமிப்பு உயர்வு.');
    positivesEn.push('Double transit on the wealth houses opens new income channels and savings.');
  }
  if (dt(6)) {
    positives.push('6-ஆம் இட இரட்டைப் பெயர்ச்சி போட்டிகளில் வெற்றியையும் எதிர்ப்புகள் விலகுவதையும் தரும்.');
    positivesEn.push('Double transit on the 6th brings victory in competitions and removal of obstacles.');
  }
  if (positives.length > 0) {
    ta.push(positives[0]);
    en.push(positivesEn[0]);
    if (positives.length > 1) {
      ta.push(positives[1]);
      en.push(positivesEn[1]);
    }
  }

  const cautions: string[] = [];
  const cautionsEn: string[] = [];
  if (p.sadeSati) {
    cautions.push('ஏழரைச் சனி நடப்பதால் குடும்ப விஷயங்களில் பொறுமையும் உடல் ஆரோக்கியத்தில் கவனமும் தேவை.');
    cautionsEn.push('With Sade Sati running, keep patience in family matters and watch health.');
  }
  if (p.ashtamaSani) {
    cautions.push('அஷ்டம சனி காலம் — ஆரோக்கியம், பயணங்களில் எச்சரிக்கை; கடன் உத்தரவாதங்கள் தவிர்க்கவும்.');
    cautionsEn.push('Ashtama Sani — be careful with health and travel; avoid signing guarantees.');
  }
  if (cautions.length === 0 && p.band === 'caution') {
    cautions.push('பண விஷயங்களில் எச்சரிக்கை தேவை; அவசர முடிவுகளைத் தவிர்க்கவும்.');
    cautionsEn.push('Be cautious with money matters and avoid impulsive decisions.');
  }
  if (cautions.length === 0) {
    if (p.band === 'peak' || p.band === 'progress') {
      cautions.push('குடும்பத்தில் மகிழ்ச்சி நிலவும்; ஆரோக்கியம் சீராக இருக்கும்.');
      cautionsEn.push('Family life stays pleasant and health remains steady.');
    } else {
      cautions.push('குடும்பம், ஆரோக்கியம் சுமாராக இருக்கும் — அமைதியான அணுகுமுறை பலன் தரும்.');
      cautionsEn.push('Family and health run moderate — a calm approach helps.');
    }
  }
  ta.push(cautions[0]);
  en.push(cautionsEn[0]);

  return { ta: ta.join(' '), en: en.join(' ') };
}

// ---------- main ----------
export function buildDasa36(d: Dossier, now: Date): Dasa36 {
  const byId: Record<string, GrahaEval> = {};
  for (const g of d.grahas) byId[g.id] = g;

  const activeNow = periodsAt(d.dasa, now);
  const jdNow = julianDayUTC(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(), 12, 0);
  const lonsNow = siderealLongitudes(jdNow, d.profile.panchangamMode).longitudes;
  const moon = d.grahas.find((g) => g.id === 'Moon')!;
  const slowNow = SLOW_IDS.map((id) => {
    const rasi = Math.floor(norm360(lonsNow[id]) / 30);
    return { id, rasi, fromMoon: houseFrom(moon.rasi, rasi) };
  });

  const months: MonthEntry[] = [];
  let prevRahuHouse = -1;
  for (let m = 0; m < 36; m++) {
    const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + m, 1));
    const y = base.getUTCFullYear(), mo0 = base.getUTCMonth();
    const daysInMonth = new Date(Date.UTC(y, mo0 + 1, 0)).getUTCDate();
    const day15 = Math.min(15, daysInMonth);

    const s1 = gocharaSnap(d, new Date(Date.UTC(y, mo0, 1)));
    const s2 = gocharaSnap(d, new Date(Date.UTC(y, mo0, day15)));
    const rahuKetuShift = prevRahuHouse !== -1 && s1.rahuHouse !== prevRahuHouse;
    prevRahuHouse = s1.rahuHouse;

    const p1 = periodsAt(d.dasa, s1.at);
    const p2 = periodsAt(d.dasa, s2.at);
    const dasaScore = Math.round((dasaScoreOf(p1, byId) + dasaScoreOf(p2, byId)) / 2);
    const gocharaScore = Math.round((s1.score + s2.score) / 2);
    const net = Math.max(0, Math.min(100, Math.round(0.6 * dasaScore + 0.4 * gocharaScore)));
    const band: Band = net >= 80 ? 'peak' : net >= 60 ? 'progress' : net >= 40 ? 'steady' : 'caution';

    const flags = monthFlags(s1, s2, rahuKetuShift);
    const entry: MonthEntry = {
      index: m + 1,
      year: y, month0: mo0,
      label: { ta: `${MONTH_TA[mo0]} ${y}`, en: `${MONTH_EN[mo0]} ${y}` },
      short: `${MONTH_EN[mo0].slice(0, 3)} '${String(y).slice(2)}`,
      maha: p1.maha, bhukti: p1.bhukti, antara: p1.antara,
      dasaScore, gocharaScore, net,
      band, bandLabel: BAND_LABEL[band],
      sadeSati: s1.sadeSati || s2.sadeSati,
      ashtamaSani: s1.ashtamaSani || s2.ashtamaSani,
      guruBala: s1.guruBala || s2.guruBala,
      rahuKetuShift,
      doubleTransit: s1.doubleTransit.length ? s1.doubleTransit : s2.doubleTransit,
      gocharaFlags: flags,
      transitSummary: transitSummaryOf(s1),
      prediction: buildPrediction({ dasaScore, band, sadeSati: s1.sadeSati || s2.sadeSati, ashtamaSani: s1.ashtamaSani || s2.ashtamaSani, guruBala: s1.guruBala || s2.guruBala, doubleTransit: s1.doubleTransit.length ? s1.doubleTransit : s2.doubleTransit }),
    };
    months.push(entry);
  }

  const first = months[0], last = months[35];
  return {
    activeNow,
    slowNow,
    windowLabel: `${MONTH_EN[first.month0].slice(0, 3)} ${first.year} – ${MONTH_EN[last.month0].slice(0, 3)} ${last.year}`,
    months,
  };
}
