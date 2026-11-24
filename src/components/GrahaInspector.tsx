import type { Dossier } from '../engine';
import { RASI, NAKSHATRA, GRAHA_INFO } from '../engine';
import { useLang, useT, GRAHA_ABBR, pick, ordinal } from '../i18n';

export default function GrahaInspector({ d, selId, onSel }: { d: Dossier; selId: string | null; onSel: (id: string) => void }) {
  const lang = useLang();
  const t = useT();
  const g = d.grahas.find((x) => x.id === selId) ?? d.grahas[0];

  const givenSummary = (id: string) => {
    const gr = d.grahas.find((x) => x.id === id)!;
    return gr.aspectDetails.map((a) => `${a.num}${a.traditional ? '*' : ''}`).join(',') + ` → ${gr.aspectDetails.map((a) => a.targetHouse).join(',')}`;
  };
  const receivedSummary = (id: string) => {
    const gr = d.grahas.find((x) => x.id === id)!;
    return gr.aspectsReceived.map((a) => `${pick(GRAHA_ABBR[a.from], lang)}(${a.num}${a.traditional ? '*' : ''})`).join(', ') || '—';
  };

  return (
    <div className="grid-58">
      <div className="panel">
        <div className="panel-title">
          <span>{t('grahaPositions')}</span>
          <span className="meta">D1 · sidereal · * = {lang === 'ta' ? 'மரபு' : 'traditional'}</span>
        </div>
        <div className="graha-list graha-list-wide">
          <div className="graha-row graha-row-head" style={{ cursor: 'default' }}>
            <span />
            <span>{lang === 'ta' ? 'கிரகம்' : 'Graha'}</span>
            <span>{lang === 'ta' ? 'ராசி / நட்சத்திரம்' : 'Rasi / Nakshatra'}</span>
            <span>{lang === 'ta' ? 'பார்வை (கொடுப்பது)' : 'Paarvai Given'}</span>
            <span>{lang === 'ta' ? 'பார்வை (பெறுவது)' : 'Paarvai Received'}</span>
            <span>{lang === 'ta' ? 'வலு' : 'Str'}</span>
          </div>
          {d.grahas.map((gr) => (
            <div key={gr.id} className={`graha-row${gr.id === g.id ? ' selected' : ''}`} onClick={() => onSel(gr.id)}>
              <span className="sym">{pick(GRAHA_ABBR[gr.id], lang)}</span>
              <span className="name">
                {pick(GRAHA_INFO[gr.id], lang)}
                {gr.retro && gr.id !== 'Rahu' && gr.id !== 'Ketu' && <span className="mini"> ({lang === 'ta' ? 'வ' : 'R'})</span>}
                {gr.combust && <span className="mini"> ({lang === 'ta' ? 'அஸ்' : 'C'})</span>}
                <span className="mini" style={{ display: 'block' }}>{pick(gr.dignity, lang)}</span>
              </span>
              <span className="mono" style={{ fontSize: 10.5 }}>
                {pick(RASI[gr.rasi], lang).split(' ')[0]} {gr.deg.toFixed(1)}°
                <span style={{ display: 'block', color: 'var(--faint)' }}>{pick(NAKSHATRA[gr.nakIdx], lang)} {gr.pada}</span>
              </span>
              <span className="mono" style={{ fontSize: 10 }} title={gr.aspectDetails.map((a) => `${ordinal(a.num, lang)} → ${pick(RASI[a.targetRasi], lang)}`).join(', ')}>
                {givenSummary(gr.id)}
              </span>
              <span className="mono" style={{ fontSize: 10 }}>{receivedSummary(gr.id)}</span>
              <span className="mono">{gr.strength}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">
          <span>{t('paarvaiMatrix')}</span>
          <span className="meta">{pick(GRAHA_INFO[g.id], lang)}</span>
        </div>

        <div className="paarvai-matrix">
          <div className="pm-col">
            <h4>{t('paarvaiGiven')}</h4>
            {g.aspectDetails.map((a, i) => (
              <div key={i} className="pm-row">
                <span className="pm-what">
                  {pick(GRAHA_ABBR[g.id], lang)} {ordinal(a.num, lang)}{lang === 'ta' ? ' பார்வை' : ' Aspect'}{a.traditional ? (lang === 'ta' ? ' (மரபு)' : ' (trad)') : ''}
                </span>
                <span className="pm-where">
                  {lang === 'ta' ? 'வீடு' : 'House'} {a.targetHouse} · {pick(RASI[a.targetRasi], lang)}
                </span>
                <span className="pm-who">{a.grahasInTarget.length ? a.grahasInTarget.map((id) => pick(GRAHA_INFO[id], lang)).join(', ') : (lang === 'ta' ? 'கிரகம் இல்லை' : 'No graha')}</span>
              </div>
            ))}
          </div>
          <div className="pm-col">
            <h4>{t('paarvaiReceived')}</h4>
            {g.aspectsReceived.length === 0 && <div className="pm-row"><span className="pm-who">—</span></div>}
            {g.aspectsReceived.map((a, i) => (
              <div key={i} className="pm-row">
                <span className="pm-what">
                  {pick(GRAHA_INFO[a.from], lang)} {ordinal(a.num, lang)}{lang === 'ta' ? ' பார்வை' : ' Aspect'}{a.traditional ? (lang === 'ta' ? ' (மரபு)' : ' (trad)') : ''}
                </span>
                <span className="pm-where">
                  {lang === 'ta' ? 'இலக்கு' : 'Target'}: {pick(RASI[g.rasi], lang)} ({lang === 'ta' ? 'வீடு' : 'House'} {g.house})
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel-title" style={{ marginTop: 14 }}>
          <span>{t('fortyFactors')}</span>
          <span className="meta">{pick(GRAHA_INFO[g.id], lang)}</span>
        </div>
        <table className="factor-table">
          <tbody>
            {g.factors.map((f) => (
              <tr key={f.n}>
                <td className="n">{f.n}</td>
                <td className="label">{pick(f.label, lang)}</td>
                <td className="value">{pick(f.value, lang)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
