import type { Dossier } from '../engine';
import { GRAHA_INFO, RASI } from '../engine';
import { useLang, useT, GRAHA_ABBR, pick } from '../i18n';

function strengthColor(s: number) {
  if (s >= 70) return 'var(--benefic)';
  if (s >= 50) return 'var(--neutral)';
  return 'var(--malefic)';
}

export default function StrengthPanel({ d }: { d: Dossier }) {
  const lang = useLang();
  const t = useT();

  return (
    <div className="stack">
      <div className="grid2">
        <div className="panel">
          <h3>{t('strengthBars')}</h3>
          {d.grahas.map((g) => (
            <div key={g.id} className="bar-row">
              <span className="lbl">{pick(GRAHA_INFO[g.id], lang)}</span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${g.strength}%`, background: strengthColor(g.strength) }} />
              </div>
              <span className="val">{g.strength}/100</span>
            </div>
          ))}
        </div>

        <div className="panel">
          <h3>{t('bhavaBala')}</h3>
          {d.bhavaBala.map((b) => (
            <div key={b.house} className="bar-row">
              <span className="lbl">{t('house')} {b.house} · {pick(RASI[b.rasi], lang)}</span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${b.score}%`, background: strengthColor(b.score) }} />
              </div>
              <span className="val">{b.score}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">
          <span>{t('savTitle')}</span>
          <span className="meta">{t('savSub')} · Σ {d.sav.reduce((a, b) => a + b, 0)}</span>
        </div>
        <div className="sav-strip">
          {d.sav.map((v, i) => (
            <div key={i} className="sav-cell">
              <div className="h">H{i + 1}</div>
              <div className="v" style={{ color: v >= 28 ? 'var(--foreground)' : 'var(--muted)' }}>{v}</div>
              <div className="r">{pick(RASI[((d.lagnaRasi + i) % 12)], lang).split(' ')[0]}</div>
            </div>
          ))}
        </div>
        <div className="sav-strip" style={{ marginTop: 14 }}>
          {Object.entries(d.bav).map(([pid, arr]) => (
            <div key={pid} className="sav-cell" style={{ gridColumn: 'span 2' }}>
              <div className="h">{pick(GRAHA_ABBR[pid], lang)}</div>
              <div className="v" style={{ fontSize: 12 }}>{arr.reduce((a, b) => a + b, 0)}</div>
              <div className="r">{lang === 'ta' ? 'பின்னம்' : 'BAV'}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h3>{t('yogasTitle')}</h3>
        {d.yogas.map((y, i) => (
          <div key={i} className="yoga-row">
            <div>
              <div className="yn">{pick(y.name, lang)}</div>
              <div className="yg">{y.grahas.map((id) => pick(GRAHA_INFO[id], lang)).join(' + ') || '—'}</div>
            </div>
            <div className="ye">{pick(y.effect, lang)}</div>
            <div className={`ytag nature-${y.nature}`}>
              {y.nature === 'benefic' ? (lang === 'ta' ? 'சுப' : 'Benefic') : y.nature === 'malefic' ? (lang === 'ta' ? 'பாவ' : 'Malefic') : (lang === 'ta' ? 'நடுநிலை' : 'Neutral')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
