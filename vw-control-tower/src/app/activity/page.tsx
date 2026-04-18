"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Shell from '@/components/Shell';
import { useLang } from '@/lib/app-context';
import { T } from '@/lib/translations';

type RawEvent = {
  entityId: string;
  entityType: string;
  type: string;
  sequence: number;
  timestamp: string;
  payload: Record<string, unknown>;
};

function describeEvent(event: RawEvent, lang: 'en' | 'zh'): {
  headline: string; detail: string; icon: string; iconColor: string; expandedText: string; sourceUrl?: string;
} {
  const p = event.payload;

  switch (event.type) {
    case 'KpiValueUpdatedEvent': {
      const value = Number(p.newValue ?? 0);
      const source = String(p.reason ?? '') || event.entityId;
      const prev = p.previousValue != null ? Number(p.previousValue) : null;
      const names: Record<string, Record<string, string>> = {
        KPI_OP_MARGIN: { en: 'Operating Margin',   zh: '营业利润率' },
        KPI_CASH_CONV: { en: 'Cash Conversion',     zh: '现金转化率' },
        KPI_BEV_SHARE: { en: 'BEV Delivery Share',  zh: '纯电动交付占比' },
      };
      const name = names[event.entityId]?.[lang] ?? event.entityId;
      const direction = prev != null ? (value > prev ? '↑' : value < prev ? '↓' : '→') : '';
      const changeText = prev != null ? ` (${lang === 'zh' ? '之前为' : 'was'} ${prev.toFixed(1)}%)` : '';
      return {
        headline: `${name} → ${value.toFixed(1)}%${changeText} ${direction}`,
        detail: source,
        icon: 'analytics',
        iconColor: '#135bec',
        expandedText: [
          `${name} ${lang === 'zh' ? '已更新为' : 'updated to'} ${value.toFixed(1)}%${prev != null ? ` ${lang === 'zh' ? '（之前为' : 'from'} ${prev.toFixed(1)}%${lang === 'zh' ? '）' : ''}` : ''}.`,
          source ? `\n${lang === 'zh' ? '数据来源' : 'Data source'}: ${source}` : '',
          prev != null ? `\n${lang === 'zh' ? '变化' : 'Change'}: ${(value - prev) > 0 ? '+' : ''}${(value - prev).toFixed(2)} ${lang === 'zh' ? '百分点' : 'percentage points'}` : '',
        ].filter(Boolean).join(''),
      };
    }

    case 'RiskThresholdSetEvent': {
      const impact = String(p.impactLevel ?? 'MEDIUM');
      const desc = String(p.description ?? '');
      const names: Record<string, Record<string, string>> = {
        RISK_TARIFF_001:    { en: 'US Tariff Exposure',    zh: '美国关税风险' },
        RISK_NEV_001:       { en: 'China EV Competition',  zh: '中国电动车竞争' },
        RISK_STOCK_PRESSURE:{ en: 'Stock Price Pressure',  zh: '股价压力' },
        RISK_MARGIN_001:    { en: 'Margin Erosion',        zh: '利润侵蚀' },
      };
      const name = names[event.entityId]?.[lang] ?? event.entityId;
      const colorMap: Record<string, string> = { HIGH: '#ef4444', MEDIUM: '#f97316', LOW: '#10b981' };
      return {
        headline: `${name} — ${impact}`,
        detail: desc.slice(0, 120) + (desc.length > 120 ? '…' : ''),
        icon: 'warning',
        iconColor: colorMap[impact] ?? '#f97316',
        expandedText: [
          `${name} ${lang === 'zh' ? '风险级别' : 'risk level'}: ${impact}.`,
          desc ? `\n\n${desc}` : '',
        ].filter(Boolean).join(''),
      };
    }

    case 'AgentProposalCreatedEvent': {
      const title = String(p.title ?? '').replace(/<[^>]*>/g, '');
      const desc = String(p.description ?? '').replace(/<[^>]*>/g, '').replace(/Source:\s*https?:\/\/\S+/g, '').trim();
      const srcMatch = String(p.description ?? '').match(/Source:\s*(https?:\/\/\S+)/);
      const sourceUrl = srcMatch?.[1];
      const action = String(p.suggestedAction ?? '');
      return {
        headline: `${lang === 'zh' ? '新警报' : 'New alert'}: ${title.slice(0, 100)}`,
        detail: action.slice(0, 120) + (action.length > 120 ? '…' : ''),
        icon: 'newspaper',
        iconColor: '#a855f7',
        sourceUrl,
        expandedText: [title, desc ? `\n\n${desc.slice(0, 500)}` : '', action ? `\n\n${lang === 'zh' ? '建议措施' : 'Recommended action'}: ${action}` : ''].filter(Boolean).join(''),
      };
    }

    case 'ProposalStatusChangedEvent': {
      const status = String(p.newStatus ?? '');
      const isApproved = status === 'APPROVED';
      return {
        headline: lang === 'zh'
          ? `警报${isApproved ? '已批准' : '已忽略'}`
          : `Alert ${isApproved ? 'approved and actioned' : 'dismissed'}`,
        detail: isApproved
          ? (lang === 'zh' ? '建议措施将予以执行。' : 'Recommended action will be implemented.')
          : (lang === 'zh' ? '无需进一步行动。' : 'No further action taken.'),
        icon: isApproved ? 'check_circle' : 'cancel',
        iconColor: isApproved ? '#10b981' : '#ef4444',
        expandedText: `${lang === 'zh' ? '针对' : 'The alert for'} ${event.entityId} ${lang === 'zh' ? '的警报' : 'was'} ${isApproved ? (lang === 'zh' ? '已批准' : 'approved') : (lang === 'zh' ? '已忽略' : 'dismissed')}.`,
      };
    }

    default:
      return { headline: event.type, detail: event.entityId, icon: 'info', iconColor: '#64748b', expandedText: `Event type: ${event.type}` };
  }
}

function formatDate(dateStr: string, lang: 'en' | 'zh' = 'en'): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime()) || d.getFullYear() < 2000) return lang === 'zh' ? '近期' : 'Recent';
  return d.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatTime(dateStr: string, lang: 'en' | 'zh' = 'en'): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime()) || d.getFullYear() < 2000) return '';
  return d.toLocaleTimeString(lang === 'zh' ? 'zh-CN' : 'en-US', { hour: '2-digit', minute: '2-digit' });
}

function EventCard({ event, lang }: { event: RawEvent; lang: 'en' | 'zh' }) {
  const [expanded, setExpanded] = useState(false);
  const [pressed, setPressed] = useState(false);
  const t = T[lang];
  const { headline, detail, icon, iconColor, expandedText, sourceUrl } = describeEvent(event, lang);

  return (
    <div
      className={`glass-card glass-card-interactive rounded-xl overflow-hidden transition-all duration-150 ${expanded ? 'glass-card-selected' : ''}`}
      style={{
        borderColor: pressed ? 'var(--border-blue-active)' : expanded ? 'var(--border-blue-hover)' : undefined,
        transform: pressed ? 'scale(0.99)' : undefined,
        background: expanded ? 'var(--bg-card-active)' : undefined,
        boxShadow: expanded ? '0 0 0 2px rgba(19,91,236,0.12)' : undefined,
      }}
      onClick={() => setExpanded(!expanded)}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
    >
      <div className="px-4 py-3 flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: `${iconColor}18` }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px', color: iconColor }}>{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium t-primary">{headline}</p>
          {detail && (
            <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{detail}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs" style={{ color: 'var(--text-very-muted)' }}>{formatTime(event.timestamp, lang)}</span>
            <span className="text-xs font-medium" style={{ color: 'rgba(19,91,236,0.7)' }}>{expanded ? t.activity_show_less : t.activity_show_more}</span>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 ml-11" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <p className="text-sm mt-3 leading-relaxed t-body">{expandedText}</p>
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm mt-3 font-medium"
              style={{ color: '#135bec' }}
              onClick={(e) => e.stopPropagation()}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>open_in_new</span>
              {t.activity_view_source}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

const FILTER_ICONS: Record<string, string> = {
  all: 'filter_list', KPI: 'analytics', RISK: 'warning', PROPOSAL: 'newspaper',
};

export default function ActivityPage(): React.JSX.Element {
  const { lang } = useLang();
  const t = T[lang];
  const [events, setEvents] = useState<RawEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'KPI' | 'RISK' | 'PROPOSAL'>('all');

  const FILTER_LABELS: Record<string, string> = {
    all: t.activity_filter_all,
    KPI: t.activity_filter_kpi,
    RISK: t.activity_filter_risk,
    PROPOSAL: t.activity_filter_proposal,
  };

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const types = filter === 'all' ? ['KPI', 'RISK', 'PROPOSAL'] : [filter];
      const results = await Promise.all(
        types.map(async (type) => {
          const res = await fetch(`/api/events/type/${type}`);
          if (!res.ok) return [];
          const data = await res.json() as { events: RawEvent[] };
          return data.events ?? [];
        })
      );
      setEvents(results.flat().sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ));
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { void fetchEvents(); }, [fetchEvents]);

  const grouped: Record<string, RawEvent[]> = {};
  events.forEach((e) => {
    const date = formatDate(e.timestamp, lang);
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(e);
  });

  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold t-primary">{t.activity_title}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{t.activity_subtitle}</p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'KPI', 'RISK', 'PROPOSAL'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all"
              style={{
                background: filter === f ? 'rgba(19,91,236,0.15)' : 'var(--bg-btn-secondary)',
                border: `1px solid ${filter === f ? 'rgba(19,91,236,0.25)' : 'var(--border-btn-sec)'}`,
                color: filter === f ? '#135bec' : 'var(--text-muted)',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{FILTER_ICONS[f]}</span>
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-8 h-8 rounded-full border-2 border-t-transparent" style={{ borderColor: 'rgba(19,91,236,0.3)', borderTopColor: '#135bec' }} />
          </div>
        )}

        {!loading && events.length === 0 && (
          <div className="glass-card rounded-2xl p-8 text-center">
            <span className="material-symbols-outlined block mb-2" style={{ fontSize: '32px', color: 'var(--text-muted)' }}>inbox</span>
            <p style={{ color: 'var(--text-muted)' }}>{t.activity_empty}</p>
          </div>
        )}

        {!loading && events.length > 0 && (
          <div className="space-y-6">
            {Object.entries(grouped).map(([date, dayEvents]) => (
              <div key={date}>
                <p className="text-xs font-bold uppercase tracking-widest mb-3 px-1" style={{ color: 'var(--text-muted)' }}>
                  {date}
                </p>
                <div className="space-y-2">
                  {dayEvents.map((event, i) => (
                    <EventCard key={`${event.entityId}-${event.sequence}-${i}`} event={event} lang={lang} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
