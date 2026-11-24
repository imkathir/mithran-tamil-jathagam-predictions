import type { Dossier } from '../engine';
import { useLang, useT, pick } from '../i18n';

function SignMark({ sign }: { sign: 1 | 0 | -1 }) {
  return (
    <span className={`ledger-sign ${sign === 1 ? 'nature-benefic' : sign === -1 ? 'nature-malefic' : 'nature-neutral'}`}>
      {sign === 1 ? '+' : sign === -1 ? '−' : '·'}
    </span>
  );
}

export default function Predictions({ d }: { d: Dossier }) {
  const lang = useLang();
  const t = useT();
  return (
    <div className="panel">
      <div className="panel-title">
        <span>{t('predictionsTitle')}</span>
        <span className="meta">5 domains · classical rules · {d.activeDasa ? `${d.activeDasa.mahadasa}–${d.activeDasa.bhukti}–${d.activeDasa.antara}` : ''}</span>
      </div>
      {d.predictions.map((p) => (
        <div key={p.key} className="pred-block">
          <div className="pred-head">
            <span className="t">{pick(p.title, lang)}</span>
            <span className="r">{t('rating')} {p.rating}/100</span>
          </div>
          <div className="bar-track" style={{ maxWidth: 320, marginBottom: 12 }}>
            <div
              className="bar-fill"
              style={{
                width: `${p.rating}%`,
                background: p.rating >= 70 ? 'var(--benefic)' : p.rating >= 50 ? 'var(--neutral)' : 'var(--malefic)',
              }}
            />
          </div>
          <div className="pred-body">{pick(p.body, lang)}</div>

          <div className="ledger">
            <div className="ledger-title">{t('ledgerTitle')}</div>
            {p.ledger.map((row, i) => (
              <div key={i} className="ledger-row">
                <SignMark sign={row.sign} />
                <span className="ledger-label">{pick(row.label, lang)}</span>
                <span className="ledger-value">{pick(row.value, lang)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
