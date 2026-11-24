// Birth → 70 Years Dasa-Bhukti Life Timeline
// Flattens Vimshottari Maha-Bhukti periods from the exact birth balance to age 70,
// and synthesizes a deterministic classical prediction per (Dasa lord, Bhukti lord, life stage).
import type { Dossier, GrahaEval, Bilingual, LedgerRow } from './engine';
import { GRAHA_INFO, houseFrom, FRIENDS, ENEMIES } from './engine';

export const YR = 365.25 * 86400000;
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_TA = ['ஜன.', 'பிப்.', 'மார்.', 'ஏப்.', 'மே', 'ஜூன்', 'ஜூலை', 'ஆக.', 'செப்.', 'அக்.', 'நவ.', 'டிச.'];

export function fmtLong(d: Date, lang: 'ta' | 'en') {
  const m = lang === 'ta' ? MONTHS_TA : MONTHS_EN;
  return `${String(d.getUTCDate()).padStart(2, '0')} ${m[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
export function ageSpanText(a0: number, a1: number, lang: 'ta' | 'en') {
  if (lang === 'ta') return `வயது ${a0.toFixed(1)} – ${a1.toFixed(1)}`;
  const ym = (a: number) => { const y = Math.floor(a); const m = Math.round((a - y) * 12); return `${y}y ${m}m`; };
  return `Age ${ym(a0)} – ${ym(a1)}`;
}

export interface LifeStage { key: string; label: Bilingual; houses: number[]; theme: Bilingual }
export function lifeStageOf(age: number): LifeStage {
  if (age < 6) return {
    key: 'early', label: { ta: '0–5 வயது: ஆரோக்கியம், பெற்றோர் அதிர்ஷ்டம், வளர்ப்பு', en: 'Age 0–5: Health, parental fortune, early upbringing' },
    houses: [9, 4], theme: { ta: 'ஆரோக்கியம், சுறுசுறுப்பு, பெற்றோர் ஒத்துழைப்பு', en: 'health, vitality, parental support' },
  };
  if (age < 18) return {
    key: 'school', label: { ta: '6–17 வயது: பள்ளிப்படிப்பு, அடிப்படை கல்வி, நினைவாற்றல்', en: 'Age 6–17: Schooling, foundational learning, memory' },
    houses: [2, 4, 5], theme: { ta: 'படிப்பு, நினைவாற்றல், விளையாட்டு/கலை ஆர்வம்', en: 'learning, memory, extracurricular focus' },
  };
  if (age < 26) return {
    key: 'youth', label: { ta: '18–25 வயது: உயர்கல்வி, போட்டித் தேர்வுகள், முதல் தொழில்', en: 'Age 18–25: Higher education, competitive exams, first career break' },
    houses: [10, 6, 11], theme: { ta: 'உயர்கல்வி, போட்டித் தேர்வுகள், முதல் வேலை வாய்ப்பு, இடமாற்றம்', en: 'higher education, exams, first job, relocation' },
  };
  if (age < 41) return {
    key: 'adult', label: { ta: '26–40 வயது: தொழில் உயர்வு, திருமணம், குழந்தை, சொத்து', en: 'Age 26–40: Career elevation, marriage, children, property' },
    houses: [7, 5, 4, 2, 11], theme: { ta: 'தொழில் உயர்வு, திருமணம்/கூட்டாண்மை, குழந்தை பாக்கியம், சொத்து/வாகனம், சேமிப்பு', en: 'career growth, partnership, childbirth, property/vehicle, savings' },
  };
  if (age < 59) return {
    key: 'mature', label: { ta: '41–58 வயது: உச்ச அதிகாரம், விரிவாக்கம், ஆரோக்கிய கவனம்', en: 'Age 41–58: Peak authority, expansion, health vigilance' },
    houses: [6, 8], theme: { ta: 'தொழில் விரிவாக்கம், அதிகாரம், குழந்தைகளின் முன்னேற்றம், உடல்நல கவனம்', en: 'business expansion, authority, children\'s milestones, health care' },
  };
  return {
    key: 'senior', label: { ta: '59–70 வயது: நிதி ஒருங்கிணைப்பு, ஆலோசனை, ஆன்மிகம்', en: 'Age 59–70: Financial consolidation, mentorship, spiritual pursuits' },
    houses: [9, 12, 1, 8], theme: { ta: 'நிதி ஒருங்கிணைப்பு, ஆலோசகர் பங்கு, ஆன்மிகம், உடல்நல பராமரிப்பு', en: 'consolidation, advisory roles, spirituality, vitality care' },
  };
}

export interface BhuktiPrediction {
  rating: number; category: Bilingual; body: Bilingual;
  events: { career: Bilingual; finance: Bilingual; family: Bilingual; health: Bilingual };
  ledger: LedgerRow[]; guidance: Bilingual;
}
export interface TimelineRow {
  dasaLord: string; bhuktiLord: string; start: Date; end: Date;
  ageStart: number; ageEnd: number;
  status: 'completed' | 'active' | 'upcoming';
  prediction: BhuktiPrediction;
}

function categoryOf(r: number): Bilingual {
  if (r >= 75) return { ta: 'மிகச் சிறப்பான யோக காலம்', en: 'Highly Auspicious' };
  if (r >= 55) return { ta: 'வளர்ச்சி மற்றும் முன்னேற்றம்', en: 'Progressive' };
  if (r >= 40) return { ta: 'சமநிலை', en: 'Moderate' };
  return { ta: 'கவனம் மற்றும் பொறுமை தேவை', en: 'Challenging' };
}

// Sambandham: house distance from dasa lord's rasi to bhukti lord's rasi
function sambandham(dist: number): { label: Bilingual; score: number } {
  if (dist === 5 || dist === 9) return { label: { ta: `${dist}/9 திரிகோண சம்பந்தம் — அதிர்ஷ்டம்`, en: `${dist}/9 Trikona link — fortune` }, score: 8 };
  if (dist === 4 || dist === 10) return { label: { ta: `${dist}/10 கேந்திர சம்பந்தம் — செயல்/வளர்ச்சி`, en: `${dist}/10 Kendra link — action/growth` }, score: 6 };
  if (dist === 1) return { label: { ta: '1/1 சேர்க்கை — வலுவான ஒருங்கிணைப்பு', en: '1/1 conjunction — strong fusion' }, score: 5 };
  if (dist === 3 || dist === 11) return { label: { ta: `${dist}/11 உபசய சம்பந்தம் — முயற்சி/பலன்`, en: `${dist}/11 Upachaya link — effort/gain` }, score: 2 };
  if (dist === 2 || dist === 12) return { label: { ta: `${dist}/12 துவிர்துவாதச சம்பந்தம் — செலவு/மாற்றம்`, en: `${dist}/12 Dwirdwadasa link — expense/adjustment` }, score: -5 };
  return { label: { ta: `${dist}/8 சஷ்டாஷ்டக சம்பந்தம் — உராய்வு`, en: `${dist}/8 Shashtashtaka link — friction` }, score: -8 };
}

export function predictBhukti(dasaLord: string, bhuktiLord: string, midAge: number, d: Dossier): BhuktiPrediction {
  const byId: Record<string, GrahaEval> = Object.fromEntries(d.grahas.map((g) => [g.id, g]));
  const A = byId[dasaLord], B = byId[bhuktiLord];
  const stage = lifeStageOf(midAge);
  const ledger: LedgerRow[] = [];
  let score = 0;
  const add = (ta: string, en: string, vta: string, ven: string, sign: 1 | 0 | -1) => {
    ledger.push({ label: { ta, en }, value: { ta: vta, en: ven }, sign });
    return sign;
  };

  // 1. Natal strength of both lords
  const avgStr = (A.strength + B.strength) / 2;
  score += (avgStr - 50) * 0.32;
  add('தசா & புக்தி நாதர் பலம்', 'Dasa & Bhukti lord natal strength',
    `${GRAHA_INFO[dasaLord].ta} ${A.strength}/100 · ${GRAHA_INFO[bhuktiLord].ta} ${B.strength}/100`,
    `${dasaLord} ${A.strength}/100 · ${bhuktiLord} ${B.strength}/100`,
    avgStr >= 60 ? 1 : avgStr < 45 ? -1 : 0);

  // 2. Sambandham (distance, friendship, mutual paarvai)
  const dist = houseFrom(A.rasi, B.rasi);
  const sam = sambandham(dist);
  score += sam.score;
  const natFriend = A.id === B.id ? 1 : FRIENDS[dasaLord]?.includes(bhuktiLord) ? 1 : ENEMIES[dasaLord]?.includes(bhuktiLord) ? -1 : 0;
  score += natFriend * 4;
  const panchaB = B.friendship.en === 'Friend' ? 2 : B.friendship.en === 'Enemy' ? -2 : 0;
  score += panchaB;
  const mutualAspect = A.aspectDetails.some((x) => x.targetRasi === B.rasi) || B.aspectDetails.some((x) => x.targetRasi === A.rasi);
  if (mutualAspect) score += 4;
  add('தசா-புக்தி சம்பந்தம்', 'Dasa-Bhukti Sambandham',
    `${sam.label.ta} · ${natFriend > 0 ? 'இயற்கை நட்பு' : natFriend < 0 ? 'இயற்கை பகை' : 'நடுநிலை'}${mutualAspect ? ' · பரஸ்பர பார்வை' : ''}`,
    `${sam.label.en} · ${natFriend > 0 ? 'natural friends' : natFriend < 0 ? 'natural enemies' : 'neutral'}${mutualAspect ? ' · mutual Paarvai' : ''}`,
    sam.score > 0 && natFriend >= 0 ? 1 : sam.score < 0 || natFriend < 0 ? -1 : 0);

  // 3. Nakshatra saram + Ashtakavarga
  const nkA = A.nakLord, nkB = B.nakLord;
  const savAvg = (d.sav[A.rasi] + d.sav[B.rasi]) / 2;
  score += (savAvg - 28) * 0.45;
  add('நட்சத்திர சாரம் & அஷ்டகவர்க்கம்', 'Nakshatra Saram & Ashtakavarga',
    `${GRAHA_INFO[nkA.id].ta} (வலு ${nkA.strength}) · ${GRAHA_INFO[nkB.id].ta} (வலு ${nkB.strength}) · SAV ${d.sav[A.rasi]}/${d.sav[B.rasi]} (28 ஒப்பீடு)`,
    `${nkA.id} (str ${nkA.strength}) · ${nkB.id} (str ${nkB.strength}) · SAV ${d.sav[A.rasi]}/${d.sav[B.rasi]} (vs 28)`,
    (nkA.strength + nkB.strength) / 2 >= 55 && savAvg >= 28 ? 1 : (nkA.strength + nkB.strength) / 2 < 42 || savAvg < 26 ? -1 : 0);

  // 4. Life-stage house activation
  const bandBala = stage.houses.reduce((s, h) => s + d.bhavaBala[h - 1].score, 0) / stage.houses.length;
  score += (bandBala - 50) * 0.22;
  add('வயது கட்டம் & இயங்கும் பாவங்கள்', 'Life stage & activated houses',
    `${stage.label.ta} · பாவங்கள் ${[...new Set([A.house, B.house, ...stage.houses])].sort((x, y) => x - y).join(', ')} · சராசரி பாவ பலம் ${Math.round(bandBala)}`,
    `${stage.label.en} · houses ${[...new Set([A.house, B.house, ...stage.houses])].sort((x, y) => x - y).join(', ')} · avg bhava bala ${Math.round(bandBala)}`,
    bandBala >= 55 ? 1 : bandBala < 45 ? -1 : 0);

  // 5. Dignity & overrides / motion
  const ov = [A, B].flatMap((g) => [g.neechaBhanga ? 'நீச்சபங்கம்' : '', g.parivarthanaWith.length ? 'பரிவர்த்தனை' : '', g.vipareeta ? 'விபரீதம்' : ''].filter(Boolean));
  score += ov.length * 2;
  const harm = [A, B].reduce((s, g) => s + (g.combust ? -2 : 0) + (g.grahaYuddha && !g.grahaYuddha.won ? -2 : 0), 0);
  score += harm;
  add('தசாநாதன் & புக்திநாதன் நிலை', 'Dasa & Bhukti lord states',
    `${GRAHA_INFO[dasaLord].ta}: ${A.dignity.ta} · ${A.functional.label.ta} · ${A.avastha.ta} · ${GRAHA_INFO[bhuktiLord].ta}: ${B.dignity.ta} · ${B.functional.label.ta} · ${B.avastha.ta}${ov.length ? ' · ' + ov.join(', ') : ''}`,
    `${dasaLord}: ${A.dignity.en} · ${A.functional.label.en} · ${A.avastha.en} · ${bhuktiLord}: ${B.dignity.en} · ${B.functional.label.en} · ${B.avastha.en}${ov.length ? ' · ' + ov.join(', ') : ''}`,
    A.strength + B.strength >= 110 ? 1 : A.strength + B.strength < 85 ? -1 : 0);

  const rating = Math.max(8, Math.min(95, Math.round(50 + (score - 0)))); // score already offset around 0
  const category = categoryOf(rating);
  const pos = rating >= 55, chal = rating < 40;

  // Events per domain
  const pairTa = `${GRAHA_INFO[dasaLord].ta} தசை — ${GRAHA_INFO[bhuktiLord].ta} புக்தி`;
  const pairEn = `${dasaLord} Mahadasa — ${bhuktiLord} Bhukti`;
  const events = {
    career: {
      ta: `${pairTa}: ${stage.theme.ta}. ${A.house === 10 || B.house === 10 || stage.houses.includes(10) ? 'பத்தாம் பாவ உந்துதல் — தொழில்/வேலையில் முன்னேற்றம், புதிய பொறுப்புகள்.' : 'தொழிலில் நிலையான சூழல்; புதிய திறன் கற்றல் பயனுள்ளது.'} ${pos ? 'மேலதிகாரிகள் ஆதரவு கிடைக்கும்.' : chal ? 'வேலை மாற்ற முடிவுகளில் பொறுமை தேவை.' : ''}`,
      en: `${pairEn}: ${stage.theme.en}. ${A.house === 10 || B.house === 10 || stage.houses.includes(10) ? '10th-house activation — progress at work, new responsibilities.' : 'Stable work climate; upskilling pays off.'} ${pos ? 'Superiors are supportive.' : chal ? 'Patience with job-change decisions.' : ''}`,
    },
    finance: {
      ta: `தனம்/சொத்து: ${[2, 11, 4].some((h) => stage.houses.includes(h) || A.house === h || B.house === h) ? '2/11/4 ஆம் பாவ உந்துதல் — சேமிப்பு வளர்ச்சி, சொத்து/வாகனம் வாங்கும் வாய்ப்பு.' : 'வழக்கமான வருமான ஓட்டம்; செலவுகளை திட்டமிடவும்.'} ${chal ? 'கடன்/பங்கு பரிவர்த்தனை தவிர்க்கவும்.' : ''}`,
      en: `Finances/property: ${[2, 11, 4].some((h) => stage.houses.includes(h) || A.house === h || B.house === h) ? '2/11/4 activation — savings growth, chances of property/vehicle purchase.' : 'Steady income flow; plan expenses.'} ${chal ? 'கடன்/பங்கு பரிவர்த்தனை தவிர்க்கவும்.' : ''}`,
    },
    family: {
      ta: `குடும்பம்/உறவுகள்: ${stage.houses.includes(7) || A.house === 7 || B.house === 7 ? 'கலத்திர பாவ உந்துதல் — திருமணம்/கூட்டாண்மை முன்னேற்றம், வாழ்க்கைத் துணை ஆதரவு.' : 'குடும்ப ஒற்றுமை நிலைத்திருக்கும்; முக்கிய முடிவுகளில் குடும்ப ஆலோசனை பெறவும்.'} ${chal ? 'உறவுகளில் விட்டுக்கொடுக்கும் மனப்பான்மை தேவை.' : ''}`,
      en: `Family/relationships: ${stage.houses.includes(7) || A.house === 7 || B.house === 7 ? '7th-house activation — marriage/partnership progress, spouse support.' : 'Family harmony sustains; seek counsel on major decisions.'} ${chal ? 'உறவுகளில் விட்டுக்கொடுக்கும் மனப்பான்மை தேவை.' : ''}`,
    },
    health: {
      ta: `ஆரோக்கியம்: ${stage.houses.includes(1) || stage.houses.includes(6) || stage.houses.includes(8) ? '1/6/8 கவன பாவங்கள் — வழக்கமான உடற்பயிற்சி, உணவு ஒழுங்கு முக்கியம்.' : 'ஆரோக்கியம் பொதுவாக நல்லது; ஓய்வு போதுமானது.'} ${chal ? 'சோர்வு/தூக்கம் கவனிக்கவும்; மருத்துவ பரிசோதனை தவிர்க்க வேண்டாம்.' : ''}`,
      en: `Health: ${stage.houses.includes(1) || stage.houses.includes(6) || stage.houses.includes(8) ? '1/6/8 focus — regular exercise and diet discipline matter.' : 'Health generally good; adequate rest.'} ${chal ? 'Watch fatigue/sleep; keep medical check-ups.' : ''}`,
    },
  };

  // Body
  const body: Bilingual = {
    ta: `${pairTa}. ${sam.label.ta}. தசாநாதன் ${GRAHA_INFO[dasaLord].ta} ${A.dignity.ta} (${A.strength}/100), புக்திநாதன் ${GRAHA_INFO[bhuktiLord].ta} ${B.dignity.ta} (${B.strength}/100). ${stage.label.ta}. இந்த காலத்தில் ${pos ? 'வளர்ச்சி வாய்ப்புகள் அதிகம் — தகுந்த நேரத்தில் முயற்சிகள் பலன் தரும்' : chal ? 'கவனமும் பொறுமையும் தேவை — முக்கிய முடிவுகளை பரிசீலித்து எடுக்கவும்' : 'சீரான முன்னேற்றம் — நிலைத்த முயற்சி பலன் தரும்'}. மதிப்பீடு ${rating}/100 (${category.ta}).`,
    en: `${pairEn}. ${sam.label.en}. Dasa lord ${dasaLord} ${A.dignity.en} (${A.strength}/100); Bhukti lord ${bhuktiLord} ${B.dignity.en} (${B.strength}/100). ${stage.label.en}. In this period, ${pos ? 'growth opportunities are strong — well-timed efforts bear fruit' : chal ? 'caution and patience are needed — weigh major decisions carefully' : 'steady progress — consistent effort pays off'}. Rating ${rating}/100 (${category.en}).`,
  };

  // Guidance
  const guidance: Bilingual = chal ? {
    ta: 'வழிகாட்டுதல்: முக்கிய ஒப்பந்தங்கள்/முதலீடுகளில் கூடுதல் கவனம்; ஆரோக்கிய பராமரிப்பு, குடும்ப உரையாடல் ஆகியவற்றுக்கு முன்னுரிமை. பரிகாரமாக குரு/சனி மந்திரம், தானம் பரிந்துரைக்கப்படுகிறது.',
    en: 'Guidance: extra care with major contracts/investments; prioritise health upkeep and family dialogue. Classical remedy: Guru/Saturn mantra and charity are advised.',
  } : pos ? {
    ta: 'வழிகாட்டுதல்: தொழில் மாற்றம், புதிய முயற்சி, சொத்து/வாகனம் வாங்குதல், கல்வி தொடர்தல் போன்ற நல்ல காலம் — தயக்கமின்றி முன்னெடுக்கலாம்.',
    en: 'Guidance: an auspicious window for job change, new ventures, property/vehicle purchase and education — proceed with confidence.',
  } : {
    ta: 'வழிகாட்டுதல்: வழக்கமான பணிகள் தொடரலாம்; புதிய பெரிய முதலீடுகளை சிந்தித்து செய்யவும். ஒழுங்கான வழக்கம் மற்றும் குடும்ப நேரம் பலன் தரும்.',
    en: 'Guidance: routine work continues well; deliberate before large new investments. Regular routine and family time bring results.',
  };

  return { rating, category, body, events, ledger, guidance };
}
export function buildTimeline(d: Dossier, now: Date): TimelineRow[] {
  const [y, mo, da] = d.profile.date.split('-').map(Number);
  const birth = new Date(Date.UTC(y, mo - 1, da));
  const end70 = new Date(birth.getTime() + 70 * YR);
  const rows: TimelineRow[] = [];
  for (const p of d.dasa) {
    for (const b of p.bhuktis) {
      if (b.end <= birth || b.start >= end70) continue;
      const s = b.start < birth ? birth : b.start;
      const e = b.end > end70 ? end70 : b.end;
      const ageStart = (s.getTime() - birth.getTime()) / YR;
      const ageEnd = (e.getTime() - birth.getTime()) / YR;
      const status: TimelineRow['status'] = now < s ? 'upcoming' : now >= e ? 'completed' : 'active';
      rows.push({
        dasaLord: p.lord, bhuktiLord: b.lord, start: s, end: e,
        ageStart, ageEnd, status,
        prediction: predictBhukti(p.lord, b.lord, (ageStart + ageEnd) / 2, d),
      });
    }
  }
  return rows;
}
