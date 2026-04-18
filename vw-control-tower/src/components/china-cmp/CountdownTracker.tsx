"use client";

import React from 'react';
import { T } from '@/lib/translations';
import type { CountdownMilestone } from '@/lib/china-cmp/types';

const STATUS_STYLE: Record<string, { bg: string; color: string; icon: string }> = {
  on_track: { bg: 'rgba(16,185,129,0.12)', color: '#10b981', icon: 'check_circle' },
  at_risk:  { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', icon: 'warning' },
  overdue:  { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444', icon: 'error' },
  complete: { bg: 'rgba(19,91,236,0.12)',  color: '#135bec', icon: 'task_alt' },
};

interface Props {
  milestones: CountdownMilestone[];
  lang: 'en' | 'zh';
  onSelectMilestone?: (id: string) => void;
}

export function CountdownTracker({ milestones, lang, onSelectMilestone }: Props) {
  const t = T[lang];
  const now = new Date();

  return (
    <div className="glass-card rounded-2xl p-6">
      <h3 className="text-base font-semibold t-primary mb-1">{t.china_cmp_countdown_title}</h3>
      <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>{t.china_cmp_countdown_subtitle}</p>

      <div className="space-y-2.5">
        {milestones.map((m) => {
          const target = new Date(m.targetDate);
          const diffMs = target.getTime() - now.getTime();
          const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          const style = STATUS_STYLE[m.status] ?? STATUS_STYLE.on_track;
          const title = lang === 'zh' ? m.titleZh : m.titleEn;
          const owner = lang === 'zh' ? m.ownerZh : m.ownerEn;

          return (
            <button
              key={m.id}
              className="w-full text-left glass-card rounded-xl p-3.5 transition-all"
              style={{ borderLeft: `3px solid ${style.color}` }}
              onClick={() => onSelectMilestone?.(m.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <span className="material-symbols-outlined flex-shrink-0 mt-0.5" style={{ fontSize: '18px', color: style.color }}>
                    {style.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold t-primary leading-snug">{title}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs flex-wrap">
                      <span style={{ color: 'var(--text-muted)' }}>{owner}</span>
                      <span style={{ color: '#135bec' }}>
                        {m.impactPct}{t.china_cmp_pp} · €{m.impactEurM}M
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  {m.status === 'complete' ? (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: style.bg, color: style.color }}>
                      {t.china_cmp_countdown_complete}
                    </span>
                  ) : (
                    <>
                      <p className="text-lg font-bold" style={{ color: daysLeft < 0 ? '#ef4444' : daysLeft <= 14 ? '#f59e0b' : style.color }}>
                        {Math.abs(daysLeft)}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {daysLeft < 0 ? t.china_cmp_countdown_overdue : t.china_cmp_countdown_days_left}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
