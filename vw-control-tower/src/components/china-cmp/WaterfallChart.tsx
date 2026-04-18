"use client";

import React, { useState } from 'react';
import {
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import { T } from '@/lib/translations';
import type { CostDriverBreakdown, ChinaCmpEvent, DriverStatus } from '@/lib/china-cmp/types';

// ─── Colors ──────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<DriverStatus, string> = {
  Green: '#10b981',
  Amber: '#f59e0b',
  Red:   '#ef4444',
};

// ─── Driver Detail Drawer ─────────────────────────────────────────────────────

function DriverDetailDrawer({
  driverKey,
  events,
  lang,
  onClose,
}: {
  driverKey: string;
  events: ChinaCmpEvent[];
  lang: 'en' | 'zh';
  onClose: () => void;
}) {
  const t = T[lang];

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'SupplierCostDriftEvent':   return '🏭';
      case 'CompetitorPricingEvent':   return '⚡';
      case 'NevIncentiveUpdatedEvent': return '💰';
      case 'ProgramMilestoneEvent':    return '📅';
      default: return '📌';
    }
  };

  const getImpactBadge = (event: ChinaCmpEvent) => {
    if (event.type === 'SupplierCostDriftEvent') {
      return event.costDeltaPct > 0
        ? { label: t.china_cmp_event_impact_worse, color: '#ef4444' }
        : { label: t.china_cmp_event_impact_better, color: '#10b981' };
    }
    if (event.type === 'CompetitorPricingEvent') {
      return { label: t.china_cmp_event_impact_worse, color: '#ef4444' };
    }
    if (event.type === 'ProgramMilestoneEvent') {
      return event.slipDays > 0
        ? { label: t.china_cmp_event_impact_worse, color: '#ef4444' }
        : { label: t.china_cmp_event_impact_neutral, color: 'var(--text-muted)' };
    }
    return { label: t.china_cmp_event_impact_neutral, color: 'var(--text-muted)' };
  };

  const getDescription = (event: ChinaCmpEvent) => {
    if (event.type === 'SupplierCostDriftEvent') {
      return lang === 'zh' ? event.reasonZh : event.reasonEn;
    }
    if (event.type === 'CompetitorPricingEvent') {
      const name = lang === 'zh' ? event.competitorNameZh : event.competitorNameEn;
      const model = lang === 'zh' ? event.modelNameZh : event.modelNameEn;
      return lang === 'zh'
        ? `${name} ${model} 降价 ${Math.abs(event.priceChangePct)}%，预计对大众激励强度影响 +${event.estimatedIncentiveImplicationPct}pp`
        : `${name} ${model} cut price ${Math.abs(event.priceChangePct)}%, estimated incentive implication: +${event.estimatedIncentiveImplicationPct}pp for VW`;
    }
    if (event.type === 'ProgramMilestoneEvent') {
      const name = lang === 'zh' ? event.milestoneNameZh : event.milestoneNameEn;
      return event.slipDays > 0
        ? lang === 'zh'
          ? `${name} 延误 ${event.slipDays} ${t.china_cmp_event_days_delayed}，预计成本影响 +${event.estimatedCostImpactPct}pp`
          : `${name} delayed ${event.slipDays} ${t.china_cmp_event_days_delayed}, estimated cost impact: +${event.estimatedCostImpactPct}pp`
        : lang === 'zh' ? `${name} 按时完成` : `${name} completed on time`;
    }
    if (event.type === 'NevIncentiveUpdatedEvent') {
      return lang === 'zh' ? event.reasonZh : event.reasonEn;
    }
    return '';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      style={{ background: 'var(--overlay)' }}
      onClick={onClose}
    >
      <div
        className="glass-modal rounded-2xl shadow-2xl w-full max-w-lg max-h-[70vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h3 className="text-base font-bold t-primary">{t.china_cmp_driver_detail_events}</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg t-muted" style={{ background: 'var(--bg-btn-secondary)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
          </button>
        </div>
        <div className="p-5 space-y-3">
          {events.length === 0 ? (
            <p className="text-sm t-secondary text-center py-4">{t.china_cmp_events_empty}</p>
          ) : events.map((event, i) => {
            const badge = getImpactBadge(event);
            return (
              <div key={i} className="glass-card rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0">{getEventIcon(event.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-medium" style={{ color: badge.color }}>{badge.label}</span>
                      <span className="text-xs" style={{ color: 'var(--text-very-muted)' }}>
                        {new Date(event.timestamp).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm t-body leading-relaxed">{getDescription(event)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, lang }: any) {
  const t = T[lang as 'en' | 'zh'];
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d || d.isInvisible) return null;

  return (
    <div className="glass-modal rounded-xl p-3 text-xs shadow-lg" style={{ minWidth: 160 }}>
      <p className="font-semibold t-primary mb-1">{d.label}</p>
      {d.needed !== undefined && (
        <p style={{ color: 'var(--text-muted)' }}>
          {t.china_cmp_needed_label}: {d.needed}{t.china_cmp_pp}
        </p>
      )}
      {d.value !== undefined && (
        <p style={{ color: d.color }}>
          {t.china_cmp_achieved_short}: {d.value > 0 ? '+' : ''}{d.value}{t.china_cmp_pp}
        </p>
      )}
      {d.hasEvents && (
        <p className="mt-1" style={{ color: '#135bec' }}>
          {lang === 'zh' ? '点击查看事件' : 'Click to view events'}
        </p>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  breakdown: CostDriverBreakdown;
  lang: 'en' | 'zh';
  targetPct: number;
  currentPct: number;
}

export function WaterfallChart({ breakdown, lang, targetPct, currentPct }: Props) {
  const t = T[lang];
  const [selectedDriver, setSelectedDriver] = useState<{ key: string; events: ChinaCmpEvent[] } | null>(null);

  const driverRows = [
    {
      key: 'battery',
      label: t.china_cmp_driver_battery,
      achieved: breakdown.battery.achieved,
      needed: breakdown.battery.needed,
      status: breakdown.battery.status,
      events: breakdown.battery.recentEvents,
    },
    {
      key: 'cea',
      label: t.china_cmp_driver_cea,
      achieved: breakdown.cea.achieved,
      needed: breakdown.cea.needed,
      status: breakdown.cea.status,
      events: breakdown.cea.recentEvents,
    },
    {
      key: 'adas_soc',
      label: t.china_cmp_driver_adas,
      achieved: breakdown.adas_soc.achieved,
      needed: breakdown.adas_soc.needed,
      status: breakdown.adas_soc.status,
      events: breakdown.adas_soc.recentEvents,
    },
    {
      key: 'localModules',
      label: t.china_cmp_driver_local,
      achieved: breakdown.localModules.achieved,
      needed: breakdown.localModules.needed,
      status: breakdown.localModules.status,
      events: breakdown.localModules.recentEvents,
    },
  ];

  // Headwind rows (positive = cost increase)
  const headwindRows = [
    {
      key: 'incentive',
      label: t.china_cmp_driver_incentive,
      value: breakdown.incentiveHeadwind,
      color: '#ef4444',
      events: [],
    },
    {
      key: 'timing',
      label: t.china_cmp_driver_timing,
      value: breakdown.timingHeadwind,
      color: '#f97316',
      events: [],
    },
  ];

  // Build chart data — waterfall pattern using stacked bars
  // Each bar = invisible offset + visible value bar
  // For reductions (negative values), show as positive lengths going left
  const chartData = [
    ...driverRows.map((d) => ({
      label: d.label,
      key: d.key,
      value: Math.abs(d.achieved),   // bar length (always positive for chart)
      rawValue: d.achieved,
      needed: d.needed,
      color: STATUS_COLOR[d.status],
      hasEvents: d.events.length > 0,
      events: d.events,
      isHeadwind: false,
    })),
    ...headwindRows.map((h) => ({
      label: h.label,
      key: h.key,
      value: h.value,
      rawValue: h.value,
      needed: undefined,
      color: h.color,
      hasEvents: false,
      events: [],
      isHeadwind: true,
    })),
    {
      label: t.china_cmp_driver_net,
      key: 'net',
      value: Math.abs(currentPct),
      rawValue: -currentPct,
      needed: -targetPct,
      color: currentPct >= targetPct * 0.9 ? '#10b981' : currentPct >= targetPct * 0.6 ? '#f59e0b' : '#ef4444',
      hasEvents: false,
      events: [],
      isHeadwind: false,
    },
  ];

  return (
    <>
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-base font-semibold t-primary mb-1">{t.china_cmp_waterfall_title}</h3>
        <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>{t.china_cmp_waterfall_subtitle}</p>

        {/* Horizontal bar chart (easier to read for waterfall with labels) */}
        <div className="space-y-3">
          {chartData.map((d) => {
            const maxVal = targetPct;
            const barPct = Math.min((d.value / maxVal) * 100, 100);
            const neededPct = d.needed !== undefined ? Math.min((Math.abs(d.needed) / maxVal) * 100, 100) : 0;

            return (
              <div
                key={d.key}
                className={`group ${d.hasEvents || d.key === 'net' ? '' : ''}`}
                onClick={() => d.hasEvents && d.events.length > 0 && setSelectedDriver({ key: d.key, events: d.events })}
                style={{ cursor: d.hasEvents && d.events.length > 0 ? 'pointer' : 'default' }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium t-secondary" style={{ minWidth: 160 }}>{d.label}</span>
                  <span className="text-xs font-bold" style={{ color: d.color }}>
                    {d.isHeadwind ? '+' : '−'}{d.value}{t.china_cmp_pp}
                    {d.needed !== undefined && (
                      <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                        {' '}({t.china_cmp_needed_label} −{Math.abs(d.needed)}{t.china_cmp_pp})
                      </span>
                    )}
                  </span>
                </div>
                <div className="relative h-6 rounded-lg overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
                  {/* Needed marker */}
                  {d.needed !== undefined && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 z-10"
                      style={{ left: `${neededPct}%`, background: 'rgba(255,255,255,0.4)' }}
                    />
                  )}
                  {/* Actual bar */}
                  <div
                    className="h-full rounded-lg transition-all duration-500 flex items-center justify-end pr-2"
                    style={{
                      width: `${barPct}%`,
                      background: d.color,
                      opacity: d.isHeadwind ? 0.7 : 1,
                    }}
                  >
                    {d.hasEvents && d.events.length > 0 && (
                      <span className="material-symbols-outlined text-white" style={{ fontSize: '12px' }}>open_in_new</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary line */}
        <div className="mt-5 pt-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <span className="text-sm t-secondary">{t.china_cmp_driver_net}</span>
          <span className="text-lg font-bold" style={{ color: chartData[chartData.length - 1].color }}>
            {currentPct}% / {targetPct}% {t.china_cmp_target_label}
          </span>
        </div>
      </div>

      {selectedDriver && (
        <DriverDetailDrawer
          driverKey={selectedDriver.key}
          events={selectedDriver.events}
          lang={lang}
          onClose={() => setSelectedDriver(null)}
        />
      )}
    </>
  );
}
