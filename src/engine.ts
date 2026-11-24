// Mithran Predictions — Pure TypeScript Jothidam Engine
// JD, Lahiri Ayanamsa, astronomy-engine (VSOP87-grade) ephemeris, Lagna, D9, D10,
// Two-pass dignity/yoga evaluator, 337-bindu Ashtakavarga, Vimshottari Dasa (Maha-Bhukti-Antara),
// Gochara with double-transit, full Graha Drishti model, Shadbala components,
// and deterministic multi-factor classical prediction synthesis with factor ledgers.

import { Body, Ecliptic, GeoVector } from 'astronomy-engine';

export type Lang = 'ta' | 'en';
export type PanchangamMode = 'THIRUKANITHAM' | 'VAKYA';
export interface Bilingual { ta: string; en: string }
export interface BirthProfile {
  name: string; date: string; time: string; placeName: string;
  latitude: number; longitude: number; timezoneOffsetMinutes: number;
  panchangamMode: PanchangamMode;
}

export const D2R = Math.PI / 180, R2D = 180 / Math.PI;
export const norm360 = (x: number) => ((x % 360) + 360) % 360;
export const norm180 = (x: number) => { let v = norm360(x); return v > 180 ? v - 360 : v; };
const sin = (d: number) => Math.sin(d * D2R), cos = (d: number) => Math.cos(d * D2R), tan = (d: number) => Math.tan(d * D2R);
const atan2d = (y: number, x: number) => norm360(Math.atan2(y, x) * R2D);

export function julianDayUTC(y: number, mo: number, d: number, h: number, mi: number, s = 0) {
  const yy = mo <= 2 ? y - 1 : y, mm = mo <= 2 ? mo + 12 : mo;
  const A = Math.floor(yy / 100), B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (yy + 4716)) + Math.floor(30.6001 * (mm + 1)) + d + B - 1524.5 + (h + mi / 60 + s / 3600) / 24;
}
export function lahiriAyanamsa(jd: number) {
  const T = (jd - 2451545.0) / 36525;
  return norm360(23.8531 + 1.397 * T + 0.00018 * T * T);
}
const VAKYA_OFFSET: Record<string, number> = { Sun: -1.18, Moon: 0.82, Mars: -0.64, Mercury: 0.41, Jupiter: -0.93, Venus: 0.33, Saturn: -0.71, Rahu: 1.05, Ketu: 1.05, Lagna: -0.85 };

// Geocentric apparent ecliptic longitudes (tropical, of-date) via astronomy-engine:
// VSOP87-based planetary theory + dedicated lunar theory — arcminute-grade across 1900-2100.
// (The previous in-house Keplerian approximation had a radians/degrees bug inside Kepler's
// equation and omitted the Jupiter-Saturn inequality; it was degrees off for Mars/Jupiter/Saturn.)
const jdToDate = (jd: number) => new Date((jd - 2440587.5) * 86400000);
const AE_BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'] as const;
function geoEclipticLongitude(body: string, jd: number): number {
  const vec = GeoVector(body as Body, jdToDate(jd), true);
  return norm360(Ecliptic(vec).elon);
}
export function tropicalLongitudes(jd: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const b of AE_BODIES) out[b] = geoEclipticLongitude(b, jd);
  out.Rahu = meanNode(jd);
  out.Ketu = norm360(out.Rahu + 180);
  return out;
}
function meanNode(jd: number) { const T = (jd - 2451545.0) / 36525; return norm360(125.04452 - 1934.136261 * T + 0.0020708 * T * T + T * T * T / 450000); }
export function siderealLongitudes(jd: number, mode: PanchangamMode) {
  const trop = tropicalLongitudes(jd); const ayan = lahiriAyanamsa(jd);
  const out: Record<string, number> = {};
  for (const k of Object.keys(trop)) {
    let v = norm360(trop[k] - ayan);
    if (mode === 'VAKYA') v = norm360(v + (VAKYA_OFFSET[k] ?? 0));
    out[k] = v;
  }
  return { longitudes: out, ayanamsa: ayan, tropical: trop };
}
export function lagnaSidereal(jd: number, lat: number, lonEast: number, mode: PanchangamMode) {
  const T = (jd - 2451545.0) / 36525;
  let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * T * T - T * T * T / 38710000;
  gmst = norm360(gmst);
  const lst = norm360(gmst + lonEast);
  const eps = 23.439291 - 0.0130042 * T - 0.00000164 * T * T;
  // Standard ascendant: atan2(cos θ, -(sin θ·cos ε + tan φ·sin ε)); the previous
  // sign-negated pair returned the DESCENDANT (lagna + 180°) — six signs off.
  const y = cos(lst);
  const x = -(sin(lst) * cos(eps) + tan(lat) * sin(eps));
  let sid = norm360(atan2d(y, x) - lahiriAyanamsa(jd));
  if (mode === 'VAKYA') sid = norm360(sid + VAKYA_OFFSET.Lagna);
  return { lagna: sid, lst, gmst, eps };
}

// ---------- Classical data ----------
export const RASI = [
  { ta: 'மேஷம்', en: 'Mesha (Aries)', sym: '♈' }, { ta: 'ரிஷபம்', en: 'Rishaba (Taurus)', sym: '♉' },
  { ta: 'மிதுனம்', en: 'Mithuna (Gemini)', sym: '♊' }, { ta: 'கடகம்', en: 'Kataka (Cancer)', sym: '♋' },
  { ta: 'சிம்மம்', en: 'Simha (Leo)', sym: '♌' }, { ta: 'கன்னி', en: 'Kanni (Virgo)', sym: '♍' },
  { ta: 'துலாம்', en: 'Thula (Libra)', sym: '♎' }, { ta: 'விருச்சிகம்', en: 'Vrichika (Scorpio)', sym: '♏' },
  { ta: 'தனுசு', en: 'Dhanusu (Sagittarius)', sym: '♐' }, { ta: 'மகரம்', en: 'Makara (Capricorn)', sym: '♑' },
  { ta: 'கும்பம்', en: 'Kumbha (Aquarius)', sym: '♒' }, { ta: 'மீனம்', en: 'Meena (Pisces)', sym: '♓' },
];
export const NAKSHATRA = [
  { ta: 'அஸ்வினி', en: 'Ashwini' }, { ta: 'பரணி', en: 'Bharani' }, { ta: 'கார்த்திகை', en: 'Karthigai' },
  { ta: 'ரோகிணி', en: 'Rohini' }, { ta: 'மிருகசீரிஷம்', en: 'Mrigasheersham' }, { ta: 'திருவாதிரை', en: 'Thiruvathirai' },
  { ta: 'புனர்பூசம்', en: 'Punarpoosam' }, { ta: 'புஷ்யம்', en: 'Pushyam' }, { ta: 'ஆயில்யம்', en: 'Ayilyam' },
  { ta: 'மகம்', en: 'Magam' }, { ta: 'பூரம்', en: 'Pooram' }, { ta: 'உத்திரம்', en: 'Uthiram' },
  { ta: 'அஸ்தம்', en: 'Hastham' }, { ta: 'சித்திரை', en: 'Chithirai' }, { ta: 'சுவாதி', en: 'Swathi' },
  { ta: 'விசாகம்', en: 'Visakam' }, { ta: 'அனுஷம்', en: 'Anusham' }, { ta: 'கேட்டை', en: 'Kettai' },
  { ta: 'மூலம்', en: 'Moolam' }, { ta: 'பூராடம்', en: 'Pooradam' }, { ta: 'உத்திராடம்', en: 'Uthiradam' },
  { ta: 'திருவோணம்', en: 'Thiruvonam' }, { ta: 'அவிட்டம்', en: 'Avittam' }, { ta: 'சதயம்', en: 'Sadhayam' },
  { ta: 'பூரட்டாதி', en: 'Poorattathi' }, { ta: 'உத்திரட்டாதி', en: 'Uthirattathi' }, { ta: 'ரேவதி', en: 'Revathi' },
];
export const GRAHA_ORDER = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'] as const;
export const GRAHA_INFO: Record<string, { ta: string; en: string; sym: string; lordOf: number[] }> = {
  Sun: { ta: 'சூரியன்', en: 'Sun', sym: '☉', lordOf: [4] }, Moon: { ta: 'சந்திரன்', en: 'Moon', sym: '☽', lordOf: [11] },
  Mars: { ta: 'செவ்வாய்', en: 'Mars', sym: '♂', lordOf: [0, 7] }, Mercury: { ta: 'புதன்', en: 'Mercury', sym: '☿', lordOf: [2, 5] },
  Jupiter: { ta: 'குரு', en: 'Jupiter', sym: '♃', lordOf: [8, 11] }, Venus: { ta: 'சுக்கிரன்', en: 'Venus', sym: '♀', lordOf: [1, 6] },
  Saturn: { ta: 'சனி', en: 'Saturn', sym: '♄', lordOf: [9, 10] }, Rahu: { ta: 'ராகு', en: 'Rahu', sym: '☊', lordOf: [] }, Ketu: { ta: 'கேது', en: 'Ketu', sym: '☋', lordOf: [] },
};
export const OWN: Record<string, number[]> = { Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5], Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10], Rahu: [], Ketu: [] };
export const EXALT: Record<string, number> = { Sun: 0, Moon: 2, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6, Rahu: 1, Ketu: 7 };
export const DEBIL: Record<string, number> = { Sun: 6, Moon: 7, Mars: 3, Mercury: 11, Jupiter: 9, Venus: 5, Saturn: 0, Rahu: 7, Ketu: 1 };
export const MOOLATRIKONA: Record<string, number> = { Sun: 4, Moon: 2, Mars: 0, Mercury: 5, Jupiter: 8, Venus: 6, Saturn: 10, Rahu: -1, Ketu: -1 };
export const FRIENDS: Record<string, string[]> = {
  Sun: ['Moon', 'Mars', 'Jupiter'], Moon: ['Sun', 'Mercury', 'Jupiter'], Mars: ['Sun', 'Moon', 'Jupiter'], Mercury: ['Sun', 'Venus'],
  Jupiter: ['Sun', 'Moon', 'Mars'], Venus: ['Mercury', 'Saturn'], Saturn: ['Mercury', 'Venus'], Rahu: ['Venus', 'Saturn'], Ketu: ['Mars', 'Jupiter'],
};
export const ENEMIES: Record<string, string[]> = {
  Sun: ['Venus', 'Saturn'], Moon: ['Mercury'], Mars: ['Mercury'], Mercury: ['Moon'],
  Jupiter: ['Venus', 'Saturn'], Venus: ['Sun', 'Moon'], Saturn: ['Sun', 'Moon', 'Mars'], Rahu: ['Sun', 'Moon', 'Mars'], Ketu: ['Sun', 'Venus', 'Saturn'],
};
export const COMBUST_ORB: Record<string, number> = { Sun: 0, Moon: 12, Mars: 11, Mercury: 14, Jupiter: 11, Venus: 10, Saturn: 15, Rahu: 0, Ketu: 0 };
export const DIGBALA_HOUSE: Record<string, number> = { Sun: 10, Moon: 4, Mars: 10, Mercury: 1, Jupiter: 1, Venus: 4, Saturn: 10, Rahu: 0, Ketu: 0 };
export const NATURAL_BENEFIC = ['Moon', 'Mercury', 'Jupiter', 'Venus'];
export const NATURAL_MALEFIC = ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'];
export const DASHA_LORDS = [
  { id: 'Ketu', years: 7, ta: 'கேது', en: 'Ketu' }, { id: 'Venus', years: 20, ta: 'சுக்கிரன்', en: 'Venus' },
  { id: 'Sun', years: 6, ta: 'சூரியன்', en: 'Sun' }, { id: 'Moon', years: 10, ta: 'சந்திரன்', en: 'Moon' },
  { id: 'Mars', years: 7, ta: 'செவ்வாய்', en: 'Mars' }, { id: 'Rahu', years: 18, ta: 'ராகு', en: 'Rahu' },
  { id: 'Jupiter', years: 16, ta: 'குரு', en: 'Jupiter' }, { id: 'Saturn', years: 19, ta: 'சனி', en: 'Saturn' },
  { id: 'Mercury', years: 17, ta: 'புதன்', en: 'Mercury' },
];
export const DASHA_START_INDEX: Record<string, number> = { Ketu: 0, Venus: 1, Sun: 2, Moon: 3, Mars: 4, Rahu: 5, Jupiter: 6, Saturn: 7, Mercury: 8 };

// ---------- Graha Drishti (Paarvai) model ----------
export interface AspectSpec { nums: number[]; traditional?: number[] }
export const ASPECT_SPEC: Record<string, AspectSpec> = {
  Sun: { nums: [7] }, Moon: { nums: [7] }, Mercury: { nums: [7] }, Venus: { nums: [7] },
  Mars: { nums: [4, 7, 8] }, Jupiter: { nums: [5, 7, 9] }, Saturn: { nums: [3, 7, 10] },
  Rahu: { nums: [7], traditional: [5, 9] }, Ketu: { nums: [7] },
};
export interface AspectDetail { num: number; targetRasi: number; targetHouse: number; traditional?: boolean; grahasInTarget: string[] }
export interface AspectReceivedDetail { from: string; num: number; traditional?: boolean }

export function dms(lon: number) {
  const l = norm360(lon); const deg = Math.floor(l); const minF = (l - deg) * 60; const min = Math.floor(minF); const sec = Math.floor((minF - min) * 60);
  return `${deg}° ${String(min).padStart(2, '0')}' ${String(sec).padStart(2, '0')}"`;
}
export function degInRasi(lon: number) { return norm360(lon) % 30; }
export function nakshatraOf(lon: number) { const idx = Math.floor(norm360(lon) / (360 / 27)); const within = norm360(lon) - idx * (360 / 27); const pada = Math.floor(within / (360 / 108)) + 1; return { idx, pada }; }
export function navamsaRasi(lon: number) {
  const rasi = Math.floor(norm360(lon) / 30); const deg = degInRasi(lon); const nav = Math.floor(deg / (30 / 9));
  let start: number;
  if (rasi === 0 || rasi === 3 || rasi === 6 || rasi === 9) start = rasi;
  else if (rasi === 1 || rasi === 4 || rasi === 7 || rasi === 10) start = (rasi + 8) % 12;
  else start = (rasi + 4) % 12;
  return (start + nav) % 12;
}
export function dasamsaRasi(lon: number) {
  const rasi = Math.floor(norm360(lon) / 30); const part = Math.floor(degInRasi(lon) / 3);
  const signNo = rasi + 1;
  const start = signNo % 2 === 1 ? rasi : (rasi + 8) % 12; // odd signs from themselves; even from 9th
  return (start + part) % 12;
}
export function houseFrom(lagnaRasi: number, rasi: number) { return ((rasi - lagnaRasi + 12) % 12) + 1; }
export const RASI_LORDS = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
export const NAK_LORDS = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];

export interface Shadbala { sthana: number; dig: number; kala: number; cheshta: number; drik: number; naisargika: number; total: number }
export interface GrahaEval {
  id: string; lon: number; rasi: number; deg: number; nakIdx: number; pada: number; d9: number; d10: number; d10House: number;
  velocity: number; retro: boolean; combust: boolean; combustOrb: number; house: number;
  dignity: Bilingual; dignityKey: string; d9Dignity: string; friendship: Bilingual; avastha: Bilingual;
  digbala: boolean; vargottama: boolean; waxing: boolean;
  grahaYuddha: { with: string; won: boolean } | null;
  functional: { key: string; label: Bilingual }; badhaka: boolean;
  kartari: { key: 'shubha' | 'papa' | 'mixed' | 'none'; label: Bilingual };
  aspectsGiven: number[]; aspectDetails: AspectDetail[]; aspectsReceived: AspectReceivedDetail[];
  shadbala: Shadbala;
  nakLord: { id: string; house: number; dignityKey: string; strength: number };
  strength: number; neechaBhanga: boolean; parivarthanaWith: string[]; vipareeta: boolean; kendradhipatya: boolean;
  harsha: Bilingual | null;   // ஹர்ஷ/சரள/விமல — dusthana lord in its OWN dusthana (ஆட்சி பலம்)
  factors: { n: number; label: Bilingual; value: Bilingual }[];
}
export interface Yoga { name: Bilingual; grahas: string[]; effect: Bilingual; nature: 'benefic' | 'malefic' | 'neutral' }
export interface DasaPeriod { lord: string; start: Date; end: Date; years: number; bhuktis: { lord: string; start: Date; end: Date; antaras: { lord: string; start: Date; end: Date }[] }[] }
export interface LedgerRow { label: Bilingual; value: Bilingual; sign: 1 | 0 | -1 }
export interface DomainPrediction {
  key: string; title: Bilingual; rating: number; contributors: Bilingual[];
  body: Bilingual; ledger: LedgerRow[];
}
export interface Dossier {
  profile: BirthProfile; jd: number; ayanamsa: number; lagnaLon: number; lagnaRasi: number; lagnaNak: { idx: number; pada: number };
  grahas: GrahaEval[]; yogas: Yoga[]; sav: number[]; bav: Record<string, number[]>; bhavaBala: { house: number; rasi: number; sav: number; score: number }[];
  dasa: DasaPeriod[]; balance: { lord: string; yearsLeft: number; totalYears: number; elapsedYears: number };
  activeDasa: { mahadasa: string; bhukti: string; antara: string; start: Date; end: Date; antaraStart: Date; antaraEnd: Date } | null;
  gochara: { date: string; jd: number; grahas: { id: string; lon: number; rasi: number; fromMoon: number; fromLagna: number; retro: boolean }[]; flags: { key: string; name: Bilingual; active: boolean; detail: Bilingual }[] };
  doubleTransitHouses: number[];
  predictions: DomainPrediction[];
  rasiGrid: Record<number, string[]>; navamsaGrid: Record<number, string[]>;
}

const BAV_TABLE: Record<string, Record<string, number[]>> = {
  Sun: { Sun: [1, 2, 4, 7, 8, 9, 10, 11], Moon: [3, 6, 10, 11], Mars: [1, 2, 4, 7, 8, 9, 10, 11], Mercury: [3, 5, 6, 9, 10, 11, 12], Jupiter: [5, 6, 9, 11], Venus: [6, 7, 12], Saturn: [1, 2, 4, 7, 8, 9, 10, 11], Lagna: [3, 4, 6, 10, 11, 12] },
  Moon: { Sun: [3, 6, 7, 8, 10, 11], Moon: [1, 3, 6, 7, 10, 11], Mars: [2, 3, 5, 6, 9, 10, 11], Mercury: [1, 3, 4, 5, 7, 8, 10, 11], Jupiter: [1, 4, 7, 8, 10, 11, 12], Venus: [3, 4, 5, 7, 9, 10, 11], Saturn: [3, 5, 6, 11], Lagna: [3, 6, 10, 11] },
  Mars: { Sun: [3, 5, 6, 10, 11], Moon: [3, 6, 11], Mars: [1, 2, 4, 7, 8, 10, 11], Mercury: [3, 5, 6, 11], Jupiter: [6, 10, 11, 12], Venus: [6, 8, 11, 12], Saturn: [1, 4, 7, 8, 9, 10, 11], Lagna: [1, 3, 6, 10, 11] },
  Mercury: { Sun: [5, 6, 9, 11, 12], Moon: [2, 4, 6, 8, 10, 11], Mars: [1, 2, 4, 7, 8, 9, 10, 11], Mercury: [1, 3, 5, 6, 9, 10, 11, 12], Jupiter: [6, 8, 11, 12], Venus: [1, 2, 3, 4, 5, 8, 9, 11], Saturn: [1, 2, 4, 7, 8, 9, 10, 11], Lagna: [1, 2, 4, 6, 8, 10, 11] },
  Jupiter: { Sun: [1, 2, 3, 4, 7, 8, 9, 10, 11], Moon: [2, 5, 7, 9, 11], Mars: [1, 2, 4, 7, 8, 10, 11], Mercury: [1, 2, 4, 5, 6, 9, 10, 11], Jupiter: [1, 2, 3, 4, 7, 8, 10, 11], Venus: [2, 5, 6, 9, 10, 11], Saturn: [3, 5, 6, 12], Lagna: [1, 2, 4, 5, 6, 7, 9, 10, 11] },
  Venus: { Sun: [8, 11, 12], Moon: [1, 2, 3, 4, 5, 8, 9, 11, 12], Mars: [3, 5, 6, 9, 11, 12], Mercury: [3, 5, 6, 9, 11], Jupiter: [5, 8, 9, 10, 11], Venus: [1, 2, 3, 4, 5, 8, 9, 10, 11], Saturn: [3, 4, 5, 8, 9, 10, 11], Lagna: [1, 2, 3, 4, 5, 8, 9, 11] },
  Saturn: { Sun: [1, 2, 4, 7, 8, 10, 11], Moon: [3, 6, 11], Mars: [3, 5, 6, 10, 11, 12], Mercury: [6, 8, 9, 10, 11, 12], Jupiter: [5, 6, 11, 12], Venus: [6, 11, 12], Saturn: [3, 5, 6, 11], Lagna: [1, 3, 4, 6, 10, 11] },
};

const D9_SHORT_TA: Record<string, string> = { exalt: 'உச்சம்', own: 'ஆட்சி', mt: 'மூலதிரிகோணம்', debil: 'நீசம்', friend: 'நட்பு', enemy: 'பகை', neutral: 'சமம்' };
const d9ShortTa = (key: string) => D9_SHORT_TA[key] ?? key;

function dignityOf(id: string, rasi: number): { key: string; ta: string; en: string } {
  if (OWN[id]?.includes(rasi)) return { key: 'own', ta: 'ஆட்சி (சொந்த வீடு)', en: 'Own sign (Swakshetra)' };
  if (EXALT[id] === rasi) return { key: 'exalt', ta: 'உச்சம்', en: 'Exalted (Uchcha)' };
  if (DEBIL[id] === rasi) return { key: 'debil', ta: 'நீசம்', en: 'Debilitated (Neecha)' };
  if (MOOLATRIKONA[id] === rasi) return { key: 'mt', ta: 'மூலதிரிகோணம்', en: 'Moolatrikona' };
  const signLord = RASI_LORDS[rasi];
  if (FRIENDS[id]?.includes(signLord)) return { key: 'friend', ta: 'நட்பு', en: 'Friendly Sign' };
  if (ENEMIES[id]?.includes(signLord)) return { key: 'enemy', ta: 'பகை', en: 'Enemy Sign' };
  return { key: 'neutral', ta: 'சமம்', en: 'Neutral (Sama)' };
}
function friendshipOf(id: string, rasi: number) {
  const lord = RASI_LORDS[rasi];
  if (id === lord) return { ta: 'சொந்த வீடு', en: 'Own house' };
  if (FRIENDS[id]?.includes(lord)) return { ta: 'நட்பு', en: 'Friend' };
  if (ENEMIES[id]?.includes(lord)) return { ta: 'பகை', en: 'Enemy' };
  return { ta: 'நடுநிலை', en: 'Neutral' };
}
function avasthaOf(deg: number): Bilingual {
  if (deg < 6) return { ta: 'பாலாவஸ்தை (Bala)', en: 'Bala (infant)' };
  if (deg < 12) return { ta: 'குமாராவஸ்தை (Kumara)', en: 'Kumara (youth)' };
  if (deg < 18) return { ta: 'யுவாவஸ்தை (Yuva)', en: 'Yuva (young)' };
  if (deg < 24) return { ta: 'விருத்தாவஸ்தை (Vriddha)', en: 'Vriddha (mature)' };
  return { ta: 'மிருத்யுவாவஸ்தை (Mrityu)', en: 'Mrityu (old)' };
}
function isBenefic(id: string, waxing: boolean) {
  if (id === 'Moon') return waxing;
  return NATURAL_BENEFIC.includes(id);
}

// Functional nature by Lagna (yogakaraka / maraka / badhaka rules)
function functionalOf(id: string, lagnaRasi: number): { key: string; ta: string; en: string; badhaka: boolean } {
  const owned = (OWN[id] ?? []).map((r) => houseFrom(lagnaRasi, r));
  const has = (h: number[]) => h.some((x) => owned.includes(x));
  const yogakaraka = has([4, 7, 10]) && has([5, 9]);
  const lagnaLord = owned.includes(1);
  const dusthana = has([6, 8, 12]);
  const maraka = has([2, 7]);
  const trikona = has([5, 9]);
  // Badhaka: 11th lord for movable lagna, 9th for fixed, 7th for dual
  const movable = [0, 3, 6, 9].includes(lagnaRasi), fixed = [1, 4, 7, 10].includes(lagnaRasi);
  const badhakaHouse = movable ? 11 : fixed ? 9 : 7;
  const badhaka = owned.includes(badhakaHouse);
  if (id === 'Rahu' || id === 'Ketu') return { key: 'node', ta: 'கிரக நிழல் (ராகு/கேது)', en: 'Shadow node', badhaka: false };
  if (yogakaraka) return { key: 'yogakaraka', ta: 'யோககாரகன்', en: 'Yogakaraka', badhaka };
  if (lagnaLord && !dusthana) return { key: 'benefic', ta: 'லக்னாதிபதி (சுப)', en: 'Lagna lord (benefic)', badhaka };
  if (trikona && !dusthana && !maraka) return { key: 'benefic', ta: 'திரிகோணாதிபதி (சுப)', en: 'Trikona lord (benefic)', badhaka };
  if (maraka && trikona) return { key: 'mixed', ta: 'மரக்க + திரிகோண (கலவை)', en: 'Maraka + Trikona (mixed)', badhaka };
  if (maraka) return { key: 'maraka', ta: 'மரகாதிபதி', en: 'Marakadhipathi', badhaka };
  if (dusthana) return { key: 'malefic', ta: 'துஷ்டானாதிபதி (பாவ)', en: 'Dusthana lord (malefic)', badhaka };
  if (owned.includes(4) || owned.includes(7) || owned.includes(10)) return { key: 'kendra', ta: 'கேந்திராதிபதி', en: 'Kendradhipathi', badhaka };
  return { key: 'neutral', ta: 'நடுநிலை', en: 'Neutral', badhaka };
}

function kartariOf(rasi: number, byId: Record<string, GrahaEval>): { key: 'shubha' | 'papa' | 'mixed' | 'none'; label: Bilingual } {
  const second = (rasi + 1) % 12, twelfth = (rasi + 11) % 12;
  const occ = [second, twelfth].map((r) => Object.values(byId).filter((g) => g.rasi === r && g.id !== 'Rahu' && g.id !== 'Ketu'));
  const flat = occ.flat();
  if (!flat.length) return { key: 'none', label: { ta: 'கர்த்தாரி இல்லை', en: 'No Kartari' } };
  const benefics = flat.filter((g) => isBenefic(g.id, g.waxing)).length;
  const malefics = flat.length - benefics;
  if (benefics === flat.length && flat.length >= 2) return { key: 'shubha', label: { ta: 'சுப கர்த்தாரி', en: 'Shubha Kartari' } };
  if (malefics === flat.length && flat.length >= 2) return { key: 'papa', label: { ta: 'பாப கர்த்தாரி', en: 'Papa Kartari' } };
  return { key: 'mixed', label: { ta: 'கலவை கர்த்தாரி', en: 'Mixed Kartari' } };
}

// ---------- 40-Factor table builder ----------
function buildFactors(g: GrahaEval, ctx: {
  byId: Record<string, GrahaEval>; moonRasi: number; lagnaRasi: number; sunLon: number;
  sav: number[]; bav: Record<string, number[]>; bhavaBala: Dossier['bhavaBala'];
  activeDasa: Dossier['activeDasa']; gocharaGrahas: Dossier['gochara']['grahas'];
}): { n: number; label: Bilingual; value: Bilingual }[] {
  const { byId } = ctx;
  const gname = GRAHA_INFO[g.id];
  const nak = NAKSHATRA[g.nakIdx];
  const F = (n: number, ta: string, en: string, vta: string, ven: string) => ({ n, label: { ta, en }, value: { ta: vta, en: ven } });
  const givenStr = g.aspectDetails.map((a) => {
    const trad = a.traditional ? (g.id === 'Rahu' || g.id === 'Ketu' ? ' (மரபு)' : '') : '';
    return `${a.targetHouse}(${RASI[a.targetRasi].ta}${trad})${a.grahasInTarget.length ? '←' + a.grahasInTarget.map((id) => GRAHA_INFO[id].ta).join(',') : ''}`;
  }).join(' · ') || '—';
  const givenStrEn = g.aspectDetails.map((a) => {
    const trad = a.traditional ? ' (trad)' : '';
    return `${a.targetHouse}(${RASI[a.targetRasi].en.split(' ')[0]}${trad})${a.grahasInTarget.length ? '→' + a.grahasInTarget.map((id) => GRAHA_INFO[id].en).join(',') : ''}`;
  }).join(' · ') || '—';
  const recvStr = g.aspectsReceived.map((a) => `${GRAHA_INFO[a.from].ta}(${a.num}${a.traditional ? ' மரபு' : ''})`).join(', ') || '—';
  const recvStrEn = g.aspectsReceived.map((a) => `${GRAHA_INFO[a.from].en}(${a.num}${a.traditional ? ' trad' : ''})`).join(', ') || '—';
  let benAsp = 0, malAsp = 0;
  g.aspectsReceived.forEach((a) => { const f = byId[a.from]; if (!a.traditional && isBenefic(a.from, f?.waxing ?? true)) benAsp++; else if (!a.traditional) malAsp++; });
  const nakL = g.nakLord;
  const overrideList = [g.neechaBhanga ? 'Neechabhanga' : '', g.parivarthanaWith.length ? 'Parivarthana' : '', g.harsha ? g.harsha.en : '', g.vipareeta ? 'Vipareeta' : '', g.kendradhipatya ? 'Kendradhipatya' : ''].filter(Boolean).join(', ') || '—';
  const overrideListTa = [g.neechaBhanga ? 'நீச்சபங்கம்' : '', g.parivarthanaWith.length ? 'பரிவர்த்தனை' : '', g.harsha ? g.harsha.ta : '', g.vipareeta ? 'விபரீதம்' : '', g.kendradhipatya ? 'கேந்திராதிபத்தியம்' : ''].filter(Boolean).join(', ') || '—';
  return [
    F(1, 'கிரகம்', 'Graha', gname.ta, gname.en),
    F(2, 'நீளாங்கம் (சிடெரியல்)', 'Sidereal longitude', dms(g.lon), dms(g.lon)),
    F(3, 'ராசி', 'Rasi', RASI[g.rasi].ta, RASI[g.rasi].en),
    F(4, 'ராசியில் பாகை', 'Degree in Rasi', `${g.deg.toFixed(2)}°`, `${g.deg.toFixed(2)}°`),
    F(5, 'நட்சத்திரம்', 'Nakshatra', nak.ta, nak.en),
    F(6, 'பாதம்', 'Pada', `${g.pada}`, `${g.pada}`),
    F(7, 'லக்னத்திலிருந்து வீடு', 'House from Lagna', `${g.house}`, `${g.house}`),
    F(8, 'சந்திரனிலிருந்து வீடு', 'House from Moon', `${houseFrom(ctx.moonRasi, g.rasi)}`, `${houseFrom(ctx.moonRasi, g.rasi)}`),
    F(9, 'நவாம்சம் (D9) — பலம்', 'Navamsa (D9) — dignity', `${RASI[g.d9].ta} · ${dignityOf(g.id, g.d9).ta}`, `${RASI[g.d9].en} · ${dignityOf(g.id, g.d9).en}`),
    F(10, 'தசாம்சம் (D10)', 'Dasamsa (D10)', `${RASI[g.d10].ta} · ${g.d10House} ஆம் வீடு`, `${RASI[g.d10].en} · house ${g.d10House}`),
    F(11, 'தினசரி இயக்கம்', 'Daily velocity', `${g.velocity.toFixed(4)}°/day`, `${g.velocity.toFixed(4)}°/day`),
    F(12, 'வக்ரம் (Vakram)', 'Retrograde', g.retro ? 'வக்ரம்' : 'நேர்கதி', g.retro ? 'Retrograde' : 'Direct'),
    F(13, 'அஸ்தம் (Asthamanam)', 'Combustion', g.combust ? `அஸ்தம் (${Math.abs(norm180(g.lon - ctx.sunLon)).toFixed(1)}°)` : 'அஸ்தம் இல்லை', g.combust ? `Combust (${Math.abs(norm180(g.lon - ctx.sunLon)).toFixed(1)}°)` : 'Not combust'),
    F(14, 'கிரக யுத்தம்', 'Graha Yuddha', g.grahaYuddha ? `${g.grahaYuddha.won ? 'வெற்றி' : 'தோல்வி'} — ${GRAHA_INFO[g.grahaYuddha.with].ta}` : 'யுத்தம் இல்லை', g.grahaYuddha ? `${g.grahaYuddha.won ? 'Won' : 'Lost'} — vs ${GRAHA_INFO[g.grahaYuddha.with].en}` : 'No planetary war'),
    F(15, 'உச்சம்/நீசம்/ஆட்சி', 'Dignity', g.dignity.ta, g.dignity.en),
    F(16, 'பஞ்சதா நட்பு', 'Panchadha friendship', g.friendship.ta, g.friendship.en),
    F(17, 'ராசி அதிபதி', 'Rasi lord', GRAHA_INFO[RASI_LORDS[g.rasi]].ta, GRAHA_INFO[RASI_LORDS[g.rasi]].en),
    F(18, 'மூலதிரிகோணம்', 'Moolatrikona', MOOLATRIKONA[g.id] === g.rasi ? 'ஆம்' : 'இல்லை', MOOLATRIKONA[g.id] === g.rasi ? 'Yes' : 'No'),
    F(19, 'பாகை அவஸ்தை', 'Degree avastha', g.avastha.ta, g.avastha.en),
    F(20, 'திக்பலம்', 'Digbala', g.digbala ? 'திக்பலம் உண்டு' : 'திக்பலம் இல்லை', g.digbala ? 'Digbala present' : 'No Digbala'),
    F(21, 'வர்கோத்தமம்', 'Vargottama', g.vargottama ? 'வர்கோத்தமம்' : 'இல்லை', g.vargottama ? 'Vargottama' : 'No'),
    F(22, 'செயல் இயல்பு', 'Functional nature', `${g.functional.label.ta}${g.badhaka ? ' · பாதகாதிபதி' : ''}`, `${g.functional.label.en}${g.badhaka ? ' · Badhakadhipathi' : ''}`),
    F(23, 'கர்த்தாரி நிலை', 'Kartari', g.kartari.label.ta, g.kartari.label.en),
    F(24, 'கேந்திரம்/திரிகோணம்', 'Kendra/Trikona', [1, 4, 7, 10].includes(g.house) ? 'கேந்திரம்' : [5, 9].includes(g.house) ? 'திரிகோணம்' : 'துஷ்டானம்/உபசயம்', [1, 4, 7, 10].includes(g.house) ? 'Kendra' : [5, 9].includes(g.house) ? 'Trikona' : 'Dusthana/Upachaya'),
    F(25, 'உபசய ஸ்தானம் (3,6,10,11)', 'Upachaya Sthana (3,6,10,11)', [3, 6, 10, 11].includes(g.house) ? 'உபசயம்' : 'இல்லை', [3, 6, 10, 11].includes(g.house) ? 'Upachaya' : 'No'),
    F(26, 'சர்வாஷ்டகவர்க்கம் (ராசி)', 'Sarvashtakavarga (this Rasi)', `${ctx.sav[g.rasi]} (சராசரி 28${ctx.sav[g.rasi] >= 28 ? ' +' : ' −'}${Math.abs(ctx.sav[g.rasi] - 28)})`, `${ctx.sav[g.rasi]} (avg 28${ctx.sav[g.rasi] >= 28 ? ' +' : ' −'}${Math.abs(ctx.sav[g.rasi] - 28)})`),
    F(27, 'பின்னாஷ்டகவர்க்கம் (சொந்தம்)', 'Bhinnashtakavarga (own)', `${ctx.bav[g.id]?.[g.rasi] ?? '—'}`, `${ctx.bav[g.id]?.[g.rasi] ?? '—'}`),
    F(28, 'பாவ பலம் (வீடு)', 'Bhava Bala (house)', `${ctx.bhavaBala[g.house - 1].score}/100`, `${ctx.bhavaBala[g.house - 1].score}/100`),
    F(29, 'பார்வை — கொடுப்பது', 'Paarvai Given (houses, rasis, grahas)', givenStr, givenStrEn),
    F(30, 'பார்வை — பெறுவது', 'Paarvai Received (graha, aspect)', recvStr, recvStrEn),
    F(31, 'சுப/பாவ பார்வை சமநிலை', 'Benefic/Malefic aspects on this rasi', `சுப ${benAsp} · பாவ ${malAsp}`, `Benefic ${benAsp} · Malefic ${malAsp}`),
    F(32, 'நட்சத்திர அதிபதி', 'Nakshatra lord', GRAHA_INFO[nakL.id].ta, GRAHA_INFO[nakL.id].en),
    F(33, 'நட்சத்திர சாரம்', 'Nakshatra Saram (lord state)', `${GRAHA_INFO[nakL.id].ta}: ${nakL.house} ஆம் வீடு · ${dignityOf(nakL.id, byId[nakL.id].rasi).ta} · வலு ${nakL.strength}`, `${GRAHA_INFO[nakL.id].en}: house ${nakL.house} · ${dignityOf(nakL.id, byId[nakL.id].rasi).en} · strength ${nakL.strength}`),
    F(34, 'சட்பலம் — ஸ்தானம்', 'Shadbala: Sthana Bala', `${g.shadbala.sthana}/100`, `${g.shadbala.sthana}/100`),
    F(35, 'சட்பலம் — திக் & காலம்', 'Shadbala: Dig & Kala Bala', `திக் ${g.shadbala.dig} · காலம் ${g.shadbala.kala}`, `Dig ${g.shadbala.dig} · Kala ${g.shadbala.kala}`),
    F(36, 'சட்பலம் — சேஷ்டா & திருஷ்டி', 'Shadbala: Cheshta & Drik Bala', `சேஷ்டா ${g.shadbala.cheshta} · திருஷ்டி ${g.shadbala.drik}`, `Cheshta ${g.shadbala.cheshta} · Drik ${g.shadbala.drik}`),
    F(37, 'சட்பலம் மொத்தம்', 'Shadbala total', `${g.shadbala.total}/100`, `${g.shadbala.total}/100`),
    F(38, 'நீச்சபங்கம்', 'Neechabhanga', g.neechaBhanga ? 'உண்டு' : 'இல்லை', g.neechaBhanga ? 'Yes' : 'No'),
    F(39, 'பரிவர்த்தனை & விபரீதம்', 'Parivarthana & Vipareeta', `${g.parivarthanaWith.length ? g.parivarthanaWith.map((id) => GRAHA_INFO[id].ta).join('/') + ' பரிவர்த்தனை' : '—'}${g.harsha ? ' · ' + g.harsha.ta : ''}${g.vipareeta ? ' · விபரீத ராஜயோகம்' : ''}`, `${g.parivarthanaWith.length ? g.parivarthanaWith.map((id) => GRAHA_INFO[id].en).join('/') + ' exchange' : '—'}${g.harsha ? ' · ' + g.harsha.en : ''}${g.vipareeta ? ' · Vipareeta Rajayoga' : ''}`),
    F(40, 'கேந்திராதிபத்தியம் & ஒட்டுமொத்தம்', 'Kendradhipatya & Overall', `${g.kendradhipatya ? 'கேந்திராதிபத்திய தோஷம் · ' : ''}${g.strength >= 70 ? 'வலுவானது' : g.strength >= 50 ? 'நடுத்தரம்' : 'கவனம் தேவை'} (${g.strength}/100) · ${overrideListTa}`, `${g.kendradhipatya ? 'Kendradhipatya dosha · ' : ''}${g.strength >= 70 ? 'Strong' : g.strength >= 50 ? 'Moderate' : 'Needs care'} (${g.strength}/100) · ${overrideList}`),
  ];
}

// ---------- Multi-factor domain prediction synthesis ----------
interface DomainDef {
  key: string; title: Bilingual; primaryHouse: number; auxHouses: number[];
  karakas: string[]; useD10: boolean;
}
const DOMAIN_DEFS: DomainDef[] = [
  { key: 'career', title: { ta: 'தொழில் & மென்பொருள் (Career & IT)', en: 'Career & IT' }, primaryHouse: 10, auxHouses: [1, 6], karakas: ['Sun', 'Mercury', 'Saturn', 'Jupiter'], useD10: true },
  { key: 'business', title: { ta: 'வியாபாரம் & விவசாயம் (Business & Agriculture)', en: 'Business & Agriculture' }, primaryHouse: 7, auxHouses: [10, 2], karakas: ['Mercury', 'Venus', 'Jupiter'], useD10: true },
  { key: 'wealth', title: { ta: 'செல்வம் & நிதி (Wealth & Finance)', en: 'Wealth & Finance' }, primaryHouse: 2, auxHouses: [11, 9], karakas: ['Jupiter', 'Venus', 'Mercury'], useD10: false },
  { key: 'family', title: { ta: 'குடும்பம் & திருமணம் (Family & Marriage)', en: 'Family & Marriage' }, primaryHouse: 7, auxHouses: [4, 2], karakas: ['Venus', 'Jupiter', 'Moon'], useD10: false },
  { key: 'health', title: { ta: 'ஆரோக்கியம் (Health)', en: 'Health' }, primaryHouse: 1, auxHouses: [6], karakas: ['Sun', 'Moon', 'Mars'], useD10: false },
];

function synthesizeDomain(def: DomainDef, ctx: {
  byId: Record<string, GrahaEval>; lagnaRasi: number; moonRasi: number;
  sav: number[]; bav: Record<string, number[]>; bhavaBala: Dossier['bhavaBala'];
  activeDasa: Dossier['activeDasa']; dasaLord: string; gochara: Dossier['gochara']; doubleTransitHouses: number[];
}): DomainPrediction {
  const { byId, lagnaRasi } = ctx;
  const primaryRasi = ((lagnaRasi + def.primaryHouse - 1) % 12);
  const lordId = RASI_LORDS[primaryRasi];
  const lord = byId[lordId];
  const houseClassEn = [1, 4, 7, 10].includes(def.primaryHouse) ? 'Kendra' : [5, 9].includes(def.primaryHouse) ? 'Trikona' : [3, 6, 10, 11].includes(def.primaryHouse) ? 'Upachaya' : [6, 8, 12].includes(def.primaryHouse) ? 'Dusthana' : def.primaryHouse === 2 || def.primaryHouse === 7 ? 'Maraka (Panapara)' : 'Neutral';
  const houseClassTa = [1, 4, 7, 10].includes(def.primaryHouse) ? 'கேந்திரம்' : [5, 9].includes(def.primaryHouse) ? 'திரிகோணம்' : [3, 6, 10, 11].includes(def.primaryHouse) ? 'உபசயம்' : [6, 8, 12].includes(def.primaryHouse) ? 'துஷ்டானம்' : def.primaryHouse === 2 || def.primaryHouse === 7 ? 'மாரகம் (பனாபரம்)' : 'நடுநிலை';
  const ledger: LedgerRow[] = [];
  let score = 0;
  const add = (ta: string, en: string, vta: string, ven: string, sign: 1 | 0 | -1, w = 3) => {
    ledger.push({ label: { ta, en }, value: { ta: vta, en: ven }, sign });
    score += sign * w;
  };

  // 1. Bhava & Bhavadhipathi
  const lordHouseClass = [1, 4, 7, 10].includes(lord.house) ? 'கேந்திரம்' : [5, 9].includes(lord.house) ? 'திரிகோணம்' : [6, 8, 12].includes(lord.house) ? 'துஷ்டானம்' : lord.house === 2 || lord.house === 7 ? 'மாரகம் (பனாபரம்)' : [3, 10, 11].includes(lord.house) ? 'உபசயம்' : 'நடுநிலை';
  const lordHouseClassEn = [1, 4, 7, 10].includes(lord.house) ? 'Kendra' : [5, 9].includes(lord.house) ? 'Trikona' : [6, 8, 12].includes(lord.house) ? 'Dusthana' : lord.house === 2 || lord.house === 7 ? 'Maraka (Panapara)' : [3, 10, 11].includes(lord.house) ? 'Upachaya' : 'Neutral';
  const lSign = [1, 4, 7, 10].includes(lord.house) || [5, 9].includes(lord.house) ? 1 : [6, 8, 12].includes(lord.house) ? -1 : 0;
  add('பாவ & பாவாதிபதி', 'Bhava & Bhavadhipathi',
    `${def.primaryHouse} ஆம் பாவம் (${houseClassTa}) · அதிபதி ${GRAHA_INFO[lordId].ta} ${lord.house} ஆம் வீட்டில் (${lordHouseClass})`,
    `House ${def.primaryHouse} (${houseClassEn}) · lord ${GRAHA_INFO[lordId].en} in house ${lord.house} (${lordHouseClassEn})`, lSign, 4);

  // 2. Functional status
  const fKey = lord.functional.key;
  const fSign: 1 | 0 | -1 = fKey === 'yogakaraka' || fKey === 'benefic' ? 1 : fKey === 'malefic' || fKey === 'maraka' ? -1 : 0;
  add('செயல் இயல்பு (Functional)', 'Functional nature',
    `${GRAHA_INFO[lordId].ta}: ${lord.functional.label.ta}${lord.badhaka ? ' · பாதகாதிபதி' : ''}`,
    `${GRAHA_INFO[lordId].en}: ${lord.functional.label.en}${lord.badhaka ? ' · Badhakadhipathi' : ''}`, fSign, 3);

  // 3. Dignity & overrides
  const ov: string[] = [], ovEn: string[] = [];
  if (lord.neechaBhanga) { ov.push('நீச்சபங்க ராஜயோகம்'); ovEn.push('Neechabhanga'); }
  if (lord.parivarthanaWith.length) { ov.push('பரிவர்த்தனை'); ovEn.push('Parivarthana'); }
  if (lord.harsha) { ov.push(lord.harsha.ta); ovEn.push(lord.harsha.en); }
  if (lord.vipareeta) { ov.push('விபரீத ராஜயோகம்'); ovEn.push('Vipareeta'); }
  if (lord.kendradhipatya) { ov.push('கேந்திராதிபத்திய தோஷம்'); ovEn.push('Kendradhipatya'); }
  const dSign: 1 | 0 | -1 = lord.dignityKey === 'exalt' || lord.dignityKey === 'own' || lord.dignityKey === 'mt' || lord.neechaBhanga ? 1 : lord.dignityKey === 'debil' || lord.kendradhipatya ? -1 : 0;
  add('D1 ஆட்சி/உச்சம்/நீசம் & மாற்றுகள்', 'D1 Dignity & overrides',
    `${lord.dignity.ta}${ov.length ? ' · ' + ov.join(', ') : ''}`,
    `${lord.dignity.en}${ovEn.length ? ' · ' + ovEn.join(', ') : ''}`, dSign, 3);

  // 4. Panchadha
  const pSign: 1 | 0 | -1 = lord.friendship.en === 'Friend' || lord.friendship.en === 'Own house' ? 1 : lord.friendship.en === 'Enemy' ? -1 : 0;
  add('பஞ்சதா நட்பு', 'Panchadha friendship', `${GRAHA_INFO[lordId].ta}: ${lord.friendship.ta}`, `${GRAHA_INFO[lordId].en}: ${lord.friendship.en}`, pSign, 2);

  // 5. Motion & war
  const motionBits: string[] = [], motionBitsEn: string[] = [];
  if (lord.retro) { motionBits.push('வக்ரம்'); motionBitsEn.push('Retrograde'); }
  if (lord.combust) { motionBits.push('அஸ்தம்'); motionBitsEn.push('Combust'); }
  if (lord.grahaYuddha) { motionBits.push(`கிரக யுத்தம் (${lord.grahaYuddha.won ? 'வெற்றி' : 'தோல்வி'})`); motionBitsEn.push(`Graha Yuddha (${lord.grahaYuddha.won ? 'won' : 'lost'})`); }
  const mSign: 1 | 0 | -1 = (lord.grahaYuddha && !lord.grahaYuddha.won) || lord.combust ? -1 : lord.retro ? 1 : 0;
  add('வக்ரம்/அஸ்தம்/கிரக யுத்தம்', 'Motion, combustion & war', motionBits.join(', ') || 'நேர்கதி, தூய்மை', motionBits.join(', ') || 'Direct, clean', mSign, 2);

  // 6. Avastha
  const aSign: 1 | 0 | -1 = lord.deg >= 12 && lord.deg < 24 ? 1 : lord.deg >= 24 || lord.deg < 6 ? -1 : 0;
  add('பாகை அவஸ்தை (முதிர்ச்சி)', 'Degree avastha (maturity)', lord.avastha.ta, lord.avastha.en, aSign, 1);

  // 7. Digbala & Vargottama
  const dvSign: 1 | 0 | -1 = lord.digbala || lord.vargottama ? 1 : 0;
  add('திக்பலம் & வர்கோத்தமம்', 'Digbala & Vargottama',
    `${lord.digbala ? 'திக்பலம் உண்டு' : 'திக்பலம் இல்லை'} · ${lord.vargottama ? 'வர்கோத்தமம்' : 'வர்கோத்தமம் இல்லை'}`,
    `${lord.digbala ? 'Digbala yes' : 'Digbala no'} · ${lord.vargottama ? 'Vargottama' : 'No Vargottama'}`, dvSign, 2);

  // 8. D9 dignity
  const d9d = dignityOf(lordId, lord.d9);
  const d9Sign: 1 | 0 | -1 = d9d.key === 'exalt' || d9d.key === 'own' ? 1 : d9d.key === 'debil' ? -1 : 0;
  add('D9 நவாம்ச பலம் (தனிப் பார்வை)', 'D9 Navamsa strength (separate from D1)', `${RASI[lord.d9].ta} · (நவாம்சத்தில் ${d9ShortTa(d9d.key)})`, `${RASI[lord.d9].en} · (${d9d.en} in Navamsa)`, d9Sign, 2);

  // 9. D10 (career/business)
  if (def.useD10) {
    const d10d = dignityOf(lordId, lord.d10);
    const d10Sign: 1 | 0 | -1 = lord.d10House === 10 || lord.d10House === 1 || d10d.key === 'exalt' || d10d.key === 'own' ? 1 : [6, 8, 12].includes(lord.d10House) ? -1 : 0;
    add('தசாம்சம் (D10)', 'Dasamsa (D10)', `${RASI[lord.d10].ta} · ${lord.d10House} ஆம் வீடு · ${d10d.ta}`, `${RASI[lord.d10].en} · house ${lord.d10House} · ${d10d.en}`, d10Sign, 2);
  }

  // 10-11. Paarvai on house cusp & lord
  const aspectsOnHouse = GRAHA_ORDER.flatMap((id) => {
    const gr = byId[id];
    return gr.aspectDetails.filter((a) => a.targetRasi === primaryRasi && !a.traditional).map((a) => ({ id, num: a.num, ben: isBenefic(id, gr.waxing) }));
  });
  const benH = aspectsOnHouse.filter((a) => a.ben), malH = aspectsOnHouse.filter((a) => !a.ben);
  const hSign: 1 | 0 | -1 = benH.length > malH.length ? 1 : malH.length > benH.length ? -1 : 0;
  add(`${def.primaryHouse} ஆம் பாவத்தின் மீது பார்வை`, `Paarvai on house ${def.primaryHouse}`,
    `சுப பார்வை: ${benH.length ? benH.map((a) => `${GRAHA_INFO[a.id].ta}(${a.num})`).join(', ') : '—'} · பாவ பார்வை: ${malH.length ? malH.map((a) => `${GRAHA_INFO[a.id].ta}(${a.num})`).join(', ') : '—'}`,
    `Benefic: ${benH.length ? benH.map((a) => `${GRAHA_INFO[a.id].en}(${a.num})`).join(', ') : '—'} · Malefic: ${malH.length ? malH.map((a) => `${GRAHA_INFO[a.id].en}(${a.num})`).join(', ') : '—'}`, hSign, 3);

  const aspectsOnLord = lord.aspectsReceived.filter((a) => !a.traditional).map((a) => ({ from: a.from, num: a.num, ben: isBenefic(a.from, byId[a.from].waxing) }));
  const benL = aspectsOnLord.filter((a) => a.ben), malL = aspectsOnLord.filter((a) => !a.ben);
  const lAspSign: 1 | 0 | -1 = benL.length > malL.length ? 1 : malL.length > benL.length ? -1 : 0;
  add('பாவாதிபதி மீது பார்வை', 'Paarvai on the house lord',
    `சுப: ${benL.length ? benL.map((a) => `${GRAHA_INFO[a.from].ta}(${a.num})`).join(', ') : '—'} · பாவ: ${malL.length ? malL.map((a) => `${GRAHA_INFO[a.from].ta}(${a.num})`).join(', ') : '—'}`,
    `Benefic: ${benL.length ? benL.map((a) => `${GRAHA_INFO[a.from].en}(${a.num})`).join(', ') : '—'} · Malefic: ${malL.length ? malL.map((a) => `${GRAHA_INFO[a.from].en}(${a.num})`).join(', ') : '—'}`, lAspSign, 3);

  // 12. Conjunctions on house & lord
  const conjH = GRAHA_ORDER.filter((id) => id !== lordId && byId[id].rasi === primaryRasi);
  const conjL = GRAHA_ORDER.filter((id) => id !== lordId && byId[id].rasi === lord.rasi && byId[id].rasi !== primaryRasi);
  const conjAll = [...conjH, ...conjL];
  const cBen = conjAll.filter((id) => isBenefic(id, byId[id].waxing)).length;
  const cMal = conjAll.length - cBen;
  const cSign: 1 | 0 | -1 = conjAll.length === 0 ? 0 : cBen > cMal ? 1 : cMal > cBen ? -1 : 0;
  add('சேர்க்கை (Conjunctions)', 'Conjunctions on house/lord',
    conjAll.length ? conjAll.map((id) => GRAHA_INFO[id].ta).join(', ') : 'சேர்க்கை இல்லை',
    conjAll.length ? conjAll.map((id) => GRAHA_INFO[id].en).join(', ') : 'No conjunction', cSign, 2);

  // 13. Kartari on house
  const kart = kartariOf(primaryRasi, byId);
  const kSign: 1 | 0 | -1 = kart.key === 'shubha' ? 1 : kart.key === 'papa' ? -1 : 0;
  add('கர்த்தாரி (Hemming)', 'Kartari (hemming)', kart.label.ta, kart.label.en, kSign, 2);

  // 14. Nakshatra saram
  const nk = lord.nakLord;
  const nkD = dignityOf(nk.id, byId[nk.id].rasi);
  const nSign: 1 | 0 | -1 = (nkD.key === 'exalt' || nkD.key === 'own' || [1, 4, 7, 10, 5, 9].includes(nk.house)) && nk.strength >= 55 ? 1 : nk.strength < 40 || [6, 8, 12].includes(nk.house) ? -1 : 0;
  add('நட்சத்திர சாரம் (Star lordship)', 'Nakshatra Saram',
    `${GRAHA_INFO[nk.id].ta} (${NAKSHATRA[lord.nakIdx].ta} ${lord.pada}-ம் பாதம்): ${nk.house} ஆம் வீடு · ${nkD.ta} · வலு ${nk.strength}`,
    `${GRAHA_INFO[nk.id].en} (${NAKSHATRA[lord.nakIdx].en} pada ${lord.pada}): house ${nk.house} · ${nkD.en} · strength ${nk.strength}`, nSign, 3);

  // 15. Shadbala
  const sbSign: 1 | 0 | -1 = lord.shadbala.total >= 65 ? 1 : lord.shadbala.total < 45 ? -1 : 0;
  add('சட்பலம் (Shadbala)', 'Shadbala',
    `ஸ்தானம் ${lord.shadbala.sthana} · திக் ${lord.shadbala.dig} · காலம் ${lord.shadbala.kala} · சேஷ்டா ${lord.shadbala.cheshta} · திருஷ்டி ${lord.shadbala.drik} → ${lord.shadbala.total}/100`,
    `Sthana ${lord.shadbala.sthana} · Dig ${lord.shadbala.dig} · Kala ${lord.shadbala.kala} · Cheshta ${lord.shadbala.cheshta} · Drik ${lord.shadbala.drik} → ${lord.shadbala.total}/100`, sbSign, 3);

  // 16. Ashtakavarga
  const savV = ctx.sav[primaryRasi];
  const savSign: 1 | 0 | -1 = savV > 28 ? 1 : savV < 28 ? -1 : 0;
  add('அஷ்டகவர்க்கம் (SAV/BAV)', 'Ashtakavarga (SAV/BAV)',
    `${def.primaryHouse} ஆம் வீடு SAV ${savV}/28 · பாவாதிபதி BAV ${ctx.bav[lordId]?.[lord.rasi] ?? '—'}`,
    `House ${def.primaryHouse} SAV ${savV} vs 28 · lord BAV ${ctx.bav[lordId]?.[lord.rasi] ?? '—'}`, savSign, 2);

  // 17. Dasa-Bhukti-Antara
  const ad = ctx.activeDasa;
  const dasaRel = ad ? [ad.mahadasa, ad.bhukti, ad.antara] : [ctx.dasaLord];
  const relScore = dasaRel.reduce((s, id) => {
    const gr = byId[id];
    if (!gr) return s;
    const ownsPrimary = (OWN[id] ?? []).includes(primaryRasi);
    return s + (ownsPrimary || isBenefic(id, gr.waxing) ? 1 : NATURAL_MALEFIC.includes(id) ? -1 : 0);
  }, 0);
  const dasaSign: 1 | 0 | -1 = relScore > 0 ? 1 : relScore < 0 ? -1 : 0;
  add('தசா-புக்தி-அந்தரம்', 'Dasa-Bhukti-Antara',
    ad ? `மகாதசா ${GRAHA_INFO[ad.mahadasa].ta} · புக்தி ${GRAHA_INFO[ad.bhukti].ta} · அந்தரம் ${GRAHA_INFO[ad.antara].ta}` : '—',
    ad ? `Mahadasa ${ad.mahadasa} · Bhukti ${ad.bhukti} · Antara ${ad.antara}` : '—', dasaSign, 3);

  // 18. Gochara
  const guru = ctx.gochara.grahas.find((x) => x.id === 'Jupiter')!;
  const sani = ctx.gochara.grahas.find((x) => x.id === 'Saturn')!;
  const rahuT = ctx.gochara.grahas.find((x) => x.id === 'Rahu')!;
  const sadeSati = [12, 1, 2].includes(sani.fromMoon);
  const ashtama = sani.fromMoon === 8;
  const guruBalam = [2, 5, 7, 9, 11].includes(guru.fromMoon);
  const doubleT = ctx.doubleTransitHouses.includes(def.primaryHouse);
  const rahuGood = [3, 6, 10, 11].includes(rahuT.fromMoon);
  const goBits: string[] = [], goBitsEn: string[] = [];
  if (guruBalam) { goBits.push('குரு பலம்'); goBitsEn.push('Guru Balam'); }
  if (doubleT) { goBits.push('இரட்டை பெயர்ச்சி (குரு-சனி)'); goBitsEn.push('Double transit (Jupiter-Saturn)'); }
  if (sadeSati) { goBits.push('ஏழரைச் சனி'); goBitsEn.push('Sade Sati'); }
  if (ashtama) { goBits.push('அஷ்டம சனி'); goBitsEn.push('Ashtama Sani'); }
  if (rahuGood) { goBits.push('ராகு-கேது சாதகம்'); goBitsEn.push('Rahu-Ketu favourable'); }
  const gSign: 1 | 0 | -1 = (guruBalam || doubleT || rahuGood) && !(sadeSati || ashtama) ? 1 : sadeSati || ashtama ? -1 : 0;
  add('கோச்சாரம்', 'Gochara transits', goBits.join(', ') || 'குறிப்பிடத்தக்க பெயர்ச்சி இல்லை', goBitsEn.join(', ') || 'No notable transit', gSign, 3);

  // rating & body
  const rating = Math.max(8, Math.min(95, Math.round(50 + score * 2.1)));
  const best = ledger.filter((r) => r.sign === 1).length;
  const worst = ledger.filter((r) => r.sign === -1).length;
  const body: Bilingual = {
    ta: `${def.primaryHouse} ஆம் பாவம் (${houseClassTa}) — அதிபதி ${GRAHA_INFO[lordId].ta} ${RASI[lord.rasi].ta}-இல் (${lord.dignity.ta}), ${lordHouseClass}, சட்பலம் ${lord.shadbala.total}/100. நட்சத்திர சாரம்: ${GRAHA_INFO[nk.id].ta} (${nk.house} ஆம் வீடு, ${nkD.ta}). பார்வை: பாவத்தின் மீது சுப ${benH.length}/பாவ ${malH.length}; அதிபதி மீது சுப ${benL.length}/பாவ ${malL.length}. அஷ்டகவர்க்கம் ${savV} பிண்டுகள் (28 ஒப்பீடு). ${ad ? `நடப்பு ${GRAHA_INFO[ad.mahadasa].ta} மகாதசா / ${GRAHA_INFO[ad.bhukti].ta} புக்தி / ${GRAHA_INFO[ad.antara].ta} அந்தரம்` : ''}. கோச்சாரம்: ${goBits.join(', ') || 'சாதாரணம்'}. மொத்தம் ${best} சாதக / ${worst} பிரதிகூல காரணிகள் — மதிப்பீடு ${rating}/100. கீழே ஒவ்வொரு காரணியும் குறிப்பிடப்பட்டுள்ளது.`,
    en: `House ${def.primaryHouse} (${houseClassEn}) — lord ${GRAHA_INFO[lordId].en} in ${RASI[lord.rasi].en.split(' ')[0]} (${lord.dignity.en}), ${lordHouseClassEn}, Shadbala ${lord.shadbala.total}/100. Nakshatra Saram: ${GRAHA_INFO[nk.id].en} (house ${nk.house}, ${nkD.en}). Paarvai: on house, benefic ${benH.length}/malefic ${malH.length}; on lord, benefic ${benL.length}/malefic ${malL.length}. Ashtakavarga ${savV} bindus (vs 28). ${ad ? `Current ${ad.mahadasa} Mahadasa / ${ad.bhukti} Bhukti / ${ad.antara} Antara` : ''}. Gochara: ${goBitsEn.join(', ') || 'ordinary'}. Overall ${best} supportive / ${worst} adverse factors — rating ${rating}/100. Every contributing factor is listed below.`,
  };
  return {
    key: def.key, title: def.title, rating,
    contributors: ledger.filter((r) => r.sign !== 0).slice(0, 6).map((r) => r.value),
    body, ledger,
  };
}

// ---------- Main computation ----------
export function computeDossier(profile: BirthProfile, transitDate: string): Dossier {
  const [y, mo, d] = profile.date.split('-').map(Number);
  const [hh, mm] = profile.time.split(':').map(Number);
  const utcTotalMin = hh * 60 + mm - profile.timezoneOffsetMinutes;
  const utcDate = new Date(Date.UTC(y, mo - 1, d, 0, 0) + utcTotalMin * 60000);
  const jd = julianDayUTC(utcDate.getUTCFullYear(), utcDate.getUTCMonth() + 1, utcDate.getUTCDate(), utcDate.getUTCHours(), utcDate.getUTCMinutes(), utcDate.getUTCSeconds());
  const { longitudes, ayanamsa } = siderealLongitudes(jd, profile.panchangamMode);
  const { lagna } = lagnaSidereal(jd, profile.latitude, profile.longitude, profile.panchangamMode);
  const lagnaRasi = Math.floor(lagna / 30);
  const lagnaNak = nakshatraOf(lagna);
  const moonRasi = Math.floor(longitudes.Moon / 30);
  const moonNak = nakshatraOf(longitudes.Moon);
  const d10LagnaRasi = dasamsaRasi(lagna);
  const jd1 = jd + 1;
  const next = siderealLongitudes(jd1, profile.panchangamMode).longitudes;
  const sunLon = longitudes.Sun;
  const isDay = hh >= 6 && hh < 18;
  // Moon phase: elongation from Sun (waxing 0..180)
  const elong = norm360(longitudes.Moon - sunLon);
  const waxing = elong < 180;

  // Pass 1: base evaluation
  const grahas: GrahaEval[] = GRAHA_ORDER.map((id) => {
    const lon = longitudes[id]; const rasi = Math.floor(lon / 30); const deg = degInRasi(lon);
    const nak = nakshatraOf(lon); const d9 = navamsaRasi(lon); const d10 = dasamsaRasi(lon);
    const vel = norm180(next[id] - lon);
    const retro = (id !== 'Sun' && id !== 'Moon' && id !== 'Rahu' && id !== 'Ketu') ? vel < 0 : (id === 'Rahu' || id === 'Ketu');
    const ang = Math.abs(norm180(lon - sunLon));
    const orb = COMBUST_ORB[id] ?? 0;
    const combust = id !== 'Sun' && orb > 0 && ang <= orb;
    const house = houseFrom(lagnaRasi, rasi);
    const dig = dignityOf(id, rasi);
    const friend = friendshipOf(id, rasi);
    return {
      id, lon, rasi, deg, nakIdx: nak.idx, pada: nak.pada, d9, d10, d10House: houseFrom(d10LagnaRasi, d10),
      velocity: vel, retro, combust, combustOrb: orb, house,
      dignity: { ta: dig.ta, en: dig.en }, dignityKey: dig.key, d9Dignity: dignityOf(id, d9).key,
      friendship: friend, avastha: avasthaOf(deg),
      digbala: DIGBALA_HOUSE[id] === house, vargottama: d9 === rasi, waxing: id === 'Moon' ? waxing : true,
      grahaYuddha: null,
      functional: { key: '', label: { ta: '', en: '' } }, badhaka: false,
      kartari: { key: 'none', label: { ta: '', en: '' } },
      aspectsGiven: [], aspectDetails: [], aspectsReceived: [],
      shadbala: { sthana: 50, dig: 45, kala: 50, cheshta: 50, drik: 55, naisargika: 50, total: 50 },
      nakLord: { id: '', house: 0, dignityKey: 'neutral', strength: 50 },
      strength: 50, neechaBhanga: false, parivarthanaWith: [], vipareeta: false, kendradhipatya: false, harsha: null, factors: [],
    } as GrahaEval;
  });
  const byId: Record<string, GrahaEval> = {}; grahas.forEach((g) => (byId[g.id] = g));

  // Graha Yuddha: same rasi within 1°
  for (let i = 0; i < grahas.length; i++) for (let j = i + 1; j < grahas.length; j++) {
    const a = grahas[i], b = grahas[j];
    if (a.rasi === b.rasi && a.id !== 'Rahu' && a.id !== 'Ketu' && b.id !== 'Rahu' && b.id !== 'Ketu' && Math.abs(norm180(a.lon - b.lon)) <= 1) {
      const aWins = a.deg >= b.deg; // higher longitude wins in this simple classical rule
      a.grahaYuddha = { with: b.id, won: aWins }; b.grahaYuddha = { with: a.id, won: !aWins };
    }
  }

  // Aspects given/received (full Drishti model)
  grahas.forEach((g) => {
    const spec = ASPECT_SPEC[g.id];
    const targets: AspectDetail[] = [];
    const pushTargets = (nums: number[], traditional?: boolean) => nums.forEach((num) => {
      const targetRasi = (g.rasi + num - 1) % 12;
      targets.push({
        num, targetRasi, targetHouse: houseFrom(lagnaRasi, targetRasi), traditional,
        grahasInTarget: GRAHA_ORDER.filter((id) => id !== g.id && byId[id].rasi === targetRasi),
      });
    });
    pushTargets(spec.nums);
    if (spec.traditional) pushTargets(spec.traditional, true);
    g.aspectDetails = targets;
    g.aspectsGiven = targets.map((t) => t.num);
  });
  grahas.forEach((g) => {
    g.aspectsReceived = GRAHA_ORDER.filter((id) => id !== g.id).flatMap((id) => {
      const o = byId[id];
      return o.aspectDetails.filter((a) => a.targetRasi === g.rasi).map((a) => ({ from: id, num: a.num, traditional: a.traditional }));
    });
  });

  // Functional nature & kartari
  grahas.forEach((g) => {
    const f = functionalOf(g.id, lagnaRasi);
    g.functional = { key: f.key, label: { ta: f.ta, en: f.en } };
    g.badhaka = f.badhaka;
    g.kartari = kartariOf(g.rasi, byId);
    const nakLordId = NAK_LORDS[g.nakIdx % 9];
    const nk = byId[nakLordId];
    g.nakLord = { id: nakLordId, house: nk.house, dignityKey: nk.dignityKey, strength: nk.strength };
  });

  // Pass 2: Neechabhanga, Parivarthana, Vipareeta, Kendradhipatya
  const kendraFrom = (fromRasi: number, targetRasi: number) => [1, 4, 7, 10].includes(houseFrom(fromRasi, targetRasi));
  grahas.forEach((g) => {
    if (g.dignityKey === 'debil') {
      const debilLord = RASI_LORDS[g.rasi];
      const exaltLord = RASI_LORDS[EXALT[g.id]];
      const dispositor = RASI_LORDS[g.rasi];
      const inKendra = (pid: string) => byId[pid] && (kendraFrom(lagnaRasi, byId[pid].rasi) || kendraFrom(moonRasi, byId[pid].rasi));
      if (inKendra(debilLord) || inKendra(exaltLord) || inKendra(dispositor)) g.neechaBhanga = true;
    }
  });
  for (let i = 0; i < grahas.length; i++) for (let j = i + 1; j < grahas.length; j++) {
    const a = grahas[i], b = grahas[j];
    if (OWN[a.id]?.includes(b.rasi) && OWN[b.id]?.includes(a.rasi)) { a.parivarthanaWith.push(b.id); b.parivarthanaWith.push(a.id); }
  }
  const dusthanaHousesOf: Record<string, number[]> = {};
  [6, 8, 12].forEach((h) => { const l = RASI_LORDS[(lagnaRasi + h - 1) % 12]; (dusthanaHousesOf[l] ??= []).push(h); });
  grahas.forEach((g) => {
    const ruled = dusthanaHousesOf[g.id];
    if (!ruled || ![6, 8, 12].includes(g.house)) return;
    if (ruled.includes(g.house)) {
      // Dusthana lord in its OWN dusthana: Harsha (6) / Sarala (8) / Vimala (12) — ஆட்சி பலம், NOT Vipareeta
      g.harsha = g.house === 6 ? { ta: 'ஹர்ஷ யோகம் (ஆட்சி பலம்)', en: 'Harsha Yoga (own-house strength)' }
        : g.house === 8 ? { ta: 'சரள யோகம் (ஆட்சி பலம்)', en: 'Sarala Yoga (own-house strength)' }
        : { ta: 'விமல யோகம் (ஆட்சி பலம்)', en: 'Vimala Yoga (own-house strength)' };
    } else {
      g.vipareeta = true;
    }
  });
  const kendraLords = new Set<string>();
  [1, 4, 7, 10].forEach((h) => kendraLords.add(RASI_LORDS[(lagnaRasi + h - 1) % 12]));
  grahas.forEach((g) => { if (kendraLords.has(g.id) && [6, 8, 12].includes(g.house) && !g.vipareeta) g.kendradhipatya = true; });

  // Shadbala components (deterministic composite)
  const NAISARGIKA: Record<string, number> = { Sun: 60, Moon: 55, Mars: 50, Mercury: 62, Jupiter: 70, Venus: 64, Saturn: 42, Rahu: 40, Ketu: 40 };
  grahas.forEach((g) => {
    const sthana = g.dignityKey === 'exalt' ? 100 : g.dignityKey === 'mt' ? 85 : g.dignityKey === 'own' ? 80 : g.dignityKey === 'debil' ? 18
      : g.friendship.en === 'Friend' ? 62 : g.friendship.en === 'Enemy' ? 36 : 50;
    const sthanaFinal = Math.min(100, sthana + (g.vargottama ? 5 : 0) + (g.neechaBhanga ? 10 : 0) - (g.kendradhipatya ? 8 : 0));
    const dig = g.digbala ? 90 : 45;
    const dayGraha = ['Sun', 'Mars', 'Jupiter', 'Venus'].includes(g.id);
    const kala = g.id === 'Moon' ? (waxing ? (isDay ? 62 : 70) : (isDay ? 42 : 50))
      : dayGraha ? (isDay ? 68 : 48) : (g.id === 'Mercury' ? 58 : isDay ? 48 : 66);
    const cheshta = g.retro && g.id !== 'Rahu' && g.id !== 'Ketu' ? 80 : (g.id === 'Rahu' || g.id === 'Ketu') ? 65 : Math.abs(g.velocity) > 0.6 ? 62 : 48;
    let drik = 55;
    g.aspectsReceived.forEach((a) => {
      if (a.traditional) return;
      const f = byId[a.from];
      drik += isBenefic(a.from, f.waxing) ? 7 : -7;
    });
    drik = Math.max(5, Math.min(100, drik));
    const total = Math.round(sthanaFinal * 0.25 + dig * 0.15 + kala * 0.15 + cheshta * 0.15 + drik * 0.20 + NAISARGIKA[g.id] * 0.10);
    g.shadbala = { sthana: sthanaFinal, dig, kala, cheshta, drik, naisargika: NAISARGIKA[g.id], total };
    // strength = shadbala + house placement + motion/war adjustments
    let s = total;
    if ([1, 4, 7, 10].includes(g.house)) s += 6; else if ([5, 9].includes(g.house)) s += 5; else if ([6, 8, 12].includes(g.house)) s -= 6;
    if (g.grahaYuddha && !g.grahaYuddha.won) s -= 6;
    if (g.combust) s -= 6;
    if (g.parivarthanaWith.length) s += 4;
    if (g.vipareeta) s += 5;
    g.strength = Math.max(4, Math.min(98, Math.round(s)));
  });

  // Yogas
  const yogas: Yoga[] = [];
  const addYoga = (ta: string, en: string, grahasList: string[], effTa: string, effEn: string, nature: Yoga['nature']) => yogas.push({ name: { ta, en }, grahas: grahasList, effect: { ta: effTa, en: effEn }, nature });
  grahas.filter((g) => g.neechaBhanga).forEach((g) => addYoga('நீச்சபங்க ராஜயோகம்', 'Neechabhanga Rajayoga', [g.id], `${GRAHA_INFO[g.id].ta} நீசமாக இருந்தாலும் கேந்திரத்தில் உள்ள அதிபதிகளால் பங்கம் நீங்கி ராஜயோக பலன் தரும்.`, `${GRAHA_INFO[g.id].en} is debilitated but cancellation by kendra lords elevates it to Rajayoga strength.`, 'benefic'));
  grahas.filter((g) => g.parivarthanaWith.length).forEach((g) => addYoga('பரிவர்த்தனை யோகம்', 'Parivarthana Yoga', [g.id, ...g.parivarthanaWith], 'இரு கிரகங்கள் பரஸ்பரம் ஒருவர் வீட்டில் மற்றவர் இருக்கும் யோகம்.', 'Mutual exchange of signs between two planets — powerful reciprocal strength.', 'benefic'));
  grahas.filter((g) => g.harsha).forEach((g) => addYoga(g.harsha!.ta.replace(' (ஆட்சி பலம்)', ''), g.harsha!.en.replace(' (own-house strength)', ''), [g.id], `${GRAHA_INFO[g.id].ta} ${g.house} ஆம் வீட்டு அதிபதியாக தன் வீட்டில் (ஆட்சி பலம்) — துஷ்டான பலன்களில் வெற்றி, எதிர்ப்புகள் விலகும்.`, `${GRAHA_INFO[g.id].en} rules house ${g.house} and sits in it (own-house strength) — success in challenging matters, obstacles clear.`, 'benefic'));
  grahas.filter((g) => g.vipareeta).forEach((g) => addYoga('விபரீத ராஜயோகம்', 'Vipareeta Rajayoga', [g.id], '6/8/12 ஆம் வீட்டு அதிபதி மற்றொரு துஷ்டானத்தில் — எதிரிகளை வென்று மறைமுக லாபம் தரும் யோகம்.', 'Dusthana lord in a different dusthana — victory over opponents and hidden gains.', 'benefic'));
  grahas.filter((g) => g.kendradhipatya).forEach((g) => addYoga('கேந்திராதிபத்திய தோஷம்', 'Kendradhipatya Dosha', [g.id], 'கேந்திராதிபதி துஷ்டானத்தில் இருப்பதால் தொழில்/நிலைத்தன்மையில் கவனம் தேவை.', 'Kendra lord in dusthana — career stability needs conscious effort.', 'malefic'));
  grahas.filter((g) => ['Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'].includes(g.id) && (g.dignityKey === 'own' || g.dignityKey === 'exalt') && [1, 4, 7, 10].includes(g.house)).forEach((g) => addYoga('பஞ்ச மகாபுருஷ யோகம்', 'Pancha Mahapurusha Yoga', [g.id], 'சொந்த/உச்ச வீட்டில் கேந்திரத்தில் — பெரும் ஆளுமை யோகம்.', 'Own/exalted in kendra — great personality and authority yoga.', 'benefic'));
  if (byId.Jupiter && [1, 4, 7, 10].includes(houseFrom(moonRasi, byId.Jupiter.rasi))) addYoga('கஜகேசரி யோகம்', 'Gajakesari Yoga', ['Jupiter', 'Moon'], 'குரு சந்திரனுக்கு கேந்திரத்தில் — புகழ், அறிவு, நிலையான செல்வம்.', 'Jupiter in kendra from Moon — fame, wisdom and lasting wealth.', 'benefic');
  if (byId.Sun && byId.Mercury && byId.Sun.rasi === byId.Mercury.rasi) addYoga('புத-ஆதித்ய யோகம்', 'Budha-Aditya Yoga', ['Sun', 'Mercury'], 'சூரியன்-புதன் ஒரே ராசி — அறிவு, தொழில் திறன், அரசு ஆதரவு.', 'Sun–Mercury conjunction — intellect, professional skill and authority support.', 'benefic');
  if (byId.Moon && byId.Mars && byId.Moon.rasi === byId.Mars.rasi) addYoga('சந்திர-மங்கள யோகம்', 'Chandra-Mangala Yoga', ['Moon', 'Mars'], 'சந்திரன்-செவ்வாய் ஒரே ராசி — தனம், தைரியம், சொத்து யோகம்.', 'Moon–Mars conjunction — wealth, courage and property yoga.', 'benefic');
  grahas.filter((g) => g.grahaYuddha && g.grahaYuddha.won).forEach((g) => addYoga('கிரக யுத்த வெற்சி', 'Graha Yuddha Victory', [g.id, g.grahaYuddha!.with], `${GRAHA_INFO[g.id].ta} கிரக யுத்தத்தில் வெற்றி பெற்றுள்ளது — பலம் கூடுதல்.`, `${GRAHA_INFO[g.id].en} wins its planetary war — enhanced strength.`, 'benefic'));
  grahas.filter((g) => g.kartari.key === 'shubha').slice(0, 2).forEach((g) => addYoga('சுப கர்த்தாரி யோகம்', 'Shubha Kartari Yoga', [g.id], `${GRAHA_INFO[g.id].ta} சுப கிரகங்களால் சூழப்பட்டுள்ளது — பாதுகாப்பு யோகம்.`, `${GRAHA_INFO[g.id].en} hemmed by benefics — protective yoga.`, 'benefic'));
  grahas.filter((g) => g.kartari.key === 'papa').slice(0, 2).forEach((g) => addYoga('பாப கர்த்தாரி தோஷம்', 'Papa Kartari Dosha', [g.id], `${GRAHA_INFO[g.id].ta} பாவ கிரகங்களால் சூழப்பட்டுள்ளது — கவனம் தேவை.`, `${GRAHA_INFO[g.id].en} hemmed by malefics — needs care.`, 'malefic'));
  const kemadruma = !grahas.some((g) => g.id !== 'Moon' && g.id !== 'Sun' && g.id !== 'Rahu' && g.id !== 'Ketu' && (g.rasi === moonRasi || g.rasi === ((moonRasi + 1) % 12) || g.rasi === ((moonRasi + 11) % 12)));
  const jupiterKendraFromMoon = !!byId.Jupiter && [1, 4, 7, 10].includes(houseFrom(moonRasi, byId.Jupiter.rasi));
  if (kemadruma && !jupiterKendraFromMoon) addYoga('கேமதுரும தோஷம்', 'Kemadruma Dosha', ['Moon'], 'சந்திரனுக்கு 2/12-ல் கிரகம் இல்லை — மன உறுதி குறையும் காலம்.', 'No planet in the 2nd/12th from Moon — emotional steadiness needs care.', 'malefic');
  if (!yogas.length) addYoga('யோகம் இல்லை', 'No major yoga', [], 'இந்த ஜாதகத்தில் முக்கிய யோகம் அமையவில்லை; தசா-புக்தி பலம் முக்கியம்.', 'No major yoga in this chart; Dasa-Bhukti strength is primary.', 'neutral');

  // Ashtakavarga
  const refRasi: Record<string, number> = { Lagna: lagnaRasi }; GRAHA_ORDER.forEach((id) => (refRasi[id] = byId[id].rasi));
  const bav: Record<string, number[]> = {}; const sav = new Array(12).fill(0);
  GRAHA_ORDER.slice(0, 7).forEach((pid) => {
    const arr = new Array(12).fill(0);
    for (const ref of ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Lagna']) {
      (BAV_TABLE[pid][ref] || []).forEach((h) => {
        const r = ((refRasi[ref] + h - 1) % 12);
        arr[r] += 1; sav[r] += 1;
      });
    }
    bav[pid] = arr;
  });
  const bhavaBala = Array.from({ length: 12 }, (_, i) => {
    const rasi = ((lagnaRasi + i) % 12); const occupants = grahas.filter((g) => g.rasi === rasi);
    const avgStr = occupants.length ? occupants.reduce((s, g) => s + g.strength, 0) / occupants.length : 50;
    return { house: i + 1, rasi, sav: sav[rasi], score: Math.round(Math.min(100, Math.max(5, (sav[rasi] / 40) * 55 + avgStr * 0.45))) };
  });

  // Vimshottari Dasa (Maha + Bhukti + Antara), 120 years from birth
  const birthLord = NAK_LORDS[moonNak.idx % 9];
  const birthLordYears = DASHA_LORDS.find((l) => l.id === birthLord)!.years;
  const nakSpan = 360 / 27; const traversed = norm360(longitudes.Moon) - moonNak.idx * nakSpan;
  const elapsedYears = (traversed / nakSpan) * birthLordYears;
  const balanceYears = birthLordYears - elapsedYears;
  const birthDate = new Date(Date.UTC(y, mo - 1, d));
  const YR = 365.25 * 86400000;
  const dasa: DasaPeriod[] = [];
  const makeBhuktis = (lordIdx: number, dasaYears: number, start: Date) => {
    const out: DasaPeriod['bhuktis'] = []; let bc = new Date(start);
    for (let b = 0; b < 9; b++) {
      const bl = DASHA_LORDS[(lordIdx + b) % 9];
      const byears = (dasaYears * bl.years) / 120;
      const bend = new Date(bc.getTime() + byears * YR);
      // antaras inside bhukti
      const antaras: DasaPeriod['bhuktis'][0]['antaras'] = [];
      let ac = new Date(bc);
      for (let a = 0; a < 9; a++) {
        const al = DASHA_LORDS[(DASHA_START_INDEX[bl.id] + a) % 9];
        const ayears = (byears * al.years) / 120;
        const aend = new Date(ac.getTime() + ayears * YR);
        antaras.push({ lord: al.id, start: new Date(ac), end: aend }); ac = aend;
      }
      out.push({ lord: bl.id, start: new Date(bc), end: bend, antaras }); bc = bend;
    }
    return out;
  };
  const dasaStart = new Date(birthDate.getTime() - elapsedYears * YR);
  dasa.push({ lord: birthLord, start: dasaStart, end: new Date(dasaStart.getTime() + birthLordYears * YR), years: birthLordYears, bhuktis: makeBhuktis(DASHA_START_INDEX[birthLord], birthLordYears, dasaStart) });
  let covered = balanceYears; let idx = (DASHA_START_INDEX[birthLord] + 1) % 9;
  while (covered < 120 - 1e-9) {
    const lord = DASHA_LORDS[idx];
    const years = Math.min(lord.years, 120 - covered);
    const start = new Date(birthDate.getTime() + covered * YR);
    dasa.push({ lord: lord.id, start, end: new Date(start.getTime() + years * YR), years, bhuktis: makeBhuktis(idx, lord.years, start) });
    covered += lord.years; idx = (idx + 1) % 9;
  }
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let activeDasa: Dossier['activeDasa'] = null;
  for (const p of dasa) {
    if (today >= p.start && today < p.end) {
      const bh = p.bhuktis.find((b) => today >= b.start && today < b.end);
      const an = bh?.antaras.find((a) => today >= a.start && today < a.end);
      activeDasa = {
        mahadasa: p.lord, bhukti: bh ? bh.lord : p.lord, antara: an ? an.lord : (bh ? bh.lord : p.lord),
        start: p.start, end: p.end, antaraStart: an ? an.start : (bh ? bh.start : p.start), antaraEnd: an ? an.end : (bh ? bh.end : p.end),
      };
      break;
    }
  }

  // Gochara with fromLagna
  const [ty, tm, td] = transitDate.split('-').map(Number);
  const tjd = julianDayUTC(ty, tm, td, 12, 0);
  const tSid = siderealLongitudes(tjd, profile.panchangamMode).longitudes;
  const tNext = siderealLongitudes(tjd + 1, profile.panchangamMode).longitudes;
  const gocharaGrahas = GRAHA_ORDER.map((id) => {
    const rasi = Math.floor(tSid[id] / 30);
    return { id, lon: tSid[id], rasi, fromMoon: houseFrom(moonRasi, rasi), fromLagna: houseFrom(lagnaRasi, rasi), retro: (id !== 'Sun' && id !== 'Moon' && id !== 'Rahu' && id !== 'Ketu') ? norm180(tNext[id] - tSid[id]) < 0 : (id === 'Rahu' || id === 'Ketu') };
  });
  const sani = gocharaGrahas.find((g) => g.id === 'Saturn')!; const guru = gocharaGrahas.find((g) => g.id === 'Jupiter')!; const rahuT = gocharaGrahas.find((g) => g.id === 'Rahu')!;
  const sadeSati = [12, 1, 2].includes(sani.fromMoon); const ashtamaSani = sani.fromMoon === 8;
  const guruBalam = [2, 5, 7, 9, 11].includes(guru.fromMoon);
  const rahuKetuTransit = [3, 6, 10, 11].includes(rahuT.fromMoon);
  // Double transit: Saturn & Jupiter both occupy or aspect a house (from Lagna)
  const hitsHouse = (g: { rasi: number }, h: number, nums: number[]) => {
    const target = (lagnaRasi + h - 1) % 12;
    return g.rasi === target || nums.some((n) => (g.rasi + n - 1) % 12 === target);
  };
  const doubleTransitHouses: number[] = [];
  for (let h = 1; h <= 12; h++) {
    const satHit = hitsHouse(sani, h, [3, 7, 10]);
    const guruHit = hitsHouse(guru, h, [5, 7, 9]);
    if (satHit && guruHit) doubleTransitHouses.push(h);
  }
  const flags = [
    { key: 'sade', name: { ta: 'ஏழரைச் சனி', en: 'Sade Sati (7½ Saturn)' }, active: sadeSati, detail: { ta: `சனி சந்திரனுக்கு ${sani.fromMoon} ஆம் வீட்டில் — ${sadeSati ? 'ஏழரைச் சனி நடக்கிறது' : 'ஏழரைச் சனி இல்லை'}`, en: `Saturn is ${sani.fromMoon}th from Moon — ${sadeSati ? 'Sade Sati is active' : 'no Sade Sati'}` } },
    { key: 'ashtama', name: { ta: 'அஷ்டம சனி', en: 'Ashtama Sani' }, active: ashtamaSani, detail: { ta: `சனி ${sani.fromMoon} ஆம் வீட்டில் — ${ashtamaSani ? 'அஷ்டம சனி' : 'அஷ்டம சனி இல்லை'}`, en: `Saturn ${sani.fromMoon}th from Moon — ${ashtamaSani ? 'Ashtama Sani active' : 'no Ashtama Sani'}` } },
    { key: 'guru', name: { ta: 'குரு பலம்', en: 'Guru Balam' }, active: guruBalam, detail: { ta: `குரு சந்திரனுக்கு ${guru.fromMoon} ஆம் வீட்டில் — ${guruBalam ? 'குரு பலம் உண்டு' : 'குரு பலம் இல்லை'}`, en: `Jupiter ${guru.fromMoon}th from Moon — ${guruBalam ? 'Guru Balam present' : 'no Guru Balam'}` } },
    { key: 'rahu', name: { ta: 'ராகு-கேது பெயர்ச்சி', en: 'Rahu–Ketu Transit' }, active: rahuKetuTransit, detail: { ta: `ராகு சந்திரனுக்கு ${rahuT.fromMoon} ஆம் வீட்டில் — ${rahuKetuTransit ? 'நல்ல பெயர்ச்சி' : 'கவனம் தேவை'}`, en: `Rahu ${rahuT.fromMoon}th from Moon — ${rahuKetuTransit ? 'favourable transit' : 'needs care'}` } },
    { key: 'double', name: { ta: 'இரட்டை பெயர்ச்சி (குரு-சனி)', en: 'Double Transit (Jupiter–Saturn)' }, active: doubleTransitHouses.length > 0, detail: { ta: doubleTransitHouses.length ? `${doubleTransitHouses.join(', ')} ஆம் வீடுகளில் குரு-சனி இரட்டை பெயர்ச்சி` : 'இரட்டை பெயர்ச்சி இல்லை', en: doubleTransitHouses.length ? `Double transit on house ${doubleTransitHouses.join(', ')}` : 'No double transit' } },
  ];

  // Grids
  const rasiGrid: Record<number, string[]> = {}; const navamsaGrid: Record<number, string[]> = {};
  for (let i = 0; i < 12; i++) { rasiGrid[i] = []; navamsaGrid[i] = []; }
  grahas.forEach((g) => { rasiGrid[g.rasi].push(g.id); navamsaGrid[g.d9].push(g.id); });

  // 40 factors
  const factorCtx = { byId, moonRasi, lagnaRasi, sunLon, sav, bav, bhavaBala, activeDasa, gocharaGrahas };
  grahas.forEach((g) => { g.factors = buildFactors(g, factorCtx); });

  // Predictions with full multi-factor ledger
  const predictions = DOMAIN_DEFS.map((def) => synthesizeDomain(def, {
    byId, lagnaRasi, moonRasi, sav, bav, bhavaBala, activeDasa,
    dasaLord: activeDasa ? activeDasa.mahadasa : birthLord,
    gochara: { date: transitDate, jd: tjd, grahas: gocharaGrahas, flags },
    doubleTransitHouses,
  }));

  return {
    profile, jd, ayanamsa, lagnaLon: lagna, lagnaRasi, lagnaNak, grahas, yogas, sav, bav, bhavaBala, dasa,
    balance: { lord: birthLord, yearsLeft: balanceYears, totalYears: birthLordYears, elapsedYears },
    activeDasa,
    gochara: { date: transitDate, jd: tjd, grahas: gocharaGrahas, flags },
    doubleTransitHouses, predictions, rasiGrid, navamsaGrid,
  };
}
export function fmtDate(d: Date) { return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`; }
