"use client";

import React, { useMemo } from 'react';
import Shell from '@/components/Shell';
import { fetchAllEventsByEntityType } from '@/lib/esaa/event-store';
import { useLang } from '@/lib/app-context';
import { T } from '@/lib/translations';
import type { BaseEvent } from '@/lib/esaa/types';

type EventWithPayload = BaseEvent & { id: string };

export default function HistoryPage(): React.JSX.Element {
  const [events, setEvents] = React.useState<EventWithPayload[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<'all' | 'KPI' | 'RISK' | 'PROPOSAL'>('all');
  const { lang } = useLang();
  const t = T[lang];
  const locale = lang === 'zh' ? 'zh-CN' : 'en-US';

  React.useEffect(() => {
    const loadEvents = async () => {
      try {
        let allEvents: BaseEvent[] = [];
        if (filter === 'all') {
          const kpis = await fetchAllEventsByEntityType('KPI');
          const risks = await fetchAllEventsByEntityType('RISK');
          const proposals = await fetchAllEventsByEntityType('PROPOSAL');
          allEvents = [...kpis, ...risks, ...proposals];
        } else {
          allEvents = await fetchAllEventsByEntityType(filter);
        }

        const sorted = allEvents
          .map((e, i) => ({ ...e, id: `${e.entityId}-${e.sequence}-${i}` }))
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        setEvents(sorted);
      } catch (err) {
        console.error('Failed to load events:', err);
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    void loadEvents();
  }, [filter]);

  const eventsByDay = useMemo(() => {
    const grouped: Record<string, EventWithPayload[]> = {};
    events.forEach((event) => {
      const date = new Date(event.timestamp).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(event);
    });
    return grouped;
  }, [events, locale]);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'KPI':
        return '📊';
      case 'RISK':
        return '⚠️';
      case 'PROPOSAL':
        return '💡';
      default:
        return '📝';
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'KPI':
        return 'border-l-blue-500';
      case 'RISK':
        return 'border-l-red-500';
      case 'PROPOSAL':
        return 'border-l-amber-500';
      default:
        return 'border-l-gray-500';
    }
  };

  const getEventDescription = (event: EventWithPayload): string => {
    const payload = event.payload as Record<string, unknown>;
    switch (event.type) {
      case 'KpiValueUpdatedEvent':
        return `${event.entityId} ${t.history_updated_to} ${payload.newValue} (${payload.reason || 'source unknown'})`;
      case 'RiskThresholdSetEvent':
        return `${event.entityId} ${t.history_threshold_set} ${payload.newThreshold} (${payload.impactLevel})`;
      case 'AgentProposalCreatedEvent':
        return `${payload.title || event.entityId}`;
      case 'ProposalStatusChangedEvent':
        return `${event.entityId} → ${payload.newStatus}`;
      default:
        return `${event.type} ${t.history_on} ${event.entityId}`;
    }
  };

  const FILTER_LABELS: Record<string, string> = {
    all: t.history_filter_all,
    KPI: t.history_filter_kpi,
    RISK: t.history_filter_risk,
    PROPOSAL: t.history_filter_proposal,
  };

  return (
    <Shell>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold t-primary">{t.history_title}</h2>
          <p className="text-sm t-secondary mt-1">{t.history_subtitle}</p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'KPI', 'RISK', 'PROPOSAL'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: filter === f ? '#135bec' : 'var(--bg-btn-secondary)',
                color: filter === f ? 'white' : 'var(--text-secondary)',
                border: `1px solid ${filter === f ? '#135bec' : 'var(--border-btn-sec)'}`,
              }}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-8 h-8 rounded-full border-2 border-t-transparent" style={{ borderColor: 'rgba(19,91,236,0.3)', borderTopColor: '#135bec' }} />
          </div>
        )}

        {/* Timeline */}
        {!loading && events.length === 0 && (
          <div className="glass-card rounded-xl p-10 text-center">
            <p className="text-lg font-medium t-secondary">{t.history_empty}</p>
          </div>
        )}

        {!loading && events.length > 0 && (
          <div className="space-y-8">
            {Object.entries(eventsByDay).map(([date, dayEvents]) => (
              <div key={date}>
                <div className="sticky top-0 z-10 py-2 px-3 rounded-lg mb-3" style={{ background: 'var(--bg-surface)' }}>
                  <p className="text-sm font-semibold t-secondary">{date}</p>
                </div>

                <div className="space-y-3">
                  {dayEvents.map((event) => (
                    <div
                      key={event.id}
                      className={`border-l-4 rounded-lg p-4 glass-card ${getEventColor(event.entityType)}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{getEventIcon(event.entityType)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded" style={{ background: 'var(--bg-btn-secondary)', color: 'var(--text-secondary)' }}>
                              {event.entityType}
                            </span>
                            <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{event.entityId}</span>
                            <span className="text-xs" style={{ color: 'var(--text-very-muted)' }}>v{event.sequence}</span>
                          </div>
                          <p className="text-sm font-medium t-primary mt-1 truncate">
                            {getEventDescription(event)}
                          </p>
                          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                            {new Date(event.timestamp).toLocaleTimeString(locale, {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Payload Details (collapsed) */}
                      <details className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                        <summary className="text-xs font-medium cursor-pointer t-muted" style={{ color: 'var(--text-muted)' }}>
                          {t.history_view_details}
                        </summary>
                        <pre className="mt-2 text-xs p-3 rounded overflow-auto max-h-[200px] t-secondary" style={{ background: 'var(--bg-surface)' }}>
                          {JSON.stringify(event.payload, null, 2)}
                        </pre>
                      </details>
                    </div>
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
