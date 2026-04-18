"use client";

import React, { useMemo, useState } from 'react';
import { useESAAStore } from '@/lib/esaa/store';
import { useLang } from '@/lib/app-context';
import { T } from '@/lib/translations';
import type { Risk } from '@/lib/esaa/types';
import type { TKeys } from '@/lib/translations';

type TStrings = Record<TKeys, string>;

type RiskMeta = {
  name: string; summary: string; detail: string; affects: string; mitigation: string;
  sources: { label: string; url: string }[];
};

function getRiskMeta(id: string, t: TStrings): RiskMeta {
  const META: Record<string, RiskMeta> = {
    RISK_TARIFF_001: {
      name: t.risk_tariff_name,
      summary: t.risk_tariff_summary,
      detail: t.risk_tariff_detail,
      affects: t.risk_tariff_affects,
      mitigation: t.risk_tariff_mitigation,
      sources: [
        { label: t.risk_source_vw_ar_2023, url: 'https://annualreport2023.volkswagenag.com/' },
        { label: t.risk_source_reuters_tariff, url: 'https://www.reuters.com/business/autos-transportation/' },
      ],
    },
    RISK_NEV_001: {
      name: t.risk_nev_name,
      summary: t.risk_nev_summary,
      detail: t.risk_nev_detail,
      affects: t.risk_nev_affects,
      mitigation: t.risk_nev_mitigation,
      sources: [
        { label: t.risk_source_vw_hy_2024, url: 'https://www.volkswagen-group.com/en/half-year-report-2024-18896' },
        { label: t.risk_source_electrek, url: 'https://electrek.co' },
      ],
    },
    RISK_STOCK_PRESSURE: {
      name: t.risk_stock_name,
      summary: t.risk_stock_summary,
      detail: t.risk_stock_detail,
      affects: t.risk_stock_affects,
      mitigation: t.risk_stock_mitigation,
      sources: [{ label: t.risk_source_vw_ir, url: 'https://www.volkswagen-group.com/en/investors-17' }],
    },
    RISK_MARGIN_001: {
      name: t.risk_margin_name,
      summary: t.risk_margin_summary,
      detail: t.risk_margin_detail,
      affects: t.risk_margin_affects,
      mitigation: t.risk_margin_mitigation,
      sources: [
        { label: t.risk_source_vw_q3, url: 'https://www.volkswagen-group.com/en/investors-17' },
        { label: t.risk_source_vw_ar_2023, url: 'https://annualreport2023.volkswagenag.com/' },
      ],
    },
  };

  return META[id] ?? {
    name: id,
    summary: t.risk_fallback_summary,
    detail: t.risk_fallback_detail,
    affects: t.risk_fallback_affects,
    mitigation: t.risk_fallback_mitigation,
    sources: [],
  };
}

const IMPACT_CONFIG: Record<string, { dot: string; badge: string }> = {
  HIGH:   { dot: '#ef4444', badge: 'rgba(239,68,68,0.15)' },
  MEDIUM: { dot: '#f97316', badge: 'rgba(249,115,22,0.15)' },
  LOW:    { dot: '#135bec', badge: 'rgba(19,91,236,0.15)' },
};

function RiskDetailModal({ risk, onClose, lang }: { risk: Risk; onClose: () => void; lang: 'en' | 'zh' }) {
  const t = T[lang];
  const meta = getRiskMeta(risk.id, t);
  const config = IMPACT_CONFIG[risk.impact] ?? IMPACT_CONFIG.LOW;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--overlay)' }} onClick={onClose}>
      <div className="glass-modal rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold t-primary">{meta.name}</h2>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: config.badge, color: config.dot }}>
              {risk.impact}
            </span>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors" style={{ background: 'var(--bg-btn-secondary)', color: 'var(--text-muted)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <h3 className="text-sm font-semibold t-primary mb-2">{t.risk_what_happening}</h3>
            <p className="text-sm leading-relaxed t-body">{meta.detail}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold t-primary mb-2">{t.risk_what_affects}</h3>
            <p className="text-sm t-body">{meta.affects}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold t-primary mb-2">{t.risk_mitigation}</h3>
            <p className="text-sm leading-relaxed t-body">{meta.mitigation}</p>
          </div>
          {meta.sources.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold t-primary mb-2">{t.risk_sources}</h3>
              <div className="space-y-1.5">
                {meta.sources.map((s, i) => (
                  <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm transition-colors t-accent"
                    style={{ color: '#135bec' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>open_in_new</span>
                    {s.label}
                  </a>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <div>
              <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-very-muted)' }}>{t.risk_threshold}</p>
              <p className="text-lg font-bold t-primary">{risk.threshold}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-very-muted)' }}>{t.risk_status}</p>
              <p className="text-lg font-bold t-primary">{risk.status}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RiskCard({ risk, onClick, lang }: { risk: Risk; onClick: () => void; lang: 'en' | 'zh' }) {
  const t = T[lang];
  const meta = getRiskMeta(risk.id, t);
  const config = IMPACT_CONFIG[risk.impact] ?? IMPACT_CONFIG.LOW;
  const [pressed, setPressed] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      className="glass-card glass-card-interactive rounded-2xl p-5 text-left w-full group relative overflow-hidden"
      style={{
        borderColor: pressed ? config.dot + '80' : undefined,
        background: pressed ? `${config.dot}0a` : undefined,
        transform: pressed ? 'scale(0.982)' : undefined,
        boxShadow: pressed ? `0 0 0 3px ${config.dot}20` : undefined,
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-2 h-2 rounded-full mt-0.5 flex-shrink-0"
            style={{ background: config.dot, boxShadow: `0 0 8px ${config.dot}80` }}
          />
          <h3 className="font-semibold text-sm t-primary">{meta.name}</h3>
        </div>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ml-2"
          style={{ background: config.badge, color: config.dot }}>
          {risk.impact}
        </span>
      </div>

      <p className="text-sm leading-relaxed mb-3 ml-4" style={{ color: 'var(--text-secondary)' }}>{meta.summary}</p>

      <div className="flex items-center justify-between ml-4">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {t.risk_affects}: {meta.affects.split(',').slice(0, 2).join(', ')}
        </p>
        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--text-muted)' }}>chevron_right</span>
      </div>
    </button>
  );
}

export const RiskRoadmap: React.FC = () => {
  const risks = useESAAStore((state) => state.state.risks);
  const isHydrated = useESAAStore((state) => state.isHydrated);
  const { lang } = useLang();
  const t = T[lang];
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);

  const riskArray = useMemo(() => {
    const order: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    return Object.values(risks).sort((a, b) => (order[b.impact] ?? 0) - (order[a.impact] ?? 0));
  }, [risks]);

  if (!isHydrated) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <div className="animate-spin w-8 h-8 rounded-full border-2 border-t-transparent mx-auto mb-3" style={{ borderColor: 'rgba(19,91,236,0.3)', borderTopColor: '#135bec' }} />
        <p className="text-sm t-secondary">{t.risk_loading}</p>
      </div>
    );
  }

  if (riskArray.length === 0) return null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold t-primary">{t.risk_title}</h2>
        <p className="text-sm t-secondary mt-0.5">{t.risk_subtitle}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {riskArray.map((risk) => (
          <RiskCard key={risk.id} risk={risk} lang={lang} onClick={() => setSelectedRisk(risk)} />
        ))}
      </div>
      {selectedRisk && <RiskDetailModal risk={selectedRisk} lang={lang} onClose={() => setSelectedRisk(null)} />}
    </div>
  );
};

export default RiskRoadmap;
