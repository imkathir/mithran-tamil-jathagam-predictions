import { useState } from 'react';
import type { Dossier, GrahaEval, Bilingual } from '../engine';
import { RASI, NAKSHATRA, GRAHA_INFO, navamsaRasi } from '../engine';
import { useLang, useT, GRAHA_ABBR, TAG, pick, ordinal, type Lang } from '../i18n';

// Fixed South Indian 4x4 grid: rasi index -> (row, col)
const GRID: Record<number, [number, number]> = {
  11: [0, 0], 0: [0, 1], 1: [0, 2], 2: [0, 3],
  10: [1, 0], 3: [1, 3],
  9: [2, 0], 4: [2, 3],
  8: [3, 0], 7: [3, 1], 6: [3, 2], 5: [3, 3],
};

function CellTags({ g }: { g: GrahaEval }) {
  const lang = useLang();
  return (
    <>
      {g.dignityKey === 'own' && <span className="tag"> {pick(TAG.own, lang)}</span>}
      {g.dignityKey === 'exalt' && <span className="tag"> {pick(TAG.exalt, lang)}</span>}
      {g.dignityKey === 'debil' && <span className="tag"> {pick(TAG.debil, lang)}</span>}
      {g.neechaBhanga && g.dignityKey === 'debil' && <span className="tag"> {pick(TAG.nbhanga, lang)}</span>}
      {g.retro && g.id !== 'Rahu' && g.id !== 'Ketu' && <span className="tag"> {pick(TAG.retro, lang)}</span>}
      {g.combust && <span className="tag"> {pick(TAG.combust, lang)}</span>}
    </>
  );
}

interface Badge { from: string; num: number; traditional?: boolean }

function aspectBadgeText(b: Badge, lang: Lang) {
  const name = lang === 'ta' ? pick(GRAHA_ABBR[b.from], lang) : GRAHA_INFO[b.from].en;
  const trad = b.traditional ? (lang === 'ta' ? ' (மரபு)' : ' (trad)') : '';
  return lang === 'ta'
    ? `${name} ${b.num}-ம் பார்வை${trad}`
    : `${name} ${ordinal(b.num, lang)} Aspect${trad}`;
}

export function SIChart({ grid, grahaMap, title, meta, centerTop, centerLines, markRasi, badges, tooltips, onGrahaClick, grahaActiveId }: {
  grid: Record<number, string[]>;
  grahaMap: Record<string, GrahaEval>;
  title: string; meta: string; centerTop: string; centerLines: string[];
  markRasi: number | null;
  badges: Record<number, Badge[]>;
  tooltips: Record<number, string>;
  onGrahaClick?: (id: string) => void;
  grahaActiveId?: string | null;
}) {
  const lang = useLang();
  const t = useT();
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < 12; r++) {
    const [row, col] = GRID[r];
    const ids = grid[r] ?? [];
    const rBadges = badges[r] ?? [];
    cells.push(
      <div
        key={r}
        className={`si-cell${r === markRasi ? ' lagna-cell' : ''}${rBadges.length ? ' aspect-target' : ''}`}
        style={{ gridRow: row + 1, gridColumn: col + 1 }}
        title={tooltips[r]}
      >
        <span className="rasi-tag">{RASI[r].sym}</span>
        {ids.map((id) => {
          const g = grahaMap[id];
          return (
            <div
              key={id}
              className={`graha-line${id === grahaActiveId ? ' graha-active' : ''}`}
              onClick={onGrahaClick ? () => onGrahaClick(id) : undefined}
              style={onGrahaClick ? { cursor: 'pointer' } : undefined}
            >
              <span className="abbr">{pick(GRAHA_INFO[id], lang)}</span>
              <span className="deg"> {Math.floor(g.deg)}°</span>
              <CellTags g={g} />
            </div>
          );
        })}
        {rBadges.map((b, i) => (
          <div key={i} className={`aspect-badge${b.traditional ? ' traditional' : ''}`}>
            {aspectBadgeText(b, lang)}
          </div>
        ))}
        {r === markRasi && <span className="lagna-mark">{t('lagnaLabel')}</span>}
      </div>,
    );
  }
  return (
    <div>
      <div className="chart-caption">
        <span className="title">{title}</span>
        <span className="meta">{meta}</span>
      </div>
      <div className="si-chart">
        {cells}
        <div className="si-center">
          <div className="t">{centerTop}</div>
          {centerLines.map((l) => <div key={l} className="s">{l}</div>)}
        </div>
      </div>
    </div>
  );
}

export default function ChartPair({ d, selId, onSel }: { d: Dossier; selId: string | null; onSel: (id: string) => void }) {
  const lang = useLang();
  const t = useT();
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(true);
  const grahaMap = Object.fromEntries(d.grahas.map((g) => [g.id, g])) as Record<string, GrahaEval>;
  const moon = grahaMap.Moon;
  const janmaNak: Bilingual = NAKSHATRA[moon.nakIdx];
  const janmaRasi = RASI[moon.rasi];
  const activeId = hoverId ?? selId;

  // badges for D1
  const badges: Record<number, Badge[]> = {};
  const source = showAll ? d.grahas.map((g) => g.id) : activeId ? [activeId] : [];
  source.forEach((id) => {
    grahaMap[id].aspectDetails.forEach((a) => {
      (badges[a.targetRasi] ??= []).push({ from: id, num: a.num, traditional: a.traditional });
    });
  });

  // cells targeted by the active graha (hover/selection) get the highlight tint
  const focusTargets = new Set<number>(
    activeId ? grahaMap[activeId].aspectDetails.map((a) => a.targetRasi) : [],
  );

  // tooltips: occupants + incoming paarvai per rasi
  const tooltips: Record<number, string> = {};
  for (let r = 0; r < 12; r++) {
    const occ = d.grahas.filter((g) => g.rasi === r).map((g) => pick(GRAHA_INFO[g.id], lang)).join(', ') || '—';
    const incoming = d.grahas.flatMap((g) => g.aspectDetails.filter((a) => a.targetRasi === r).map((a) => aspectBadgeText({ from: g.id, num: a.num, traditional: a.traditional }, lang)));
    tooltips[r] = `${pick(RASI[r], lang)} — ${occ}\n${t('paarvaiReceived')}: ${incoming.join(', ') || '—'}`;
  }

  return (
    <div className="chart-wrap">
      <div onMouseLeave={() => setHoverId(null)}>
        <div className="chart-caption">
          <span className="title">{t('rasiChart')}</span>
          <span className="meta">
            {t('ayanamsa')} {d.ayanamsa.toFixed(3)}°
            <button className={`paarvai-toggle${showAll ? ' on' : ''}`} onClick={() => setShowAll(!showAll)}>
              {showAll ? t('hideAllPaarvai') : t('showAllPaarvai')}
            </button>
          </span>
        </div>
        <div
          className="si-chart"
          onMouseLeave={() => setHoverId(null)}
        >
          {(() => {
            const cells: React.ReactNode[] = [];
            for (let r = 0; r < 12; r++) {
              const [row, col] = GRID[r];
              const ids = d.rasiGrid[r] ?? [];
              const rBadges = badges[r] ?? [];
              cells.push(
                <div
                  key={r}
                  className={`si-cell${r === d.lagnaRasi ? ' lagna-cell' : ''}${focusTargets.has(r) ? ' aspect-target' : ''}${rBadges.length ? ' has-aspects' : ''}`}
                  style={{ gridRow: row + 1, gridColumn: col + 1 }}
                  title={tooltips[r]}
                >
                  <span className="rasi-tag">{RASI[r].sym}</span>
                  {ids.map((id) => {
                    const g = grahaMap[id];
                    return (
                      <div
                        key={id}
                        className={`graha-line${id === activeId ? ' graha-active' : ''}`}
                        onClick={() => onSel(id)}
                        onMouseEnter={() => setHoverId(id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <span className="abbr">{pick(GRAHA_INFO[id], lang)}</span>
                        <span className="deg"> {Math.floor(g.deg)}°</span>
                        <CellTags g={g} />
                      </div>
                    );
                  })}
                  {rBadges.map((b, i) => (
                    <div key={i} className={`aspect-badge${b.traditional ? ' traditional' : ''}${activeId && b.from === activeId ? ' focus' : ''}${activeId && b.from !== activeId ? ' dim' : ''}`}>
                      {aspectBadgeText(b, lang)}
                    </div>
                  ))}
                  {r === d.lagnaRasi && <span className="lagna-mark">{t('lagnaLabel')}</span>}
                </div>,
              );
            }
            return cells;
          })()}
          <div className="si-center">
            <div className="t">{`${t('lagna')}: ${pick(RASI[d.lagnaRasi], lang)} ${(d.lagnaLon % 30).toFixed(1)}°`}</div>
            <div className="s">{`${d.profile.name} · ${d.profile.date} ${d.profile.time}`}</div>
            <div className="s">{`${d.profile.placeName} · ${d.profile.latitude.toFixed(4)}°N ${d.profile.longitude.toFixed(4)}°E`}</div>
            <div className="s">{`${t('janmaRasi')}: ${pick(janmaRasi, lang)}`}</div>
            <div className="s">{`${t('janmaNak')}: ${pick(janmaNak, lang)} ${moon.pada}`}</div>
          </div>
        </div>

        {(showAll || activeId) && (
          <div className="paarvai-glance">
            {(showAll ? d.grahas : d.grahas.filter((g) => g.id === activeId)).map((g) => (
              <div key={g.id} className="paarvai-glance-row">
                <span className="pg-name">{pick(GRAHA_INFO[g.id], lang)}</span>
                <span className="pg-detail">
                  {g.aspectDetails.map((a) => `${ordinal(a.num, lang)}${lang === 'ta' ? ' பார்வை' : ' Aspect'} → ${pick(RASI[a.targetRasi], lang)} (${a.targetHouse})${a.grahasInTarget.length ? ` [${a.grahasInTarget.map((id) => pick(GRAHA_INFO[id], lang)).join(', ')}]` : ''}${a.traditional ? (lang === 'ta' ? ' (மரபு)' : ' (trad)') : ''}`).join(' · ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <SIChart
        grid={d.navamsaGrid}
        grahaMap={grahaMap}
        title={t('navamsaChart')}
        meta="D9"
        centerTop="D9 · Navamsa"
        centerLines={[
          `${t('lagna')}: ${pick(RASI[navamsaRasi(d.lagnaLon)], lang)}`,
          `${t('janmaRasi')}: ${pick(RASI[moon.rasi], lang)}`,
          `${t('janmaNak')}: ${pick(NAKSHATRA[moon.nakIdx], lang)} ${moon.pada}`,
        ]}
        markRasi={navamsaRasi(d.lagnaLon)}
        badges={{}}
        tooltips={{}}
      />
    </div>
  );
}
