"use client";

import React from 'react';
import { T } from '@/lib/translations';
import type { ChinaCmpProgramSnapshot } from '@/lib/china-cmp/types';

const STATUS_CONFIG = {
  Green: { dot: '#10b981', badge: 'rgba(16,185,129,0.15)', label: '●' },
  Amber: { dot: '#f59e0b', badge: 'rgba(245,158,11,0.15)', label: '●' },
  Red:   { dot: '#ef4444', badge: 'rgba(239,68,68,0.15)',  label: '●' },
};

interface Props {
  programs: ChinaCmpProgramSnapshot[];
  selectedId: string;
  onSelect: (id: string) => void;
  lang: 'en' | 'zh';
}

export function ProgramSelector({ programs, selectedId, onSelect, lang }: Props) {
  const t = T[lang];

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide px-1" style={{ color: 'var(--text-very-muted)' }}>
        {t.china_cmp_programs_title}
      </p>
      {programs.map((p) => {
        const isSelected = p.program === selectedId;
        const cfg = STATUS_CONFIG[p.status];
        const name = lang === 'zh' ? p.programNameZh : p.programNameEn;

        return (
          <button
            key={p.program}
            onClick={() => onSelect(p.program)}
            className="w-full text-left rounded-xl px-3 py-3 transition-all"
            style={{
              background: isSelected ? 'rgba(19,91,236,0.10)' : 'var(--bg-surface)',
              border: `1px solid ${isSelected ? 'rgba(19,91,236,0.3)' : 'var(--border-subtle)'}`,
            }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-semibold t-primary">{name}</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: cfg.badge, color: cfg.dot }}>
                {p.currentCostReductionPct}%
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span style={{ color: cfg.dot, fontSize: '10px' }}>●</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {t.china_cmp_gap_label}: {p.gapPct}{t.china_cmp_pp}
              </span>
            </div>
            {/* Mini progress bar */}
            <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-subtle)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(p.currentCostReductionPct / p.targetCostReductionPct) * 100}%`,
                  background: cfg.dot,
                }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}
