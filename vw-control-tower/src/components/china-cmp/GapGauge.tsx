"use client";

import React from 'react';
import { T } from '@/lib/translations';
import type { ChinaCmpProgramSnapshot } from '@/lib/china-cmp/types';

const STATUS_CONFIG = {
  Green: { color: '#10b981', label_en: 'On Track',    label_zh: '达标' },
  Amber: { color: '#f59e0b', label_en: 'At Risk',     label_zh: '存在风险' },
  Red:   { color: '#ef4444', label_en: 'Blocking',    label_zh: '严重阻碍' },
};

interface Props {
  program: ChinaCmpProgramSnapshot;
  lang: 'en' | 'zh';
}

export function GapGauge({ program, lang }: Props) {
  const t = T[lang];
  const cfg = STATUS_CONFIG[program.status];
  const name = lang === 'zh' ? program.programNameZh : program.programNameEn;
  const pct = (program.currentCostReductionPct / program.targetCostReductionPct) * 100;

  const variance = program.varianceLast30Days;
  const varianceLabel =
    Math.abs(variance) < 0.1
      ? t.china_cmp_variance_stable
      : variance > 0
        ? `↑ ${variance.toFixed(1)}${t.china_cmp_pp} ${t.china_cmp_variance_improving}`
        : `↓ ${Math.abs(variance).toFixed(1)}${t.china_cmp_pp} ${t.china_cmp_variance_deteriorating}`;
  const varianceColor = variance > 0 ? '#10b981' : variance < 0 ? '#ef4444' : 'var(--text-muted)';

  return (
    <div className="glass-card rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold t-primary">{name}</h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {t.china_cmp_target_label}: {program.targetCostReductionPct}% {t.china_cmp_achieved_label.toLowerCase()}&nbsp;
            → {t.china_cmp_gap_label}: <strong style={{ color: cfg.color }}>{program.gapPct}{t.china_cmp_pp}</strong>
          </p>
        </div>
        <span
          className="text-xs font-bold px-3 py-1.5 rounded-full"
          style={{ background: `${cfg.color}20`, color: cfg.color }}
        >
          {lang === 'zh' ? cfg.label_zh : cfg.label_en}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
          <span>0%</span>
          <span style={{ color: cfg.color, fontWeight: 600 }}>
            {program.currentCostReductionPct}% {t.china_cmp_achieved_label}
          </span>
          <span>{program.targetCostReductionPct}% {t.china_cmp_target_label}</span>
        </div>
        <div className="h-4 rounded-full overflow-hidden relative" style={{ background: 'var(--border-subtle)' }}>
          {/* Achieved portion */}
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: cfg.color }}
          />
          {/* Target marker at 40% = 100% of bar — show dashed line at 100% */}
          <div
            className="absolute top-0 bottom-0 w-0.5"
            style={{
              right: '0',
              background: 'rgba(255,255,255,0.6)',
              boxShadow: `0 0 6px ${cfg.color}`,
            }}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mt-5">
        <div>
          <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-very-muted)' }}>
            {t.china_cmp_achieved_label}
          </p>
          <p className="text-2xl font-bold" style={{ color: cfg.color }}>
            {program.currentCostReductionPct}%
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-very-muted)' }}>
            {t.china_cmp_gap_label}
          </p>
          <p className="text-2xl font-bold" style={{ color: cfg.color }}>
            −{program.gapPct}{t.china_cmp_pp}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-very-muted)' }}>
            {t.china_cmp_margin_risk}
          </p>
          <p className="text-2xl font-bold text-rose-500">
            {program.marginAtRisk90Days.toFixed(1)}{t.china_cmp_pp}
          </p>
        </div>
      </div>

      {/* Variance badge */}
      <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <p className="text-xs" style={{ color: varianceColor }}>
          {varianceLabel} <span style={{ color: 'var(--text-muted)' }}>(30 days)</span>
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-very-muted)' }}>
          {t.china_cmp_last_updated}: {new Date(program.lastUpdated).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      </div>
    </div>
  );
}
