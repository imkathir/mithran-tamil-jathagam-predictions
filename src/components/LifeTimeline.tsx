import { useMemo, useState } from 'react';
import type { Dossier, Bilingual } from '../engine';
import { GRAHA_INFO } from '../engine';
import { buildTimeline, fmtLong, ageSpanText, type TimelineRow } from '../timeline';
import { useLang, useT, pick } from '../i18n';

type Filter = 'all' | 'active10' | 'auspicious' | 'challenging';

function ratingColor(r: number) {
  return r >= 75 ? 'var(--benefic)' : r >= 55 ? 'var(--benefic)' : r >= 40 ? 'var(--neutral)' : 'var(--malefic)';
}

function TimelineBlock({ row }: { row: TimelineRow }) {
  const lang = useLang();
  const t = useT();
  const p = row.prediction;
  const pair = lang === 'ta'
    ? `${GRAHA_INFO[row.dasaLord].ta} தசை — ${GRAHA_INFO[row.bhuktiLord].ta} புக்தி`
    : `${row.dasaLord} Mahadasa — ${row.bhuktiLord} Bhukti`;
  const statusText: Bilingual = row.status === 'active'
    ? { ta: t('statusActive'), en: t('statusActive') }
    : row.status === 'completed'
      ? { ta: t('statusDone'), en: t('statusDone') }
      : { ta: t('statusUpcoming'), en: t('statusUpcoming') };

  return (
    <div className={`timeline-block ${row.status}`}>
      <div className="tl-head">
        <div className="tl-pair">
          <span className="tl-lords">{pair}</span>
          <span className={`tl-status ${row.status}`}>{pick(statusText, lang)}</span>
        </div>
        <div className="tl-dates num">
          {fmtLong(row.start, lang)} – {fmtLong(row.end, lang)}
          <span className="tl-age">{ageSpanText(row.ageStart, row.ageEnd, lang)}</span>
        </div>
        <div className="tl-rating">
          <div className="bar-track" style={{ width: 140 }}>
            <div className="bar-fill" style={{ width: `${p.rating}%`, background: ratingColor(p.rating) }} />
          </div>
          <span className="num">{p.rating}/100 · {pick(p.category, lang)}</span>
        </div>
      </div>

      <div className="pred-body tl-body">{pick(p.body, lang)}</div>

      <div className="events-grid">
        <div className="event-row"><span className="ev-k">{t('eventsCareer')}</span><span className="ev-v">{pick(p.events.career, lang)}</span></div>
        <div className="event-row"><span className="ev-k">{t('eventsFinance')}</span><span className="ev-v">{pick(p.events.finance, lang)}</span></div>
        <div className="event-row"><span className="ev-k">{t('eventsFamily')}</span><span className="ev-v">{pick(p.events.family, lang)}</span></div>
        <div className="event-row"><span className="ev-k">{t('eventsHealth')}</span><span className="ev-v">{pick(p.events.health, lang)}</span></div>
      </div>

      <div className="ledger">
        <div className="ledger-title">{t('activatedHouses')}</div>
        {p.ledger.map((r, i) => (
          <div key={i} className="ledger-row">
            <span className={`ledger-sign ${r.sign === 1 ? 'nature-benefic' : r.sign === -1 ? 'nature-malefic' : 'nature-neutral'}`}>
              {r.sign === 1 ? '+' : r.sign === -1 ? '−' : '·'}
            </span>
            <span className="ledger-label">{pick(r.label, lang)}</span>
            <span className="ledger-value">{pick(r.value, lang)}</span>
          </div>
        ))}
      </div>

      <div className="tl-guidance">
        <span className="tg-k">{t('guidanceLabel')}</span>
        <span className="tg-v">{pick(p.guidance, lang)}</span>
      </div>
    </div>
  );
}

export default function LifeTimeline({ d }: { d: Dossier }) {
  const lang = useLang();
  const t = useT();
  const rows = useMemo(() => buildTimeline(d, new Date()), [d]);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const now = new Date();
  const in10 = new Date(now.getTime() + 10 * 365.25 * 86400000);
  const filtered = rows.filter((r) => {
    if (filter === 'active10') {
      if (!(r.status === 'active' || (r.status === 'upcoming' && r.start <= in10))) return false;
    } else if (filter === 'auspicious') {
      if (r.prediction.rating < 60) return false;
    } else if (filter === 'challenging') {
      if (r.prediction.rating >= 45) return false;
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      const hay = [
        GRAHA_INFO[r.dasaLord].ta, GRAHA_INFO[r.dasaLord].en, GRAHA_INFO[r.bhuktiLord].ta, GRAHA_INFO[r.bhuktiLord].en,
        r.prediction.category.ta, r.prediction.category.en,
        fmtLong(r.start, 'en'), fmtLong(r.start, 'ta'), String(Math.floor(r.ageStart)),
      ].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="panel">
      <div className="panel-title">
        <span>{t('timelineTitle')}</span>
        <span className="meta">{rows.length} {lang === 'ta' ? 'புக்தி காலங்கள்' : 'bhukti periods'} · 0–70</span>
      </div>

      <div className="filter-bar">
        <div className="mode-switch" style={{ maxWidth: 560 }}>
          {([['all', 'filterAll'], ['active10', 'filterActive'], ['auspicious', 'filterAuspicious'], ['challenging', 'filterChallenging']] as const).map(([k, s]) => (
            <button key={k} className={filter === k ? 'active' : ''} onClick={() => setFilter(k)}>{t(s)}</button>
          ))}
        </div>
        <input
          style={{ maxWidth: 280 }}
          placeholder={t('searchPh')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {filtered.length === 0 && <div className="tl-empty">{lang === 'ta' ? 'பொருந்தும் காலங்கள் இல்லை.' : 'No periods match.'}</div>}
      {filtered.map((r, i) => (
        <TimelineBlock key={`${r.dasaLord}-${r.bhuktiLord}-${i}`} row={r} />
      ))}
    </div>
  );
}
