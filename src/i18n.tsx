// Bilingual UI strings + language context. Tamil-first, instant toggle.
import { createContext, useContext } from 'react';
import type { Bilingual } from './engine';

export type Lang = 'ta' | 'en';

/** Default birth-profile name: displays as தமிழ் in Tamil, Tamizh in English. */
export const DEFAULT_PROFILE_NAME = 'தமிழ்';
export function profileName(name: string, lang: 'ta' | 'en' | 'bi'): string {
  if (name !== DEFAULT_PROFILE_NAME) return name;
  return lang === 'ta' ? 'தமிழ்' : lang === 'en' ? 'Tamizh' : 'தமிழ் / Tamizh';
}

export const STRINGS: Record<string, Bilingual> = {
  wordmark: { ta: 'மித்ரன் ஜோதிடம்', en: 'Mithran Predictions' },
  wordmarkSub: { ta: 'தென்னிந்திய ஜோதிட பணிமனை', en: 'South Indian Jothidam Workbench' },
  navChart: { ta: 'ஜாதகம்', en: 'Charts' },
  navStrength: { ta: 'வலு & யோகம்', en: 'Strength & Yogas' },
  navDasa: { ta: 'தசா & கோச்சாரம்', en: 'Dasa & Gochara' },
  navPredict: { ta: 'பலன்கள்', en: 'Predictions' },

  birthRail: { ta: 'பிறப்பு விவரங்கள்', en: 'Birth Details' },
  name: { ta: 'பெயர்', en: 'Name' },
  dob: { ta: 'பிறந்த தேதி', en: 'Date of Birth' },
  tob: { ta: 'பிறந்த நேரம்', en: 'Time of Birth' },
  place: { ta: 'பிறந்த இடம்', en: 'Place of Birth' },
  latitude: { ta: 'அட்சரேகை', en: 'Latitude' },
  longitude: { ta: 'தீர்க்கரேகை', en: 'Longitude' },
  timezone: { ta: 'நேர வலயம் (நிமிடம்)', en: 'Timezone (minutes)' },
  mode: { ta: 'பஞ்சாங்க முறை', en: 'Panchangam Mode' },
  thirukanitham: { ta: 'திருக்கணிதம்', en: 'Thirukanitham' },
  vakya: { ta: 'வாக்கியம்', en: 'Vakya' },
  transitDate: { ta: 'கோச்சார தேதி', en: 'Transit Date' },
  calculate: { ta: 'கணக்கிடு', en: 'Calculate' },
  reset: { ta: 'மீட்டமை', en: 'Reset' },

  rasiChart: { ta: 'D1 — ராசி (ஜனன லக்ன சக்கரம்)', en: 'D1 — Rasi (Birth Lagna Chart)' },
  navamsaChart: { ta: 'D9 — நவாம்ச சக்கரம்', en: 'D9 — Navamsa Chart' },
  lagna: { ta: 'லக்னம்', en: 'Lagna' },
  lagnaLabel: { ta: 'லக்', en: 'Asc' },
  janmaRasi: { ta: 'ஜனன ராசி', en: 'Janma Rasi' },
  janmaNak: { ta: 'ஜனன நட்சத்திரம்', en: 'Janma Nakshatra' },
  ayanamsa: { ta: 'அயனாம்சம்', en: 'Ayanamsa' },
  grahaPositions: { ta: 'கிரக நிலைகள்', en: 'Graha Positions' },
  selectGraha: { ta: 'கிரகத்தைத் தேர்ந்தெடுக்கவும்', en: 'Select a graha to inspect' },
  fortyFactors: { ta: '40 காரணிகள் — கிரக ஆய்வு', en: '40-Factor Graha Inspector' },

  strengthBars: { ta: 'கிரக வலு (0–100)', en: 'Graha Strength (0–100)' },
  savTitle: { ta: 'சர்வாஷ்டகவர்க்கம் — 337 பிண்டுகள்', en: 'Sarvashtakavarga — 337 Bindus' },
  savSub: { ta: 'சராசரி 28.08 / ராசி', en: 'Average 28.08 / sign' },
  bhavaBala: { ta: 'பாவ பலம்', en: 'Bhava Bala' },
  yogasTitle: { ta: 'யோகங்கள் & தோஷங்கள்', en: 'Yogas & Doshas' },
  house: { ta: 'வீடு', en: 'House' },
  bindus: { ta: 'பிண்டுகள்', en: 'Bindus' },
  score: { ta: 'மதிப்பெண்', en: 'Score' },

  dasaTitle: { ta: 'விம்சோத்தரி தசா-புக்தி', en: 'Vimshottari Dasa-Bhukti' },
  dasaSub: { ta: 'பிறப்பு முதல் 120 வருடங்கள்', en: '120 years from birth' },
  balance: { ta: 'தசா இருப்பு', en: 'Dasa Balance' },
  activeNow: { ta: 'தற்போது', en: 'Now' },
  mahadasa: { ta: 'மகாதசா', en: 'Mahadasa' },
  bhukti: { ta: 'புக்தி', en: 'Bhukti' },
  bhuktisOf: { ta: 'புக்திகள்', en: 'Bhuktis' },
  gocharaTitle: { ta: 'கோச்சாரம் — கிரக பெயர்ச்சி', en: 'Gochara — Live Transits' },
  fromMoon: { ta: 'சந்திரனிலிருந்து', en: 'From Moon' },
  status: { ta: 'நிலை', en: 'Status' },
  active: { ta: 'உண்டு', en: 'Active' },
  notActive: { ta: 'இல்லை', en: 'No' },
  retro: { ta: 'வ', en: 'R' },

  predictionsTitle: { ta: 'பலன்கள் — ஐந்து துறைகள்', en: 'Predictions — Five Domains' },
  contributors: { ta: 'காரணிகள்', en: 'Contributors' },
  rating: { ta: 'வலு', en: 'Strength' },
  referral: { ta: 'குறிப்பு', en: 'Reference' },

  showAllPaarvai: { ta: 'அனைத்து பார்வைகள்', en: 'Show All Paarvai' },
  hideAllPaarvai: { ta: 'பார்வைகளை மறை', en: 'Hide Paarvai' },
  paarvaiMatrix: { ta: 'பார்வை அட்டவணை', en: 'Paarvai Matrix' },
  paarvaiGiven: { ta: 'பார்க்கும் வீடுகள் & கிரகங்கள்', en: 'Paarvai Given (houses & grahas)' },
  paarvaiReceived: { ta: 'பார்க்கப்படும் கிரகங்கள்', en: 'Paarvai Received' },
  navTimeline: { ta: 'தசாபுத்தி பலன்கள்', en: 'Life Timeline' },
  navPorutham: { ta: 'திருமணப்பொருத்தம்', en: 'Marriage Porutham' },
  navReference: { ta: 'ஜோதிட அடிப்படை வழிகாட்டி', en: 'Reference Guide' },
  timelineTitle: { ta: 'பிறப்பு முதல் 70 வயது வரையிலான தசாபுத்தி பலன்கள்', en: 'Birth to 70 Years Dasa-Bhukti Life Timeline & Predictions' },
  filterAll: { ta: 'அனைத்தும் (0–70)', en: 'All (0–70 Yrs)' },
  filterActive: { ta: 'நடப்பு & அடுத்த 10 ஆண்டுகள்', en: 'Active & Next 10 Yrs' },
  filterAuspicious: { ta: 'சுப காலங்கள்', en: 'Auspicious Periods' },
  filterChallenging: { ta: 'சவால் காலங்கள்', en: 'Challenging Periods' },
  searchPh: { ta: 'தேடுக (கிரகம், ஆண்டு…)', en: 'Search (lord, year…)' },
  statusActive: { ta: 'நடப்பு தசாபுத்தி', en: 'Active Now' },
  statusDone: { ta: 'முடிந்தவை', en: 'Completed' },
  statusUpcoming: { ta: 'வரவிருப்பவை', en: 'Upcoming' },
  eventsCareer: { ta: 'தொழில்/வேலை', en: 'Career & Work' },
  eventsFinance: { ta: 'தனம்/சொத்து', en: 'Finances & Property' },
  eventsFamily: { ta: 'குடும்பம்/உறவுகள்', en: 'Family & Relationships' },
  eventsHealth: { ta: 'ஆரோக்கியம்', en: 'Health' },
  guidanceLabel: { ta: 'வழிகாட்டுதல் / எச்சரிக்கை', en: 'Guidance & Precaution' },
  activatedHouses: { ta: 'இயங்கும் பாவங்கள் & காரணிகள்', en: 'Activated Houses & Factors' },
  goTimeline: { ta: 'விரிவான 70 ஆண்டு காலவரிசை →', en: 'Full 70-year timeline →' },
  poruthamTitle: { ta: 'திருமணப் பொருத்தம் — ஜோதிட பொருத்த ஆய்வு', en: 'Marriage Compatibility & Jothidam Porutham' },
  brideLabel: { ta: 'பெண் ஜாதகம்', en: 'Bride' },
  groomLabel: { ta: 'ஆண் ஜாதகம்', en: 'Groom' },
  totalScore: { ta: 'மொத்த பொருத்த மதிப்பெண்', en: 'Overall Compatibility Score' },
  ledgerTitle: { ta: 'காரணி பதிவேடு (Factor Ledger)', en: 'Factor Ledger' },
  antara: { ta: 'அந்தரம்', en: 'Antara' },
  footer1: { ta: 'இது ஜோதிட மதிப்பீடு; மருத்துவ/சட்ட/நிதி முடிவுகளுக்கு நிபுணரை அணுகவும். அனைத்து பலன்களும் மரபு ஜோதிட விதிகளால் கணக்கிடப்பட்டவை.', en: 'This is an astrological assessment; consult a professional for medical/legal/financial decisions. All predictions are computed from classical rules.' },
  footer2: { ta: 'ஒரு அமர்வு கணக்கீடு — சேமிப்பு இல்லை', en: 'Single-session calculation — no storage' },
  calcTime: { ta: 'கணக்கீட்டு நேரம்', en: 'Compute time' },
};

export const GRAHA_ABBR: Record<string, { ta: string; en: string }> = {
  Sun: { ta: 'சூ', en: 'Su' }, Moon: { ta: 'சந்', en: 'Mo' }, Mars: { ta: 'செ', en: 'Ma' },
  Mercury: { ta: 'பு', en: 'Me' }, Jupiter: { ta: 'கு', en: 'Ju' }, Venus: { ta: 'சு', en: 'Ve' },
  Saturn: { ta: 'ச', en: 'Sa' }, Rahu: { ta: 'ரா', en: 'Ra' }, Ketu: { ta: 'கே', en: 'Ke' },
};

export const TAG: Record<string, { ta: string; en: string }> = {
  own: { ta: '(ஆ)', en: '(Own)' }, exalt: { ta: '(உ)', en: '(Exalt)' }, debil: { ta: '(நீ)', en: '(Debil)' },
  nbhanga: { ta: '(நீ.ப)', en: '(N.Bhanga)' }, retro: { ta: '(வ)', en: '(Retro)' }, combust: { ta: '(அஸ்)', en: '(Combust)' },
};

export function ordinal(n: number, lang: Lang) {
  if (lang === 'ta') return `${n}-ம்`;
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export const LangCtx = createContext<Lang>('ta');
export const useLang = () => useContext(LangCtx);
export const useT = () => {
  const lang = useLang();
  return (k: keyof typeof STRINGS) => STRINGS[k][lang];
};
export const pick = (b: Bilingual, lang: Lang) => b[lang];
