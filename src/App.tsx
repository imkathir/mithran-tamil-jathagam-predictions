import { useEffect, useMemo, useRef, useState } from 'react';
import { computeDossier, type BirthProfile, type Dossier, type PanchangamMode } from './engine';
import { LangCtx, STRINGS, useT, pick, profileName, DEFAULT_PROFILE_NAME, type Lang } from './i18n';
import ChartPair from './components/ChartPair';
import GrahaInspector from './components/GrahaInspector';
import StrengthPanel from './components/StrengthPanel';
import DasaSection from './components/DasaSection';
import Predictions from './components/Predictions';
import LifeTimeline from './components/LifeTimeline';
import Porutham from './components/Porutham';
import ReferenceGuide from './components/ReferenceGuide';
import PdfDossier, { type PdfPoruthamData } from './components/PdfDossier';
import { samplePorutham } from './components/Porutham';
import { buildTimeline } from './timeline';
import { GAZETTEER } from './gazetteer';

const today = () => new Date().toISOString().slice(0, 10);

type SectionKey = 'chart' | 'strength' | 'dasa' | 'timeline' | 'porutham' | 'reference' | 'predict';
const NAV_ITEMS = [
  ['chart', 'navChart'], ['strength', 'navStrength'], ['dasa', 'navDasa'],
  ['timeline', 'navTimeline'], ['porutham', 'navPorutham'], ['reference', 'navReference'], ['predict', 'navPredict'],
] as const satisfies readonly (readonly [SectionKey, 'navChart' | 'navStrength' | 'navDasa' | 'navTimeline' | 'navPorutham' | 'navReference' | 'navPredict'])[];

const INITIAL: BirthProfile & { transitDate: string } = {
  name: DEFAULT_PROFILE_NAME,
  date: '2025-07-09',
  time: '17:25',
  placeName: 'Udumalpet, Tamil Nadu',
  latitude: 10.5881,
  longitude: 77.2478,
  timezoneOffsetMinutes: 330,
  panchangamMode: 'THIRUKANITHAM',
  transitDate: today(),
};

function Rail({ form, setForm, onCalc, onReset, lang }: {
  form: BirthProfile & { transitDate: string };
  setForm: (f: BirthProfile & { transitDate: string }) => void;
  onCalc: () => void; onReset: () => void; lang: Lang;
}) {
  const t = useT();
  return (
    <div className="rail">
      <div className="field">
        <label>{t('name')}</label>
        <input value={profileName(form.name, lang)} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <div className="row2" style={{ marginTop: 10 }}>
          <div className="field">
            <label>{t('dob')}</label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div className="field">
            <label>{t('tob')}</label>
            <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="field">
        <label>{t('place')}</label>
        <select
          value={GAZETTEER.some((g) => g.name === form.placeName) ? form.placeName : '__custom'}
          onChange={(e) => {
            const g = GAZETTEER.find((x) => x.name === e.target.value);
            if (g) setForm({ ...form, placeName: g.name, latitude: g.lat, longitude: g.lon, timezoneOffsetMinutes: g.tz });
            else setForm({ ...form, placeName: '' });
          }}
        >
          {GAZETTEER.map((g) => <option key={g.name} value={g.name}>{lang === 'ta' ? g.ta : g.name}</option>)}
          <option value="__custom">{lang === 'ta' ? 'வேறு இடம் (கைமுறை)' : 'Other place (manual)'}</option>
        </select>
        <div className="row3" style={{ marginTop: 10 }}>
          <div className="field">
            <label>{t('latitude')}</label>
            <input type="number" step="0.0001" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: Number(e.target.value) })} />
          </div>
          <div className="field">
            <label>{t('longitude')}</label>
            <input type="number" step="0.0001" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: Number(e.target.value) })} />
          </div>
          <div className="field">
            <label>{t('timezone')}</label>
            <input type="number" step="15" value={form.timezoneOffsetMinutes} onChange={(e) => setForm({ ...form, timezoneOffsetMinutes: Number(e.target.value) })} />
          </div>
        </div>
      </div>

      <div className="field">
        <label>{t('mode')}</label>
        <div className="mode-switch">
          {(['THIRUKANITHAM', 'VAKYA'] as PanchangamMode[]).map((m) => (
            <button key={m} className={form.panchangamMode === m ? 'active' : ''} onClick={() => setForm({ ...form, panchangamMode: m })}>
              {m === 'THIRUKANITHAM' ? t('thirukanitham') : t('vakya')}
            </button>
          ))}
        </div>
        <div className="field" style={{ marginTop: 10 }}>
          <label>{t('transitDate')}</label>
          <input type="date" value={form.transitDate} onChange={(e) => setForm({ ...form, transitDate: e.target.value })} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'stretch' }}>
        <button className="btn-primary" onClick={onCalc}>{t('calculate')}</button>
        <button className="btn-ghost" onClick={onReset}>{t('reset')}</button>
      </div>
    </div>
  );
}

function Shell() {
  const [lang, setLang] = useState<Lang>('ta');
  const [form, setForm] = useState(INITIAL);
  const [section, setSection] = useState<SectionKey>('chart');
  const navRef = useRef<HTMLElement>(null);
  // pre-loaded sample chart on mount (lazy initial state, single-session)
  const [dossier, setDossier] = useState<Dossier | null>(() => computeDossier(INITIAL, INITIAL.transitDate));
  const [selId, setSelId] = useState<string>('Sun');
  const [ms, setMs] = useState(0);

  const calc = (f: BirthProfile & { transitDate: string }) => {
    const t0 = performance.now();
    const d = computeDossier({ name: f.name, date: f.date, time: f.time, placeName: f.placeName, latitude: f.latitude, longitude: f.longitude, timezoneOffsetMinutes: f.timezoneOffsetMinutes, panchangamMode: f.panchangamMode }, f.transitDate);
    setMs(performance.now() - t0);
    setDossier(d);
  };

  // Keep the active section tab in view inside the (scrollable) nav strip.
  useEffect(() => {
    const el = navRef.current?.querySelector('button.active') as HTMLElement | null;
    el?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [section]);

  const [poruthamData, setPoruthamData] = useState<PdfPoruthamData | null>(() => samplePorutham());
  const timelineRows = useMemo(() => (dossier ? buildTimeline(dossier, new Date()) : []), [dossier]);
  const langStr = STRINGS;
  return (
    <LangCtx.Provider value={lang}>
      <div className={`shell lang-${lang}`} lang={lang}>
        <div className="topbar">
          <div className="topbar-row">
            <div className="wordmark">
              <span className="mark">{pick(langStr.wordmark, lang)}</span>
              <span className="sub">{pick(langStr.wordmarkSub, lang)}</span>
            </div>
            <div className="topbar-actions">
              <div className="langtoggle">
                <button className={lang === 'ta' ? 'active' : ''} onClick={() => setLang('ta')}>தமிழ்</button>
                <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>English</button>
              </div>
              {dossier && <PdfDossier d={dossier} rows={timelineRows} porutham={poruthamData} uiLang={lang} />}
            </div>
          </div>
          <nav className="topnav" ref={navRef} aria-label={lang === 'ta' ? 'பிரிவுகள்' : 'Sections'}>
            {NAV_ITEMS.map(([k, s]) => (
              <button
                key={k}
                className={section === k ? 'active' : ''}
                aria-current={section === k ? 'page' : undefined}
                onClick={() => setSection(k)}
              >
                {pick(langStr[s], lang)}
              </button>
            ))}
          </nav>
        </div>

        <Rail form={form} setForm={setForm} onCalc={() => calc(form)} onReset={() => { setForm(INITIAL); calc(INITIAL); }} lang={lang} />

        {dossier && (
          <main>
            {section === 'chart' && (
              <section className="section">
                <div className="section-head">
                  <h2>{pick(langStr.navChart, lang)}</h2>
                  <span className="ref">D1 · D9 · {dossier.profile.placeName}</span>
                </div>
                <ChartPair d={dossier} selId={selId} onSel={setSelId} />
                <div style={{ height: 28 }} />
                <GrahaInspector d={dossier} selId={selId} onSel={setSelId} />
              </section>
            )}
            {section === 'strength' && (
              <section className="section">
                <div className="section-head">
                  <h2>{pick(langStr.navStrength, lang)}</h2>
                  <span className="ref">SAV 337 · BAV · Yogas</span>
                </div>
                <StrengthPanel d={dossier} />
              </section>
            )}
            {section === 'dasa' && (
              <section className="section">
                <div className="section-head">
                  <h2>{pick(langStr.navDasa, lang)}</h2>
                  <span className="ref">36 months · Vimshottari + Gochara</span>
                </div>
                <DasaSection d={dossier} onGoTimeline={() => setSection('timeline')} />
              </section>
            )}
            {section === 'timeline' && (
              <section className="section">
                <div className="section-head">
                  <h2>{pick(langStr.navTimeline, lang)}</h2>
                  <span className="ref">0–70 yrs · Vimshottari</span>
                </div>
                <LifeTimeline d={dossier} />
              </section>
            )}
            {section === 'porutham' && (
              <section className="section">
                <div className="section-head">
                  <h2>{pick(langStr.navPorutham, lang)}</h2>
                  <span className="ref">10 poruthams · Kuja · Sarpa · 20-yr Dasa impact</span>
                </div>
                <Porutham onResult={setPoruthamData} />
              </section>
            )}
            {section === 'reference' && (
              <section className="section">
                <div className="section-head">
                  <h2>{pick(langStr.navReference, lang)}</h2>
                  <span className="ref">Rasi · 27 Nakshatras · 12 Bhavas</span>
                </div>
                <ReferenceGuide />
              </section>
            )}
            {section === 'predict' && (
              <section className="section">
                <div className="section-head">
                  <h2>{pick(langStr.navPredict, lang)}</h2>
                  <span className="ref">5 domains · deterministic</span>
                </div>
                <Predictions d={dossier} />
              </section>
            )}
          </main>
        )}

        <div className="footnote">
          <span>{pick(langStr.footer1, lang)}</span>
          <span>{pick(langStr.footer2, lang)} · {pick(langStr.calcTime, lang)}: <span className="num">{ms.toFixed(1)}ms</span></span>
        </div>
      </div>
    </LangCtx.Provider>
  );
}

export default function App() {
  return <Shell />;
}
