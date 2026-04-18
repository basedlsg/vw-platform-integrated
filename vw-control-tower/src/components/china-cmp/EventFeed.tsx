"use client";

import React, { useState } from 'react';
import { T } from '@/lib/translations';
import type { ChinaCmpEvent } from '@/lib/china-cmp/types';

type EventFilter = 'all' | 'SupplierCostDriftEvent' | 'CompetitorPricingEvent' | 'NevIncentiveUpdatedEvent' | 'ProgramMilestoneEvent';

const EVENT_CONFIG: Record<string, { icon: string; colorEn: string; colorZh: string; color: string }> = {
  SupplierCostDriftEvent:   { icon: '🏭', colorEn: 'Supplier Cost',      colorZh: '供应商成本',    color: '#8b5cf6' },
  CompetitorPricingEvent:   { icon: '⚡', colorEn: 'Competitor Pricing', colorZh: '竞争对手定价',  color: '#ef4444' },
  NevIncentiveUpdatedEvent: { icon: '💰', colorEn: 'Incentive Update',   colorZh: '激励更新',      color: '#f59e0b' },
  ProgramMilestoneEvent:    { icon: '📅', colorEn: 'Milestone',          colorZh: '里程碑',        color: '#135bec' },
};

function getImpactColor(event: ChinaCmpEvent): string {
  if (event.type === 'SupplierCostDriftEvent')
    return event.costDeltaPct > 0 ? '#ef4444' : '#10b981';
  if (event.type === 'CompetitorPricingEvent')
    return '#ef4444';
  if (event.type === 'ProgramMilestoneEvent')
    return event.slipDays > 0 ? '#ef4444' : '#10b981';
  if (event.type === 'NevIncentiveUpdatedEvent')
    return event.newIncentiveLevelPct > event.oldIncentiveLevelPct ? '#ef4444' : '#10b981';
  return 'var(--text-muted)';
}

function getImpactLabel(event: ChinaCmpEvent, lang: 'en' | 'zh', t: Record<string, string>): string {
  if (event.type === 'SupplierCostDriftEvent')
    return event.costDeltaPct > 0
      ? `+${event.costDeltaPct}% ${t.china_cmp_event_impact_worse}`
      : `${event.costDeltaPct}% ${t.china_cmp_event_impact_better}`;
  if (event.type === 'CompetitorPricingEvent')
    return `${event.priceChangePct}% → +${event.estimatedIncentiveImplicationPct}pp ${t.china_cmp_event_impact_worse}`;
  if (event.type === 'ProgramMilestoneEvent')
    return event.slipDays > 0
      ? `${event.slipDays} ${t.china_cmp_event_days_delayed} → +${event.estimatedCostImpactPct}pp`
      : lang === 'zh' ? '按时完成' : 'Completed on time';
  if (event.type === 'NevIncentiveUpdatedEvent') {
    const delta = event.newIncentiveLevelPct - event.oldIncentiveLevelPct;
    return `${delta > 0 ? '+' : ''}${delta.toFixed(1)}pp`;
  }
  return '';
}

function getTitle(event: ChinaCmpEvent, lang: 'en' | 'zh'): string {
  if (event.type === 'SupplierCostDriftEvent') {
    const supplier = lang === 'zh' ? event.supplierNameZh : event.supplierNameEn;
    return `${supplier} — ${lang === 'zh' ? event.reasonZh : event.reasonEn}`;
  }
  if (event.type === 'CompetitorPricingEvent') {
    const comp = lang === 'zh' ? event.competitorNameZh : event.competitorNameEn;
    const model = lang === 'zh' ? event.modelNameZh : event.modelNameEn;
    const source = lang === 'zh' ? (event.sourceZh ?? event.source) : event.source;
    return lang === 'zh'
      ? `${comp} ${model} 降价 ${Math.abs(event.priceChangePct)}%（${source}）`
      : `${comp} ${model} price cut ${Math.abs(event.priceChangePct)}% (${source})`;
  }
  if (event.type === 'ProgramMilestoneEvent') {
    return lang === 'zh' ? event.milestoneNameZh : event.milestoneNameEn;
  }
  if (event.type === 'NevIncentiveUpdatedEvent') {
    const model = lang === 'zh' ? event.modelNameZh : event.modelNameEn;
    return lang === 'zh'
      ? `${model} 激励: ${event.oldIncentiveLevelPct}% → ${event.newIncentiveLevelPct}%`
      : `${model} incentive: ${event.oldIncentiveLevelPct}% → ${event.newIncentiveLevelPct}%`;
  }
  return '';
}

interface Props {
  events: ChinaCmpEvent[];
  lang: 'en' | 'zh';
}

export function EventFeed({ events, lang }: Props) {
  const t = T[lang];
  const [filter, setFilter] = useState<EventFilter>('all');

  const filtered = filter === 'all' ? events : events.filter((e) => e.type === filter);
  const sorted = [...filtered].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const FILTER_LABELS: Record<EventFilter, string> = {
    all:                      lang === 'zh' ? '全部' : 'All',
    SupplierCostDriftEvent:   lang === 'zh' ? '供应商' : 'Supplier',
    CompetitorPricingEvent:   lang === 'zh' ? '竞争对手' : 'Competitor',
    NevIncentiveUpdatedEvent: lang === 'zh' ? '激励' : 'Incentive',
    ProgramMilestoneEvent:    lang === 'zh' ? '里程碑' : 'Milestone',
  };

  return (
    <div className="glass-card rounded-2xl p-6">
      <h3 className="text-base font-semibold t-primary mb-1">{t.china_cmp_events_title}</h3>
      <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>{t.china_cmp_events_subtitle}</p>

      {/* Filter chips */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        {(Object.keys(FILTER_LABELS) as EventFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1 text-xs font-medium rounded-full transition-all"
            style={{
              background: filter === f ? '#135bec' : 'var(--bg-surface)',
              color: filter === f ? 'white' : 'var(--text-muted)',
              border: `1px solid ${filter === f ? '#135bec' : 'var(--border-subtle)'}`,
            }}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      {/* Event list */}
      {sorted.length === 0 ? (
        <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>{t.china_cmp_events_empty}</p>
      ) : (
        <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
          {sorted.map((event, i) => {
            const cfg = EVENT_CONFIG[event.type];
            const impactColor = getImpactColor(event);
            const impactLabel = getImpactLabel(event, lang, t as unknown as Record<string, string>);
            const title = getTitle(event, lang);
            const date = new Date(event.timestamp).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', {
              month: 'short', day: 'numeric', year: '2-digit',
            });

            return (
              <div key={i} className="glass-card rounded-xl p-3.5" style={{ borderLeft: `3px solid ${cfg.color}` }}>
                <div className="flex items-start gap-3">
                  <span className="text-lg flex-shrink-0 mt-0.5">{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-semibold px-1.5 py-0.5 rounded" style={{ background: `${cfg.color}20`, color: cfg.color }}>
                        {lang === 'zh' ? cfg.colorZh : cfg.colorEn}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-very-muted)' }}>{date}</span>
                    </div>
                    <p className="text-sm t-body leading-snug">{title}</p>
                    {impactLabel && (
                      <p className="text-xs mt-1 font-medium" style={{ color: impactColor }}>{impactLabel}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
