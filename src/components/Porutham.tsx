import { useEffect, useMemo, useState } from 'react';
import { computeDossier, type BirthProfile, type Dossier, type PanchangamMode, RASI, NAKSHATRA } from '../engine';
import type { PoruthamRow, SandhiWindow } from '../porutham';
import { computePorutham } from '../porutham';
import type { PdfPoruthamData } from './PdfDossier';
import { GAZETTEER } from '../gazetteer';
import { useLang, useT, pick } from '../i18n';
import { SIChart } from './ChartPair';
import type { GrahaEval } from '../engine';

const todayISO = () => new Date().toISOString().slice(0, 10);

interface PForm extends BirthProfile {}

const BRIDE_INIT: PForm = {
  name: 'Anitha', date: '2007-08-22', time: '11:06', placeName: 'Udumalpet, Tamil Nadu',
  latitude: 10.5881, longitude: 77.2478, timezoneOffsetMinutes: 330, panchangamMode: 'THIRUKANITHAM',
};
const GROOM_INIT: PForm = {
  name: 'Karthik', date: '2005-01-19', time: '06:45', placeName: 'Coimbatore, Tamil Nadu',
  latitude: 11.0168, longitude: 76.9558, timezoneOffsetMinutes: 330, panchangamMode: 'THIRUKANITHAM',
};

function CompactForm({ label, form, setForm }: { label: string; form: PForm; setForm: (f: PForm) => void }) {
  const lang = useLang();
  const t = useT();
  return (
    <div className="panel soft porutham-form">
      <div className="panel-title"><span>{label}</span></div>
      <div className="pf-grid">
        <div className="field">
          <label>{t('name')}</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="field">
          <label>{t('dob')}</label>
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </div>
        <div className="field">
          <label>{t('tob')}</label>
          <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
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
            <option value="__custom">{lang === 'ta' ? 'வேறு இடம்' : 'Other place'}</option>
          </select>
        </div>
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
        <div className="field">
          <label>{t('mode')}</label>
          <div className="mode-switch">
            {(['THIRUKANITHAM', 'VAKYA'] as PanchangamMode[]).map((m) => (
              <button key={m} className={form.panchangamMode === m ? 'active' : ''} onClick={() => setForm({ ...form, panchangamMode: m })}>
                {m === 'THIRUKANITHAM' ? t('thirukanitham') : t('vakya')}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function badgesFor(d: Dossier): Record<number, { from: string; num: number; traditional?: boolean }[]> {
  const badges: Record<number, { from: string; num: number; traditional?: boolean }[]> = {};
  d.grahas.forEach((g) => g.aspectDetails.forEach((a) => {
    (badges[a.targetRasi] ??= []).push({ from: g.id, num: a.num, traditional: a.traditional });
  }));
  return badges;
}

function ChartColumn({ title, d }: { title: string; d: Dossier }) {
  const lang = useLang();
  const t = useT();
  const grahaMap = Object.fromEntries(d.grahas.map((g) => [g.id, g])) as Record<string, GrahaEval>;
  const badges = badgesFor(d);
  const moon = grahaMap.Moon;
  return (
    <div>
      <SIChart
        grid={d.rasiGrid} grahaMap={grahaMap}
        title={`${title} — ${t('rasiChart')}`}
        meta={`${t('lagna')}: ${pick(RASI[d.lagnaRasi], lang)} ${(d.lagnaLon % 30).toFixed(1)}° · ${t('janmaNak')}: ${pick(NAKSHATRA[moon.nakIdx], lang)} ${moon.pada}`}
        centerTop={title}
        centerLines={[`${d.profile.name} · ${d.profile.date} ${d.profile.time}`, `${pick(RASI[moon.rasi], lang)} · ${pick(NAKSHATRA[moon.nakIdx], lang)} ${moon.pada}`]}
        markRasi={d.lagnaRasi} badges={badges} tooltips={{}}
      />
      <div style={{ height: 18 }} />
      <SIChart
        grid={d.navamsaGrid} grahaMap={grahaMap}
        title={`${title} — ${t('navamsaChart')}`}
        meta="D9"
        centerTop="D9"
        centerLines={[`${t('janmaNak')}: ${pick(NAKSHATRA[moon.nakIdx], lang)}`]}
        markRasi={null} badges={{}} tooltips={{}}
      />
    </div>
  );
}

function ModuleRows({ rows }: { rows: PoruthamRow[] }) {
  const lang = useLang();
  return (
    <div>
      {rows.map((r) => (
        <div key={r.key} className="porutham-row">
          <span className="pr-name">{pick(r.name, lang)}</span>
          <span className={`pr-status ${r.points / r.max >= 0.8 ? 'nature-benefic' : r.points / r.max >= 0.45 ? 'nature-neutral' : 'nature-malefic'}`}>{pick(r.status, lang)}</span>
          <span className="pr-pts num">{r.points}/{r.max}</span>
          <span className="pr-detail">{pick(r.detail, lang)}</span>
        </div>
      ))}
    </div>
  );
}

function WindowList({ windows }: { windows: SandhiWindow[] }) {
  const lang = useLang();
  if (!windows.length) return <div className="pr-detail">{lang === 'ta' ? 'குறிப்பிடத்தக்க சந்திப்புகள் இல்லை.' : 'No notable windows.'}</div>;
  return (
    <div>
      {windows.map((w, i) => (
        <div key={i} className="porutham-row">
          <span className="pr-name num">{w.date}</span>
          <span className={`pr-status ${w.kind === 'protective' ? 'nature-benefic' : w.kind === 'sandhi' ? 'nature-neutral' : 'nature-malefic'}`}>
            {w.kind === 'sandhi' ? (lang === 'ta' ? 'தசா சந்திப்பு' : 'Dasa Sandhi') : w.kind === 'protective' ? (lang === 'ta' ? 'பாதுகாப்பு' : 'Protective') : (lang === 'ta' ? 'ஒரே தசா' : 'Same Dasa')}
          </span>
          <span className="pr-detail" style={{ gridColumn: '3 / -1' }}>{pick(w.detail, lang)}</span>
        </div>
      ))}
    </div>
  );
}

export function samplePorutham(): PdfPoruthamData {
  const b = computeDossier(BRIDE_INIT, todayISO());
  const g = computeDossier(GROOM_INIT, todayISO());
  return { bride: BRIDE_INIT.name, groom: GROOM_INIT.name, result: computePorutham(b, g, new Date()) };
}

export default function Porutham({ onResult }: { onResult?: (d: PdfPoruthamData) => void }) {
  const lang = useLang();
  const t = useT();
  const [brideForm, setBrideForm] = useState<PForm>(BRIDE_INIT);
  const [groomForm, setGroomForm] = useState<PForm>(GROOM_INIT);

  const { bride, groom, result } = useMemo(() => {
    const b = computeDossier(brideForm, todayISO());
    const g = computeDossier(groomForm, todayISO());
    return { bride: b, groom: g, result: computePorutham(b, g, new Date()) };
  }, [brideForm, groomForm]);

  useEffect(() => {
    onResult?.({ bride: brideForm.name, groom: groomForm.name, result });
  }, [result, brideForm.name, groomForm.name, onResult]);

  const F = result.moduleF;
  return (
    <div className="stack">
      <div className="panel">
        <div className="panel-title">
          <span>{t('poruthamTitle')}</span>
          <span className="meta">{lang === 'ta' ? 'தசப் பொருத்தம் + தோஷ ஆய்வு + தசா ஒப்பீடு' : 'Dasa Porutham + Dosha study + Dasa comparison'}</span>
        </div>
        <div className="porutham-forms">
          <CompactForm label={t('brideLabel')} form={brideForm} setForm={setBrideForm} />
          <CompactForm label={t('groomLabel')} form={groomForm} setForm={setGroomForm} />
        </div>
        <div className="porutham-charts">
          <ChartColumn title={t('brideLabel')} d={bride} />
          <ChartColumn title={t('groomLabel')} d={groom} />
        </div>
      </div>

      <div className="panel">
        <div className="score-hero">
          <div>
            <div className="sh-label">{t('totalScore')}</div>
            <div className={`sh-verdict ${F.verdictKey === 'high' ? 'nature-benefic' : F.verdictKey === 'balance' ? 'nature-neutral' : 'nature-malefic'}`}>
              {pick(F.verdict, lang)}
            </div>
          </div>
          <div className="sh-score num">{F.total}<span>/100</span></div>
        </div>
        <div className="bar-track" style={{ height: 6 }}>
          <div className="bar-fill" style={{ width: `${F.total}%`, background: F.total >= 70 ? 'var(--benefic)' : F.total >= 50 ? 'var(--neutral)' : 'var(--malefic)' }} />
        </div>
      </div>

      <div className="panel">
        <h3>{lang === 'ta' ? 'அ. தசப் பொருத்தங்கள் (10 பொருத்தம்)' : 'A. 10 Nakshatra Poruthams'}</h3>
        <div className="panel-title" style={{ marginTop: 6 }}>
          <span className="meta">{lang === 'ta' ? `பெண் ${NAKSHATRA[bride.grahas.find((g) => g.id === 'Moon')!.nakIdx].ta} → ஆண் ${NAKSHATRA[groom.grahas.find((g) => g.id === 'Moon')!.nakIdx].ta}` : `Bride ${NAKSHATRA[bride.grahas.find((g) => g.id === 'Moon')!.nakIdx].en} → Groom ${NAKSHATRA[groom.grahas.find((g) => g.id === 'Moon')!.nakIdx].en}`}</span>
          <span className="meta num">{result.moduleA.score}/100</span>
        </div>
        <ModuleRows rows={result.moduleA.rows} />
      </div>

      <div className="grid2">
        <div className="panel">
          <h3>{lang === 'ta' ? 'ஆ. செவ்வாய் தோஷம் & பரிகாரம்' : 'B. Kuja Dosha & Exceptions'}</h3>
          {([['bride', t('brideLabel'), result.moduleB.bride], ['groom', t('groomLabel'), result.moduleB.groom]] as const).map(([k, label, info]) => (
            <div key={k} className="porutham-row" style={{ gridTemplateColumns: '90px 1fr' }}>
              <span className="pr-name">{label}</span>
              <span className="pr-detail">
                {info.hasDosha
                  ? (lang === 'ta' ? `தோஷம் உள்ளது (${info.positions.map((p) => `${p.from} ${p.house}`).join(', ')})` : `Dosha present (${info.positions.map((p) => `${p.from} ${p.house}`).join(', ')})`)
                  : (lang === 'ta' ? 'செவ்வாய் தோஷம் இல்லை' : 'No Kuja Dosha')}
                {info.exceptions.length > 0 && <span className="nature-benefic"> · {lang === 'ta' ? 'பரிகாரம்: ' : 'Exceptions: '}{info.exceptions.map((e) => pick(e, lang)).join('; ')}</span>}
              </span>
            </div>
          ))}
          <div className="flag-row">
            <span className="fn">{lang === 'ta' ? 'தோஷ சமநிலை முடிவு' : 'Dosha Balance Verdict'}</span>
            <span className={`fd nature-${result.moduleB.verdictKey === 'balanced' ? 'benefic' : result.moduleB.verdictKey === 'cancelled' ? 'neutral' : 'malefic'}`}>{pick(result.moduleB.verdict, lang)}</span>
          </div>
        </div>

        <div className="panel">
          <h3>{lang === 'ta' ? 'இ. ராகு-கேது (சர்ப்ப தோஷம்)' : 'C. Rahu-Ketu (Sarpa Dosha)'}</h3>
          <div className="porutham-row" style={{ gridTemplateColumns: '90px 1fr' }}>
            <span className="pr-name">{t('brideLabel')}</span>
            <span className="pr-detail">{pick(result.moduleC.brideSarpa, lang)}</span>
          </div>
          <div className="porutham-row" style={{ gridTemplateColumns: '90px 1fr' }}>
            <span className="pr-name">{t('groomLabel')}</span>
            <span className="pr-detail">{pick(result.moduleC.groomSarpa, lang)}</span>
          </div>
          <div className="flag-row">
            <span className="fn">{lang === 'ta' ? 'முடிவு' : 'Verdict'}</span>
            <span className={`fd ${result.moduleC.score >= 65 ? 'nature-benefic' : result.moduleC.score >= 45 ? 'nature-neutral' : 'nature-malefic'}`}>{pick(result.moduleC.verdict, lang)}</span>
          </div>
        </div>
      </div>

      <div className="panel">
        <h3>{lang === 'ta' ? 'ஈ. தசா சந்திப்பு & தசாபுத்தி ஒப்பீடு (அடுத்த 25 ஆண்டுகள்)' : 'D. Dasa Sandhi & Dasa-Bhukti Comparison (next 25 years)'}</h3>
        <div className="panel-title" style={{ marginTop: 6 }}>
          <span className="meta">{pick(result.moduleD.summary, lang)}</span>
          <span className="meta num">{result.moduleD.score}/100</span>
        </div>
        <WindowList windows={result.moduleD.windows} />
      </div>

      <div className="panel">
        <h3>{lang === 'ta' ? 'உ. பாவ & கிரக ஒப்பீடு (7, 2, 5 & D9)' : 'E. Bhava & Graha Cross-Chart (7th, 2nd, 5th & D9)'}</h3>
        <div className="panel-title" style={{ marginTop: 6 }}>
          <span className="meta" />
          <span className="meta num">{result.moduleE.score}/100</span>
        </div>
        <ModuleRows rows={result.moduleE.rows} />
      </div>

      <div className="panel">
        <h3>{lang === 'ta' ? 'எ. இறுதிப் பொருத்த முடிவு' : 'F. Final Classical Verdict'}</h3>
        <div className="pred-body" style={{ marginTop: 8 }}>{pick(F.outlook, lang)}</div>
        <div className="grid2" style={{ marginTop: 14 }}>
          <div>
            <h4 className="pm-col-title nature-benefic">{lang === 'ta' ? 'வலிமைகள்' : 'Strengths'}</h4>
            {F.strengths.slice(0, 6).map((s, i) => <div key={i} className="pr-detail" style={{ padding: '5px 0', borderBottom: '1px solid var(--border)' }}>{pick(s, lang)}</div>)}
          </div>
          <div>
            <h4 className="pm-col-title nature-malefic">{lang === 'ta' ? 'எச்சரிக்கைகள்' : 'Cautions'}</h4>
            {F.cautions.length === 0 && <div className="pr-detail">—</div>}
            {F.cautions.slice(0, 6).map((s, i) => <div key={i} className="pr-detail" style={{ padding: '5px 0', borderBottom: '1px solid var(--border)' }}>{pick(s, lang)}</div>)}
          </div>
        </div>
      </div>
    </div>
  );
}
