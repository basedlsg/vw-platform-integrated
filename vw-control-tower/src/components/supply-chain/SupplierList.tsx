'use client';

import React, { useState } from 'react';
import { useLang } from '@/lib/app-context';
import { T } from '@/lib/translations';
import { useSupplyChainStore } from '@/lib/supply-chain/store';
import type { SupplierSnapshot } from '@/lib/supply-chain/types';

const AWARD_COLORS: Record<string, { bg: string; text: string }> = {
  'Award Ready':  { bg: 'rgba(34,197,94,0.12)',  text: '#4ade80' },
  'Conditional':  { bg: 'rgba(251,191,36,0.12)', text: '#fbbf24' },
  'Not Ready':    { bg: 'rgba(239,68,68,0.12)',  text: '#f87171' },
  'Blocked':      { bg: 'rgba(239,68,68,0.20)',  text: '#ef4444' },
};

const TIER_LABELS: Record<string, string> = {
  'Tier 1': 'T1',
  'Tier 2': 'T2',
  'Upstream': 'UP',
};

function AwardBadge({ status, t }: { status: string; t: (typeof T)[keyof typeof T] }) {
  const color = AWARD_COLORS[status] ?? AWARD_COLORS['Not Ready'];
  const labels: Record<string, string> = {
    'Award Ready': t.sc_award_ready,
    'Conditional': t.sc_award_conditional,
    'Not Ready':   t.sc_award_not_ready,
    'Blocked':     t.sc_award_blocked,
  };
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: color.bg, color: color.text }}
    >
      {labels[status] ?? status}
    </span>
  );
}

function RiskDot({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span
      className="ml-auto w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
      style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171' }}
    >
      {count}
    </span>
  );
}

export function SupplierList() {
  const { lang } = useLang();
  const t = T[lang];
  const { suppliers, selectedSupplierId, selectSupplier } = useSupplyChainStore();
  const [filter, setFilter] = useState<'all' | 'Tier 1' | 'Tier 2' | 'Upstream' | 'risk'>('all');

  const filters: { key: typeof filter; label: string }[] = [
    { key: 'all',    label: t.sc_supplier_filter_all },
    { key: 'Tier 1', label: t.sc_supplier_filter_t1 },
    { key: 'Tier 2', label: t.sc_supplier_filter_t2 },
    { key: 'Upstream', label: t.sc_supplier_filter_upstream },
    { key: 'risk',   label: t.sc_supplier_filter_risk },
  ];

  const filtered: SupplierSnapshot[] = suppliers.filter((s) => {
    if (filter === 'all') return true;
    if (filter === 'risk') return s.activeRisks.some((r) => r.level === 'High' || r.level === 'Critical');
    return s.tier === filter;
  });

  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid var(--border-divider)' }}>
        <p className="text-sm font-semibold t-primary mb-3">{t.sc_supplier_list_title}</p>
        {/* Filter chips */}
        <div className="flex gap-1 flex-wrap">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
              style={{
                background: filter === f.key ? '#135bec' : 'var(--bg-surface)',
                color: filter === f.key ? 'white' : 'var(--text-muted)',
                border: `1px solid ${filter === f.key ? 'transparent' : 'var(--border-subtle)'}`,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map((s) => {
          const isSelected = s.supplierId === selectedSupplierId;
          const highRiskCount = s.activeRisks.filter((r) => r.level === 'High' || r.level === 'Critical').length;
          const name = lang === 'zh' ? s.nameZh : s.nameEn;
          const component = lang === 'zh' ? s.componentZh : s.component;

          return (
            <button
              key={s.supplierId}
              onClick={() => selectSupplier(s.supplierId)}
              className="w-full text-left px-4 py-3 transition-all"
              style={{
                background: isSelected ? 'rgba(19,91,236,0.08)' : 'transparent',
                borderBottom: '1px solid var(--border-divider)',
                borderLeft: `2px solid ${isSelected ? '#135bec' : 'transparent'}`,
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-xs font-bold px-1.5 py-0.5 rounded"
                  style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}
                >
                  {TIER_LABELS[s.tier] ?? s.tier}
                </span>
                <span className="text-sm font-semibold t-primary truncate flex-1">{name}</span>
                <RiskDot count={highRiskCount} />
              </div>
              <p className="text-xs t-muted truncate mb-1.5">{component}</p>
              <div className="flex items-center justify-between gap-2">
                <AwardBadge status={s.awardStatus} t={t} />
                <span
                  className="text-xs font-bold px-1.5 py-0.5 rounded"
                  style={{
                    background: s.sRating === 'Not Assessed' ? 'rgba(100,116,139,0.15)' : s.sRating === 'A' ? 'rgba(34,197,94,0.1)' : s.sRating === 'B' ? 'rgba(251,191,36,0.1)' : 'rgba(239,68,68,0.1)',
                    color: s.sRating === 'Not Assessed' ? 'var(--text-muted)' : s.sRating === 'A' ? '#4ade80' : s.sRating === 'B' ? '#fbbf24' : '#f87171',
                  }}
                >
                  {t.sc_s_rating}: {s.sRating === 'Not Assessed' ? t.sc_s_rating_not_assessed : s.sRating}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
