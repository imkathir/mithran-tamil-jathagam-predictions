import { useMemo, useState } from 'react';
import {
  RASI_REF, NAKSHATRA_REF, BHAVA_REF, DASA_YEARS, PLANET_NAMES, PLANETS, LORD_STARS,
  DEG_SPAN_TEXT, degreeToNakshatra,
} from '../data/jothidam-reference-data';
import { useLang, pick } from '../i18n';

// Fixed South Indian 4x4 grid: rasi index -> (row, col)
const GRID: Record<number, [number, number]> = {
  11: [0, 0], 0: [0, 1], 1: [0, 2], 2: [0, 3],
  10: [1, 0], 3: [1, 3],
  9: [2, 0], 4: [2, 3],
  8: [3, 0], 7: [3, 1], 6: [3, 2], 5: [3, 3],
};

type PlanetId = (typeof PLANETS)[number];

function useFocusPlanet() {
  const [selected, setSelected] = useState<PlanetId | null>(null);
  const [hovered, setHovered] = useState<PlanetId | null>(null);
  return { active: hovered ?? selected, selected, setSelected, setHovered };
}

// ---------- Section 1: Rasi Dignity Explorer ----------
function RasiDignityExplorer() {
  const lang = useLang();
  const fp = useFocusPlanet();
  const [q, setQ] = useState('');

  const matches = (r: typeof RASI_REF[number], p: PlanetId | null) => {
    if (!p) return { aatchi: false, ucham: false, neecham: false };
    return {
      aatchi: r.lords.includes(p),
      ucham: r.exalt.some((e) => e.planet === p),
      neecham: r.debil.some((e) => e.planet === p),
    };
  };

  const filteredRasis = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return RASI_REF;
    return RASI_REF.filter((r) =>
      [r.ta, r.en, r.sanskrit, ...r.lords,
        ...r.exalt.map((e) => `${e.planet} ${PLANET_NAMES[e.planet].ta} ${PLANET_NAMES[e.planet].en} ${e.degree}`),
        ...r.debil.map((e) => `${e.planet} ${PLANET_NAMES[e.planet].ta} ${PLANET_NAMES[e.planet].en} ${e.degree}`),
      ].join(' ').toLowerCase().includes(s),
    );
  }, [q]);

  const degText = (d: number) => `${d}°`;

  return (
    <div className="panel">
      <div className="panel-title">
        <span>{lang === 'ta' ? '1. தென்னிந்திய ராசி ஆட்சி/உச்சம்/நீச்சம் ஆய்வு' : '1. South Indian Rasi Dignity Explorer (Aatchi, Ucham, Neecham)'}</span>
        <span className="meta">12 Rasis</span>
      </div>

      <div className="ref-pills">
        {PLANETS.map((p) => (
          <button
            key={p}
            className={`planet-pill${fp.selected === p ? ' on' : ''}`}
            onClick={() => fp.setSelected(fp.selected === p ? null : p)}
            onMouseEnter={() => fp.setHovered(p)}
            onMouseLeave={() => fp.setHovered(null)}
          >
            {pick(PLANET_NAMES[p], lang)} / {lang === 'ta' ? PLANET_NAMES[p].en : PLANET_NAMES[p].ta}
          </button>
        ))}
      </div>

      <div className="grid2" style={{ marginTop: 16 }}>
        <div>
          <div className="si-chart ref-grid">
            {RASI_REF.map((r) => {
              const [row, col] = GRID[r.index];
              const m = matches(r, fp.active);
              return (
                <div key={r.index} className="si-cell" style={{ gridRow: row + 1, gridColumn: col + 1 }}>
                  <span className="rasi-tag">{r.sym}</span>
                  <div className="graha-line"><span className="abbr">{pick({ ta: r.ta, en: r.en.split(' ')[0] }, lang)}</span></div>
                  <div className="ref-cell-lines">
                    <span className="ref-line">ஆ: {r.lords.map((l) => pick(PLANET_NAMES[l], lang)).join(', ')}</span>
                    {r.exalt.map((e, i) => <span key={`e${i}`} className="ref-line">உ: {pick(PLANET_NAMES[e.planet], lang)} {degText(e.degree)}</span>)}
                    {r.debil.map((e, i) => <span key={`d${i}`} className="ref-line">நீ: {pick(PLANET_NAMES[e.planet], lang)} {degText(e.degree)}</span>)}
                  </div>
                  {fp.active && (m.aatchi || m.ucham || m.neecham) && (
                    <div className="ref-badges">
                      {m.aatchi && <span className="ref-badge aatchi">{lang === 'ta' ? 'ஆட்சி' : 'Own'}</span>}
                      {m.ucham && <span className="ref-badge ucham">{lang === 'ta' ? 'உச்சம்' : 'Exalt'}</span>}
                      {m.neecham && <span className="ref-badge neecham">{lang === 'ta' ? 'நீச்சம்' : 'Debil'}</span>}
                    </div>
                  )}
                </div>
              );
            })}
            <div className="si-center">
              <div className="t">{fp.active ? pick(PLANET_NAMES[fp.active], lang) : (lang === 'ta' ? 'ராசி மானிடம்' : 'Rasi Grid')}</div>
              <div className="s">{fp.active
                ? (lang === 'ta' ? 'ஆட்சி (பச்சை) · உச்சம் (நீலம்) · நீச்சம் (சிவப்பு)' : 'Own (green) · Exalt (blue) · Debil (red)')
                : (lang === 'ta' ? 'கிரகத்தைத் தேர்ந்தெடுக்கவும்' : 'Pick a planet above')}</div>
            </div>
          </div>
        </div>

        <div>
          <input placeholder={lang === 'ta' ? 'ராசி/கிரகம் தேடுக…' : 'Search rasi / planet…'} value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 12 }} />
          <div className="ref-table">
            <div className="ref-tr ref-th">
              <span>{lang === 'ta' ? 'ராசி' : 'Rasi'}</span>
              <span>{lang === 'ta' ? 'ஆட்சி (Aatchi)' : 'Own Lords'}</span>
              <span>{lang === 'ta' ? 'உச்சம் + பரமோச்சம் (Ucham)' : 'Exaltation + Paramocham'}</span>
              <span>{lang === 'ta' ? 'நீச்சம் + பரமோநீச்சம் (Neecham)' : 'Debilitation + Paramoneecham'}</span>
            </div>
            {filteredRasis.map((r) => {
              const m = matches(r, fp.active);
              return (
                <div key={r.index} className={`ref-tr${fp.active && (m.aatchi || m.ucham || m.neecham) ? ' hit' : ''}`}>
                  <span className="ref-rasi-name">{pick({ ta: r.ta, en: r.en }, lang)}</span>
                  <span>{r.lords.map((l) => pick(PLANET_NAMES[l], lang)).join(', ')}</span>
                  <span>{r.exalt.length ? r.exalt.map((e) => `${pick(PLANET_NAMES[e.planet], lang)} ${degText(e.degree)}${e.traditional ? '†' : ''}`).join(', ') : '—'}</span>
                  <span>{r.debil.length ? r.debil.map((e) => `${pick(PLANET_NAMES[e.planet], lang)} ${degText(e.degree)}${e.traditional ? '†' : ''}`).join(', ') : '—'}</span>
                </div>
              );
            })}
          </div>
          <div className="ref-note">† {lang === 'ta' ? 'ராகு/கேது மரபு நிலைகள்' : 'Rahu/Ketu traditional positions'}</div>
        </div>
      </div>
    </div>
  );
}

// ---------- Section 2: 27 Nakshatras & Star Lords ----------
function NakshatraMatrix() {
  const lang = useLang();
  const [lordFilter, setLordFilter] = useState<string | null>(null);
  const [deg, setDeg] = useState('');

  const lookup = deg.trim() === '' ? null : degreeToNakshatra(Number(deg));
  const valid = deg.trim() === '' || (!Number.isNaN(Number(deg)) && Number(deg) >= 0 && Number(deg) <= 360);
  const shown = lordFilter ? NAKSHATRA_REF.filter((n) => n.lord === lordFilter) : NAKSHATRA_REF;
  const fmtSpan = (a: number, b: number) => {
    const f = (x: number) => { const d = Math.floor(x); const m = Math.round((x - d) * 60); return `${d}° ${String(m).padStart(2, '0')}'`; };
    return `${f(a)} – ${f(b)}`;
  };

  return (
    <div className="panel">
      <div className="panel-title">
        <span>{lang === 'ta' ? '2. 27 நட்சத்திரங்களும் அதிபதிகளும்' : '2. 27 Nakshatras & Star Lords Matrix'}</span>
        <span className="meta">{pick(DEG_SPAN_TEXT, lang)}</span>
      </div>

      <div className="ref-pills">
        <button className={`planet-pill${lordFilter === null ? ' on' : ''}`} onClick={() => setLordFilter(null)}>
          {lang === 'ta' ? 'அனைத்தும்' : 'All 27'}
        </button>
        {(['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'] as PlanetId[]).map((l) => (
          <button key={l} className={`planet-pill${lordFilter === l ? ' on' : ''}`} onClick={() => setLordFilter(lordFilter === l ? null : l)}>
            {pick(PLANET_NAMES[l], lang)} · {DASA_YEARS[l]}y ({LORD_STARS[l].map((i) => NAKSHATRA_REF[i].en.split(' ')[0]).join(', ')})
          </button>
        ))}
      </div>

      <div className="ref-lookup">
        <span className="ref-lookup-label">{lang === 'ta' ? 'பாகை → நட்சத்திர தேடல் (0°–360°)' : 'Degree → Nakshatra lookup (0°–360°)'}</span>
        <input
          type="number" min={0} max={360} step={0.01} placeholder="e.g. 271.5"
          value={deg} onChange={(e) => setDeg(e.target.value)} style={{ maxWidth: 140 }}
        />
        {lookup && valid && (
          <span className="ref-lookup-out num">
            {pick(lookup.nak, lang)} · {lang === 'ta' ? `${lookup.pada}-ம் பாதம்` : `Pada ${lookup.pada}`} · {lang === 'ta' ? 'அதிபதி' : 'Lord'}: {pick(PLANET_NAMES[lookup.nak.lord], lang)}
          </span>
        )}
        {!valid && <span className="nature-malefic" style={{ fontSize: 11 }}>{lang === 'ta' ? '0–360 இடைவெளியில் உள்ளிடவும்' : 'Enter a value within 0–360'}</span>}
      </div>

      <div className="ref-table nak-table">
        <div className="ref-tr ref-th">
          <span>#</span>
          <span>{lang === 'ta' ? 'நட்சத்திரம்' : 'Nakshatra'}</span>
          <span>{lang === 'ta' ? 'பாகை வீச்சு' : 'Zodiac Span'}</span>
          <span>{lang === 'ta' ? 'நட்சத்திர அதிபதி' : 'Star Lord'}</span>
          <span>{lang === 'ta' ? 'தசா ஆண்டுகள்' : 'Dasa Years'}</span>
        </div>
        {shown.map((n) => (
          <div key={n.index} className={`ref-tr${lookup && lookup.nak.index === n.index ? ' hit' : ''}`}>
            <span className="num">{n.index + 1}</span>
            <span className="ref-rasi-name">{pick({ ta: n.ta, en: n.en }, lang)}</span>
            <span className="num">{fmtSpan(n.startDeg, n.endDeg)}</span>
            <span>{pick(PLANET_NAMES[n.lord], lang)}</span>
            <span className="num">{DASA_YEARS[n.lord]}y</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Section 3: 12 Bhavas Directory ----------
function BhavaDirectory() {
  const lang = useLang();
  const [q, setQ] = useState('');
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return BHAVA_REF;
    return BHAVA_REF.filter((b) =>
      [b.ta, b.en, b.sanskrit,
        ...b.categories.map((c) => `${c.ta} ${c.en}`),
        ...b.significations.map((x) => `${x.ta} ${x.en}`),
      ].join(' ').toLowerCase().includes(s),
    );
  }, [q]);

  return (
    <div className="panel">
      <div className="panel-title">
        <span>{lang === 'ta' ? '3. 12 பாவங்களின் பொறுப்புகள் (காரகத்துவம்)' : '3. 12 Bhavas — Houses & Responsibilities Directory'}</span>
        <span className="meta">{shown.length} / 12</span>
      </div>
      <input
        placeholder={lang === 'ta' ? 'வாழ்க்கை தலைப்பு தேடுக — எ.கா. விவசாயம், திருமணம், cattle, career…' : 'Search a life topic — e.g. cattle, விவசாயம், career, marriage…'}
        value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 560, marginBottom: 16 }}
      />
      <div className="bhava-grid">
        {shown.map((b) => (
          <div key={b.house} className="bhava-card">
            <div className="bc-head">
              <span className="bc-house num">{b.house}</span>
              <span className="bc-name">{b.house}-ஆம் வீடு — {pick({ ta: b.ta, en: b.en }, lang)}</span>
            </div>
            <div className="bc-sanskrit">({b.sanskrit})</div>
            <div className="bc-cats">
              {b.categories.map((c, i) => <span key={i} className="bc-cat">{pick(c, lang)}</span>)}
            </div>
            <ul className="bc-sig">
              {b.significations.map((s, i) => <li key={i}>{pick(s, lang)}</li>)}
            </ul>
          </div>
        ))}
        {shown.length === 0 && <div className="ref-note">{lang === 'ta' ? 'பொருந்தும் பாவம் இல்லை.' : 'No matching bhava.'}</div>}
      </div>
    </div>
  );
}

export default function ReferenceGuide() {
  return (
    <div className="stack">
      <RasiDignityExplorer />
      <NakshatraMatrix />
      <BhavaDirectory />
    </div>
  );
}
