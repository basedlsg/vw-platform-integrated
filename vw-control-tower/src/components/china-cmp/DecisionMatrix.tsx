"use client";

import React from 'react';
import { T } from '@/lib/translations';
import type { RecommendedAction } from '@/lib/china-cmp/types';

function computeScore(a: RecommendedAction): number {
  // Score = (impact * feasibility) / (risk * leadTime) * 10
  return Math.round((a.impactPct * a.feasibilityScore) / (a.riskScore * Math.max(a.leadTimeWeeks, 1)) * 100) / 10;
}

interface Props {
  actions: RecommendedAction[];
  lang: 'en' | 'zh';
  onSelectAction?: (actionId: string) => void;
}

export function DecisionMatrix({ actions, lang, onSelectAction }: Props) {
  const t = T[lang];
  const scored = [...actions]
    .map((a) => ({ ...a, score: computeScore(a) }))
    .sort((a, b) => b.score - a.score);

  const maxScore = Math.max(...scored.map(s => s.score), 1);

  return (
    <div className="glass-card rounded-2xl p-6">
      <h3 className="text-base font-semibold t-primary mb-1">{t.china_cmp_decision_title}</h3>
      <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>{t.china_cmp_decision_subtitle}</p>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_60px_60px_60px_60px_70px] gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-very-muted)' }}>
        <span>Action</span>
        <span className="text-center">{t.china_cmp_decision_impact}</span>
        <span className="text-center">{t.china_cmp_decision_feasibility}</span>
        <span className="text-center">{t.china_cmp_decision_risk}</span>
        <span className="text-center">{t.china_cmp_decision_lead}</span>
        <span className="text-center">{t.china_cmp_decision_score}</span>
      </div>

      {/* Rows */}
      <div className="space-y-1.5">
        {scored.map((a, i) => {
          const title = lang === 'zh' ? a.titleZh : a.titleEn;
          const scorePct = (a.score / maxScore) * 100;
          const rankColor = i === 0 ? '#135bec' : i === 1 ? '#10b981' : i === 2 ? '#f59e0b' : '#8b5cf6';

          return (
            <button
              key={a.actionId}
              className="w-full text-left grid grid-cols-[1fr_60px_60px_60px_60px_70px] gap-2 items-center px-3 py-3 rounded-xl transition-all"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
              onClick={() => onSelectAction?.(a.actionId)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: rankColor }}
                >
                  {i + 1}
                </span>
                <span className="text-xs font-medium t-primary truncate">{title}</span>
              </div>
              <span className="text-xs text-center font-bold" style={{ color: '#135bec' }}>{a.impactPct}{t.china_cmp_pp}</span>
              <span className="text-xs text-center">
                <ScoreBar value={a.feasibilityScore} max={5} color="#10b981" />
              </span>
              <span className="text-xs text-center">
                <ScoreBar value={a.riskScore} max={5} color="#ef4444" />
              </span>
              <span className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>{a.leadTimeWeeks}w</span>
              <div className="flex items-center gap-1.5">
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--border-subtle)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${scorePct}%`, background: rankColor }}
                  />
                </div>
                <span className="text-xs font-bold" style={{ color: rankColor, minWidth: 24, textAlign: 'right' }}>{a.score}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ScoreBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="flex gap-0.5 justify-center">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className="w-1.5 h-3 rounded-sm"
          style={{ background: i < value ? color : 'var(--border-subtle)' }}
        />
      ))}
    </div>
  );
}
