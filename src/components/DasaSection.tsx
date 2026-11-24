import { useMemo, useState } from 'react';
import type { Dossier } from '../engine';
import { GRAHA_INFO, RASI, fmtDate } from '../engine';
import { useLang, useT, GRAHA_ABBR, pick } from '../i18n';
import { buildDasa36, BAND_LABEL, type MonthEntry, type Band } from '../dasa36';

type Filter = 'all' | 'y1' | 'y2' | 'y3' | 'high';

const BAND_COLOR: Record<Band, string> = {
  peak: '#15803D', progress: '#111827', steady: '#52525B', caution: '#B91C1C',
};

function ScoreBadge({ net, band }: { net: number; band: Band }) {
  return (
    <span className="m36-badge" style={{ borderColor: BAND_COLOR[band], color: BAND_COLOR[band] }}>
      <span className="num">{net}</span>
      <span className="m36-badge-tag">{band === 'peak' ? 'யோகம்' : band === 'progress' ? 'லாபம்' : band === 'steady' ? 'சமநிலை' : 'கவனம்'}</span>
    </span>
  );
}

export default function DasaSection({ d, onGoTimeline }: { d: Dossier; onGoTimeline?: () => void }) {
  const lang = useLang();
  const t = useT();
  const [filter, setFilter] = useState<Filter>('all');
  const [focusMonth, setFocusMonth] = useState<number | null>(null);

  const data = useMemo(() => buildDasa36(d, new Date()), [d]);

  const now = new Date();
  const currentIdx = data.months.findIndex((m) => m.year === now.getFullYear() && m.month0 === now.getMonth());

  const shown = useMemo(() => data.months.filter((m) => {
    if (filter === 'all') return true;
    if (filter === 'high') return m.band === 'peak';
    const y = Number(filter.slice(1));
    return m.index > (y - 1) * 12 && m.index <= y * 12;
  }), [data, filter]);

  const pn = (id: string) => pick(GRAHA_INFO[id], lang);
  const rn = (i: number) => pick(RASI[i], lang).split(' ')[0];

  const lordLine = (m: MonthEntry) =>
    lang === 'ta'
      ? `${pn(m.maha)} தசை — ${pn(m.bhukti)} புக்தி — ${pn(m.antara)} அந்தரம்`
      : `${pn(m.maha)} Dasa — ${pn(m.bhukti)} Bhukti — ${pn(m.antara)} Antara`;

  return (
    <div className="stack">
      {/* ── Banner: currently active + slow transit planets ── */}
      <div className="panel m36-banner">
        <div className="panel-title">
          <span>{lang === 'ta' ? 'இப்போது நடப்பு — தசை · புக்தி · அந்தரம்' : 'Currently Active — Dasa · Bhukti · Antara'}</span>
          <span className="meta">{data.windowLabel} · {t('activeNow')}</span>
        </div>
        <div className="m36-active">
          <div className="m36-active-lords">
            <div className="m36-lord">
              <span className="k">{lang === 'ta' ? 'மகாதசை' : 'Mahadasa'}</span>
              <span className="v">{pn(data.activeNow.maha)}</span>
            </div>
            <div className="m36-lord">
              <span className="k">{lang === 'ta' ? 'புக்தி' : 'Bhukti'}</span>
              <span className="v">{pn(data.activeNow.bhukti)}</span>
            </div>
            <div className="m36-lord">
              <span className="k">{lang === 'ta' ? 'அந்தரம்' : 'Antara'}</span>
              <span className="v">{pn(data.activeNow.antara)}</span>
            </div>
            <div className="m36-lord">
              <span className="k">{lang === 'ta' ? 'அந்தர காலம்' : 'Antara Window'}</span>
              <span className="v num">{fmtDate(data.activeNow.antaraStart)} → {fmtDate(data.activeNow.antaraEnd)}</span>
            </div>
          </div>
          <div className="m36-slow">
            {data.slowNow.map((s) => (
              <div key={s.id} className="m36-slow-item">
                <span className="sym">{pick(GRAHA_ABBR[s.id], lang)}</span>
                <span className="nm">{pn(s.id)}</span>
                <span className="mono">{rn(s.rasi)}</span>
                <span className="mono hh">{s.fromMoon}-ல்</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 3-year overview strip ── */}
      <div className="panel">
        <div className="panel-title">
          <span>{lang === 'ta' ? 'அடுத்த 36 மாதங்கள் — வருடாந்திர பார்வை' : 'Next 36 Months — Overview Strip'}</span>
          <span className="meta">{data.months[0].short} → {data.months[35].short}</span>
        </div>
        <div className="seg m36-filters">
          {([['all', 'அனைத்து 36 மாதங்கள்', 'All 36 Months'], ['y1', 'ஆண்டு 1', 'Year 1'], ['y2', 'ஆண்டு 2', 'Year 2'], ['y3', 'ஆண்டு 3', 'Year 3'], ['high', 'யோக மாதங்கள் மட்டும்', 'High-Yoga Months Only']] as const).map(([k, ta, en]) => (
            <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{lang === 'ta' ? ta : en}</button>
          ))}
        </div>

        <div className="m36-strip">
          {data.months.map((m) => (
            <button
              key={m.index}
              className={`m36-cell${m.index === currentIdx + 1 ? ' now' : ''}${focusMonth === m.index ? ' focus' : ''}`}
              onClick={() => {
                setFocusMonth(m.index);
                document.getElementById(`m36-${m.index}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              title={`${m.label.ta} — ${m.net}/100 · ${m.bandLabel.ta}`}
            >
              <span className="m36-bar-wrap"><span className="m36-bar" style={{ height: `${Math.max(8, m.net)}%`, background: BAND_COLOR[m.band] }} /></span>
              <span className="m36-lab num">{lang === 'ta' ? m.shortTa : m.short}</span>
            </button>
          ))}
        </div>
        <div className="m36-legend">
          <span><i style={{ background: BAND_COLOR.peak }} />{lang === 'ta' ? BAND_LABEL.peak.ta : BAND_LABEL.peak.en} (80–100)</span>
          <span><i style={{ background: BAND_COLOR.progress }} />{lang === 'ta' ? BAND_LABEL.progress.ta : BAND_LABEL.progress.en} (60–79)</span>
          <span><i style={{ background: BAND_COLOR.steady }} />{lang === 'ta' ? BAND_LABEL.steady.ta : BAND_LABEL.steady.en} (40–59)</span>
          <span><i style={{ background: BAND_COLOR.caution }} />{lang === 'ta' ? BAND_LABEL.caution.ta : BAND_LABEL.caution.en} (0–39)</span>
        </div>
        {onGoTimeline && (
          <button className="timeline-link" onClick={onGoTimeline}>{t('goTimeline')}</button>
        )}
      </div>

      {/* ── 36-month detailed chronology ── */}
      <div className="panel">
        <div className="panel-title">
          <span>{lang === 'ta' ? 'மாதாந்திர விரிவான பலன் — தசை + கோச்சாரம்' : 'Month-by-Month Detail — Dasa + Gochara'}</span>
          <span className="meta">{shown.length} {lang === 'ta' ? 'மாதங்கள்' : 'months'}</span>
        </div>
        <div className="m36-list">
          {shown.map((m) => (
            <div key={m.index} id={`m36-${m.index}`} className={`m36-row${m.index === currentIdx + 1 ? ' now' : ''}${focusMonth === m.index ? ' focus' : ''}`}>
              <div className="m36-row-head">
                <span className="m36-month">
                  <span className="num m36-idx">{lang === 'ta' ? `மாதம் ${m.index}` : `Month ${m.index}`}</span>
                  <span className="m36-name">{pick(m.label, lang)}</span>
                  {m.index === currentIdx + 1 && <span className="m36-now-tag">{lang === 'ta' ? 'நடப்பு' : 'Now'}</span>}
                </span>
                <ScoreBadge net={m.net} band={m.band} />
              </div>

              <div className="m36-dasa mono">{lordLine(m)}</div>

              <div className="m36-gochara">
                <span className="mono m36-transit"><bdi>{pick(m.transitSummary, lang)}</bdi></span>
                {m.gocharaFlags.map((f) => (
                  <span key={f.key} className={`m36-flag${f.good ? ' good' : ' bad'}`}>{pick(f.label, lang)}</span>
                ))}
              </div>

              <div className="m36-scores mono">
                {lang === 'ta' ? 'தசை' : 'Dasa'} {m.dasaScore} · {lang === 'ta' ? 'கோச்சாரம்' : 'Gochara'} {m.gocharaScore} · {lang === 'ta' ? 'மொத்தம்' : 'Net'} {m.net}/100
                <span className="m36-band" style={{ color: BAND_COLOR[m.band] }}>{pick(m.bandLabel, lang)}</span>
              </div>

              <div className="m36-pred">
                <p className="ta">{m.prediction.ta}</p>
                <p className="en">{m.prediction.en}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
