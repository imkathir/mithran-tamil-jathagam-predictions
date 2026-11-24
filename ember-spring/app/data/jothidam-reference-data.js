// Jothidam Reference Guide — standalone bilingual dataset (Ember-convention path).
// Single source of truth shared with the Mithran Predictions UI, the rule engine,
// and the Spring Boot endpoint GET /api/v1/reference/metadata.
// Plain ESM JavaScript, zero placeholders.

export const DASA_YEARS = {
  Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17,
};

export const PLANET_NAMES = {
  Sun: { ta: 'சூரியன்', en: 'Sun', sym: '☉', abbr: 'சூ' },
  Moon: { ta: 'சந்திரன்', en: 'Moon', sym: '☽', abbr: 'சந்' },
  Mars: { ta: 'செவ்வாய்', en: 'Mars', sym: '♂', abbr: 'செ' },
  Mercury: { ta: 'புதன்', en: 'Mercury', sym: '☿', abbr: 'பு' },
  Jupiter: { ta: 'குரு', en: 'Jupiter', sym: '♃', abbr: 'கு' },
  Venus: { ta: 'சுக்கிரன்', en: 'Venus', sym: '♀', abbr: 'சு' },
  Saturn: { ta: 'சனி', en: 'Saturn', sym: '♄', abbr: 'ச' },
  Rahu: { ta: 'ராகு', en: 'Rahu', sym: '☊', abbr: 'ரா' },
  Ketu: { ta: 'கேது', en: 'Ketu', sym: '☋', abbr: 'கே' },
};

export const RASI_REF = [
  { index: 0, ta: 'மேஷம்', en: 'Mesham (Aries)', sanskrit: 'Mesha', sym: '♈', lords: ['Mars'],
    exalt: [{ planet: 'Sun', degree: 10 }], debil: [{ planet: 'Saturn', degree: 20 }] },
  { index: 1, ta: 'ரிஷபம்', en: 'Rishabam (Taurus)', sanskrit: 'Vrishabha', sym: '♉', lords: ['Venus'],
    exalt: [{ planet: 'Moon', degree: 3 }, { planet: 'Rahu', degree: 20, traditional: true }], debil: [{ planet: 'Ketu', degree: 20, traditional: true }] },
  { index: 2, ta: 'மிதுனம்', en: 'Mithunam (Gemini)', sanskrit: 'Mithuna', sym: '♊', lords: ['Mercury'], exalt: [], debil: [] },
  { index: 3, ta: 'கடகம்', en: 'Kadagam (Cancer)', sanskrit: 'Karka', sym: '♋', lords: ['Moon'],
    exalt: [{ planet: 'Jupiter', degree: 5 }], debil: [{ planet: 'Mars', degree: 28 }] },
  { index: 4, ta: 'சிம்மம்', en: 'Simmam (Leo)', sanskrit: 'Simha', sym: '♌', lords: ['Sun'], exalt: [], debil: [] },
  { index: 5, ta: 'கன்னி', en: 'Kanni (Virgo)', sanskrit: 'Kanya', sym: '♍', lords: ['Mercury'],
    exalt: [{ planet: 'Mercury', degree: 15 }], debil: [{ planet: 'Venus', degree: 27 }] },
  { index: 6, ta: 'துலாம்', en: 'Thulam (Libra)', sanskrit: 'Tula', sym: '♎', lords: ['Venus'],
    exalt: [{ planet: 'Saturn', degree: 20 }], debil: [{ planet: 'Sun', degree: 10 }] },
  { index: 7, ta: 'விருச்சிகம்', en: 'Vrichikam (Scorpio)', sanskrit: 'Vrischika', sym: '♏', lords: ['Mars'],
    exalt: [{ planet: 'Ketu', degree: 20, traditional: true }], debil: [{ planet: 'Moon', degree: 3 }, { planet: 'Rahu', degree: 20, traditional: true }] },
  { index: 8, ta: 'தனுசு', en: 'Dhanusu (Sagittarius)', sanskrit: 'Dhanu', sym: '♐', lords: ['Jupiter'], exalt: [], debil: [] },
  { index: 9, ta: 'மகரம்', en: 'Makaram (Capricorn)', sanskrit: 'Makara', sym: '♑', lords: ['Saturn'],
    exalt: [{ planet: 'Mars', degree: 28 }], debil: [{ planet: 'Jupiter', degree: 5 }] },
  { index: 10, ta: 'கும்பம்', en: 'Kumbham (Aquarius)', sanskrit: 'Kumbha', sym: '♒', lords: ['Saturn'], exalt: [], debil: [] },
  { index: 11, ta: 'மீனம்', en: 'Meenam (Pisces)', sanskrit: 'Meena', sym: '♓', lords: ['Jupiter'],
    exalt: [{ planet: 'Venus', degree: 27 }], debil: [{ planet: 'Mercury', degree: 15 }] },
];

const NAK_NAMES = [
  ['அஸ்வினி', 'Ashwini'], ['பரணி', 'Bharani'], ['கார்த்திகை', 'Karthigai'],
  ['ரோகிணி', 'Rohini'], ['மிருகசீரிஷம்', 'Mrigasheersham'], ['திருவாதிரை', 'Thiruvathirai'],
  ['புனர்பூசம்', 'Punarpoosam'], ['புஷ்யம்', 'Pushyam'], ['ஆயில்யம்', 'Ayilyam'],
  ['மகம்', 'Magam'], ['பூரம்', 'Pooram'], ['உத்திரம்', 'Uthiram'],
  ['அஸ்தம்', 'Hastham'], ['சித்திரை', 'Chithirai'], ['சுவாதி', 'Swathi'],
  ['விசாகம்', 'Visakam'], ['அனுஷம்', 'Anusham'], ['கேட்டை', 'Kettai'],
  ['மூலம்', 'Moolam'], ['பூராடம்', 'Pooradam'], ['உத்திராடம்', 'Uthiradam'],
  ['திருவோணம்', 'Thiruvonam'], ['அவிட்டம்', 'Avittam'], ['சதயம்', 'Sadhayam'],
  ['பூரட்டாதி', 'Poorattathi'], ['உத்திரட்டாதி', 'Uthirattathi'], ['ரேவதி', 'Revathi'],
];
const NAK_LORD_SEQ = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];

export const NAKSHATRA_REF = NAK_NAMES.map(([ta, en], i) => ({
  index: i, ta, en,
  startDeg: (i * 360) / 27,
  endDeg: ((i + 1) * 360) / 27,
  lord: NAK_LORD_SEQ[i % 9],
}));

export const LORD_STARS = Object.fromEntries(
  NAK_LORD_SEQ.map((lord) => [lord, NAKSHATRA_REF.filter((n) => n.lord === lord).map((n) => n.index)]),
);

export const BHAVA_REF = [
  {
    house: 1, ta: 'தனு / லக்ன பாவம்', en: 'Thanu / Lagna Bhava', sanskrit: 'Tanu',
    categories: [{ ta: 'கேந்திரம்', en: 'Kendra' }, { ta: 'திரிகோணம்', en: 'Trikona' }],
    significations: [
      { ta: 'உடல், ஆரோக்கியம், உயிர் சக்தி', en: 'Body, health, vitality' },
      { ta: 'தோற்றம், அழகு, குணம்', en: 'Appearance, beauty, temperament' },
      { ta: 'சுய மரியாதை, புகழ்', en: 'Self-respect, fame' },
      { ta: 'பிறப்பு, தொடக்கங்கள்', en: 'Birth, new beginnings' },
      { ta: 'மன தைரியம், தலைமைப் பண்பு', en: 'Courage, leadership' },
      { ta: 'தலை, முகம்', en: 'Head, face' },
    ],
  },
  {
    house: 2, ta: 'தன / குடும்ப பாவம்', en: 'Dhana / Family Bhava', sanskrit: 'Dhana',
    categories: [{ ta: 'மரக பாவம்', en: 'Maraka' }],
    significations: [
      { ta: 'தனம், சேமிப்பு, பொருளாதாரம்', en: 'Wealth, savings, finances' },
      { ta: 'குடும்பம், குலம்', en: 'Family, lineage' },
      { ta: 'பேச்சு, வாக்கு வன்மை', en: 'Speech, eloquence' },
      { ta: 'உணவு, ருசி', en: 'Food, taste' },
      { ta: 'வலது கண்', en: 'Right eye' },
      { ta: 'ஆரம்க் கல்வி, கல்விச் சொத்து', en: 'Early education, learning assets' },
      { ta: 'வங்கி, நகை, மதிப்புமிக்க பொருட்கள்', en: 'Banks, jewellery, valuables' },
    ],
  },
  {
    house: 3, ta: 'சகோதர / சகாஜ பாவம்', en: 'Sahaja / Courage Bhava', sanskrit: 'Sahaja',
    categories: [{ ta: 'உபசயம்', en: 'Upachaya' }],
    significations: [
      { ta: 'தைரியம், துணிச்சல்', en: 'Courage, bravery' },
      { ta: 'சகோதரர்/சகோதரிகள்', en: 'Brothers & sisters' },
      { ta: 'முயற்சி, உழைப்பு', en: 'Effort, enterprise' },
      { ta: 'குறுகிய பயணங்கள்', en: 'Short journeys' },
      { ta: 'தகவல் தொடர்பு, எழுத்து', en: 'Communication, writing' },
      { ta: 'கைகள், தோள்கள்', en: 'Arms, shoulders' },
      { ta: 'விளையாட்டு, இசை, பொழுதுபோக்கு', en: 'Sports, music, hobbies' },
    ],
  },
  {
    house: 4, ta: 'சுக / மாத்ரு பாவம்', en: 'Sukha / Matru Bhava', sanskrit: 'Sukha',
    categories: [{ ta: 'கேந்திரம்', en: 'Kendra' }],
    significations: [
      { ta: 'தாய், தாய்வழி உறவுகள்', en: 'Mother, maternal relations' },
      { ta: 'வீடு, இல்லம், சொந்த ஊர்', en: 'Home, house, homeland' },
      { ta: 'நிலம், விவசாயம், பண்ணை', en: 'Agricultural land, farming' },
      { ta: 'கால்நடைகள், விலங்குகள் (Cattle/Livestock)', en: 'Cattle & livestock' },
      { ta: 'வாகனங்கள்', en: 'Vehicles' },
      { ta: 'கல்வி, பள்ளி, பட்டறிவு', en: 'Education, schooling' },
      { ta: 'மகிழ்ச்சி, மன அமைதி', en: 'Happiness, domestic peace' },
      { ta: 'நெஞ்சு, இதயம், நுரையீரல்', en: 'Chest, heart, lungs' },
      { ta: 'நீர்நிலை, குளம், கட்டிடங்கள்', en: 'Water bodies, buildings' },
    ],
  },
  {
    house: 5, ta: 'புத்திர / புத்ர பாவம்', en: 'Putra / Children Bhava', sanskrit: 'Putra',
    categories: [{ ta: 'திரிகோணம்', en: 'Trikona' }],
    significations: [
      { ta: 'குழந்தைகள், புத்திர பாக்கியம்', en: 'Children, progeny' },
      { ta: 'அறிவு, புத்திக்கூர்மை', en: 'Intelligence, intellect' },
      { ta: 'படைப்பாற்றல், கலை', en: 'Creativity, arts' },
      { ta: 'காதல், காதல் உறவுகள்', en: 'Romance, love affairs' },
      { ta: 'மந்திரம், ஆன்மிக பயிற்சி', en: 'Mantra, spiritual practice' },
      { ta: 'முன் ஜென்ம புண்ணியம்', en: 'Past-life merit' },
      { ta: 'மாணவர்கள், போட்டித் தேர்வுகள்', en: 'Students, competitive exams' },
      { ta: 'வயிறு', en: 'Stomach' },
    ],
  },
  {
    house: 6, ta: 'ரோக / சத்ரு பாவம்', en: 'Roga / Shatru Bhava', sanskrit: 'Ari',
    categories: [{ ta: 'துஷ்டானம்', en: 'Dusthana' }, { ta: 'உபசயம்', en: 'Upachaya' }],
    significations: [
      { ta: 'நோய், உடல் கோளாறுகள்', en: 'Disease, ailments' },
      { ta: 'எதிரிகள், போட்டியாளர்கள்', en: 'Enemies, rivals' },
      { ta: 'கடன், கடன் சுமை', en: 'Debts, loans' },
      { ta: 'வழக்கு, நீதிமன்றம்', en: 'Litigation, court cases' },
      { ta: 'வேலை, சேவை, ஊழியம்', en: 'Service, employment' },
      { ta: 'தாய் மாமன்', en: 'Maternal uncle' },
      { ta: 'போர், போராட்டம், பயிற்சி', en: 'Competition, training' },
      { ta: 'குடல், வயிற்று உபாதைகள்', en: 'Intestines, digestion' },
    ],
  },
  {
    house: 7, ta: 'கலத்திர / களத்திர பாவம்', en: 'Kalathra / Marriage Bhava', sanskrit: 'Kalatra',
    categories: [{ ta: 'கேந்திரம்', en: 'Kendra' }, { ta: 'மரக பாவம்', en: 'Maraka' }],
    significations: [
      { ta: 'திருமணம், வாழ்க்கைத் துணை', en: 'Marriage, spouse' },
      { ta: 'கூட்டாண்மை, வியாபார ஒப்பந்தம்', en: 'Partnership, business contracts' },
      { ta: 'தம்பதி உறவு', en: 'Marital union' },
      { ta: 'வெளிநாட்டு தொடர்பு, பயணம்', en: 'Foreign ties, travel' },
      { ta: 'பொது மக்கள், வாடிக்கையாளர்கள்', en: 'Public, customers' },
      { ta: 'சிறுநீரகம், இடுப்பு', en: 'Kidneys, waist' },
      { ta: 'எதிர்பாலின ஈர்ப்பு', en: 'Attraction to the opposite sex' },
    ],
  },
  {
    house: 8, ta: 'ஆயுள் / ஆயுர் பாவம்', en: 'Ayul / Longevity Bhava', sanskrit: 'Ayus',
    categories: [{ ta: 'துஷ்டானம்', en: 'Dusthana' }],
    significations: [
      { ta: 'ஆயுள், நீண்ட ஆயுள்', en: 'Longevity' },
      { ta: 'தடைகள், தாமதங்கள்', en: 'Obstacles, delays' },
      { ta: 'பரம்பரை சொத்து, வாரிசு', en: 'Inheritance, legacies' },
      { ta: 'காப்பீடு, ஓய்வூதியம்', en: 'Insurance, pensions' },
      { ta: 'திடீர் நிகழ்வுகள், மாற்றங்கள்', en: 'Sudden events, transformation' },
      { ta: 'ஆராய்ச்சி, ரகசிய அறிவு, ஜோதிடம்', en: 'Research, occult, astrology' },
      { ta: 'நீண்டகால நோய்கள்', en: 'Chronic ailments' },
      { ta: 'மரணம், மறுபிறப்பு நம்பிக்கைகள்', en: 'Death & regeneration' },
    ],
  },
  {
    house: 9, ta: 'பாக்கிய / தர்ம பாவம்', en: 'Bhagya / Dharma Bhava', sanskrit: 'Bhagya',
    categories: [{ ta: 'திரிகோணம்', en: 'Trikona' }],
    significations: [
      { ta: 'அதிர்ஷ்டம், யோகம்', en: 'Fortune, luck' },
      { ta: 'தர்மம், அறம்', en: 'Dharma, righteousness' },
      { ta: 'தந்தை, தந்தைவழி ஆசீர்வாதம்', en: 'Father, paternal blessings' },
      { ta: 'குரு, ஆசிரியர், வழிகாட்டி', en: 'Guru, teachers, mentors' },
      { ta: 'உயர்கல்வி, தத்துவம்', en: 'Higher learning, philosophy' },
      { ta: 'யாத்திரை, புனித பயணம்', en: 'Pilgrimage, holy journeys' },
      { ta: 'வெளிநாட்டு வாய்ப்புகள்', en: 'Fortune abroad' },
      { ta: 'தொடைகள்', en: 'Thighs' },
    ],
  },
  {
    house: 10, ta: 'கர்ம / தொழில் பாவம்', en: 'Karma / Career Bhava', sanskrit: 'Karma',
    categories: [{ ta: 'கேந்திரம்', en: 'Kendra' }],
    significations: [
      { ta: 'தொழில், பணி, உத்தியோகம்', en: 'Career, profession, job' },
      { ta: 'அந்தஸ்து, அதிகாரம்', en: 'Status, authority' },
      { ta: 'அரசு, அரசு அதிகாரிகள்', en: 'Government, officials' },
      { ta: 'புகழ், சமூக அங்கீகாரம்', en: 'Fame, social recognition' },
      { ta: 'செயல்கள், கடமைகள்', en: 'Actions, duties' },
      { ta: 'மேலதிகாரிகள், முதலாளிகள்', en: 'Superiors, employers' },
      { ta: 'தலைமைப் பொறுப்புகள்', en: 'Leadership roles' },
      { ta: 'முழங்கால்கள்', en: 'Knees' },
    ],
  },
  {
    house: 11, ta: 'லாப / ஆதாய பாவம்', en: 'Labha / Gains Bhava', sanskrit: 'Labha',
    categories: [{ ta: 'உபசயம்', en: 'Upachaya' }],
    significations: [
      { ta: 'லாபம், வருமானம்', en: 'Gains, income' },
      { ta: 'விருப்பங்கள், லட்சியங்கள்', en: 'Wishes, aspirations' },
      { ta: 'நண்பர்கள், ஆதரவு வலையமைப்பு', en: 'Friends, networks' },
      { ta: 'மூத்த சகோதரர்/சகோதரி', en: 'Elder siblings' },
      { ta: 'பெரிய நிறுவனங்கள், அமைப்புகள்', en: 'Large organisations' },
      { ta: 'முதலீட்டு லாபம்', en: 'Investment profits' },
      { ta: 'கணுக்கால்கள்', en: 'Ankles' },
    ],
  },
  {
    house: 12, ta: 'விரைய / மோக்ஷ பாவம்', en: 'Vyaya / Moksha Bhava', sanskrit: 'Vyaya',
    categories: [{ ta: 'துஷ்டானம்', en: 'Dusthana' }],
    significations: [
      { ta: 'செலவுகள், இழப்புகள்', en: 'Expenses, losses' },
      { ta: 'மோட்சம், விடுதலை', en: 'Moksha, liberation' },
      { ta: 'வெளிநாடு, வெளிநாட்டு வாழ்க்கை', en: 'Foreign lands, life abroad' },
      { ta: 'தூக்கம், ஓய்வு', en: 'Sleep, rest' },
      { ta: 'மருத்துவமனை, சிறை, ஆசிரமம்', en: 'Hospitals, confinement, ashrams' },
      { ta: 'தான தர்மம், தியாகம்', en: 'Charity, sacrifice' },
      { ta: 'இடது கண்', en: 'Left eye' },
      { ta: 'பாதங்கள்', en: 'Feet' },
    ],
  },
];

export const DEG_SPAN_TEXT = {
  ta: "0° 00' – 360° 00' · ஒவ்வொரு நட்சத்திரம் 13° 20' (360° ÷ 27)",
  en: "0° 00' – 360° 00' · each star spans 13° 20' (360° ÷ 27)",
};

export function degreeToNakshatra(degRaw) {
  const deg = ((degRaw % 360) + 360) % 360;
  const idx = Math.floor(deg / (360 / 27));
  const degInStar = deg - idx * (360 / 27);
  const pada = Math.floor(degInStar / (360 / 108)) + 1;
  return { nak: NAKSHATRA_REF[idx], pada, degInStar };
}
