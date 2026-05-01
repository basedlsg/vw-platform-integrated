'use client';

import React, { useEffect, useState } from 'react';
import { useLang } from '@/lib/app-context';
import { T } from '@/lib/translations';
import type { AgentProposal, BaseEvent } from '@/lib/esaa/types';
import { labelFor } from './meta';

interface Props {
  proposals: AgentProposal[];
}

interface LogRow {
  proposalId: string;
  title: string;
  status: AgentProposal['status'];
  lastTouched: string;
  ripple: string[];
}

/**
 * The bottom-of-page decision log. One quiet row per proposal that has
 * moved past PENDING. Click a row to expand the full event timeline so
 * the team can replay how a decision was reached.
 */
export const DecisionLog: React.FC<Props> = ({ proposals }) => {
  const { lang } = useLang();
  const t = T[lang];
  const [rows, setRows] = useState<LogRow[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<BaseEvent[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const interesting = proposals.filter((p) => p.status !== 'PENDING');
      const summaries = await Promise.all(
        interesting.map(async (p) => {
          try {
            const res = await fetch(`/api/esaa/events?entityId=${p.id}`);
            if (!res.ok) return null;
            const events = (await res.json()) as BaseEvent[];

            const created = events.find((e) => e.type === 'AgentProposalCreatedEvent');
            const lastStatus = [...events]
              .filter((e) => e.type === 'ProposalStatusChangedEvent')
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

            const lastTouched = lastStatus?.timestamp ?? created?.timestamp ?? new Date().toISOString();

            const psc = (created?.payload as
              | { proposedStateChange?: {
                  kpis?: Record<string, { target?: number }>;
                  risks?: Record<string, { threshold?: number; impact?: string }>;
                } }
              | undefined)?.proposedStateChange ?? {};

            const ripple: string[] = [];
            for (const [id, c] of Object.entries(psc.kpis ?? {})) {
              if (typeof c?.target === 'number') {
                ripple.push(`${labelFor(id, lang)} → ${c.target}%`);
              }
            }
            for (const [id, c] of Object.entries(psc.risks ?? {})) {
              if (typeof c?.threshold === 'number' && c.impact) {
                ripple.push(`${labelFor(id, lang)} → ${c.threshold} · ${c.impact}`);
              }
            }

            return {
              proposalId: p.id,
              title: p.title,
              status: p.status,
              lastTouched,
              ripple,
            } as LogRow;
          } catch {
            return null;
          }
        })
      );
      if (cancelled) return;
      const valid = summaries.filter((r): r is LogRow => r !== null);
      valid.sort(
        (a, b) => new Date(b.lastTouched).getTime() - new Date(a.lastTouched).getTime()
      );
      setRows(valid);
    })();
    return () => {
      cancelled = true;
    };
  }, [proposals, lang]);

  async function loadTimeline(proposalId: string) {
    if (expanded === proposalId) {
      setExpanded(null);
      setTimeline([]);
      return;
    }
    setExpanded(proposalId);
    setLoadingTimeline(true);
    try {
      const res = await fetch(`/api/esaa/events?entityId=${proposalId}`);
      if (!res.ok) {
        setTimeline([]);
        return;
      }
      const events = (await res.json()) as BaseEvent[];
      events.sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      setTimeline(events);
    } finally {
      setLoadingTimeline(false);
    }
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm" style={{ color: 'var(--text-very-muted)' }}>
        {t.log_empty}
      </p>
    );
  }

  const statusColor: Record<AgentProposal['status'], string> = {
    PENDING:           'var(--text-muted)',
    WATCHING:          '#0ea5e9',
    IN_DISCUSSION:     '#a855f7',
    AWAITING_APPROVAL: '#f97316',
    APPROVED:          '#10b981',
    REJECTED:          '#ef4444',
    DISMISSED:         'var(--text-very-muted)',
  };

  return (
    <div>
      <div
        className="grid grid-cols-12 gap-2 px-2 pb-2 text-[10px] uppercase tracking-[0.18em]"
        style={{ color: 'var(--text-very-muted)', borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="col-span-6">{t.log_col_signal}</div>
        <div className="col-span-2">{t.log_col_status}</div>
        <div className="col-span-3">{t.log_col_ripple}</div>
        <div className="col-span-1 text-right">{t.log_col_when}</div>
      </div>

      {rows.map((r) => {
        const isExpanded = expanded === r.proposalId;
        return (
          <div key={r.proposalId} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => void loadTimeline(r.proposalId)}
              className="w-full grid grid-cols-12 gap-2 px-2 py-3 text-left items-center transition-colors"
              style={{
                background: isExpanded ? 'var(--bg-surface)' : 'transparent',
              }}
            >
              <div className="col-span-6 min-w-0">
                <p className="text-sm font-medium t-primary truncate">{r.title}</p>
              </div>
              <div className="col-span-2">
                <span
                  className="text-[11px] font-medium"
                  style={{ color: statusColor[r.status] }}
                >
                  {T[lang][`status_${r.status.toLowerCase()}` as keyof (typeof T)['en']] ?? r.status}
                </span>
              </div>
              <div className="col-span-3 text-[11px] leading-tight" style={{ color: 'var(--text-secondary)' }}>
                {r.ripple.length === 0 ? (
                  <span style={{ color: 'var(--text-very-muted)' }}>{t.log_no_ripple}</span>
                ) : (
                  r.ripple.slice(0, 2).map((line, i) => (
                    <div key={i} className="truncate">{line}</div>
                  ))
                )}
              </div>
              <div
                className="col-span-1 text-right text-[10px]"
                style={{ color: 'var(--text-very-muted)' }}
              >
                {new Date(r.lastTouched).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
            </button>

            {isExpanded && (
              <div
                className="px-2 pb-4"
                style={{ background: 'var(--bg-surface)' }}
              >
                {loadingTimeline ? (
                  <p className="text-xs italic py-2" style={{ color: 'var(--text-muted)' }}>
                    {t.log_loading_timeline}
                  </p>
                ) : (
                  <ol className="space-y-1.5 pt-2">
                    {timeline.map((ev) => (
                      <li key={ev.id} className="text-xs flex gap-3 items-start">
                        <span
                          className="flex-shrink-0 font-mono text-[10px]"
                          style={{ width: '120px', color: 'var(--text-very-muted)' }}
                        >
                          {new Date(ev.timestamp).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span style={{ color: 'var(--text-body)' }}>
                          <span className="font-semibold">
                            {T[lang][`log_evt_${ev.type}` as keyof (typeof T)['en']] ?? ev.type}
                          </span>
                          {renderEventDetail(ev)}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

function renderEventDetail(ev: BaseEvent): string {
  const p = ev.payload as Record<string, unknown>;
  if (ev.type === 'ProposalStatusChangedEvent') {
    const status = String(p.newStatus ?? '');
    const actor = p.actor ? ` · ${p.actor}` : '';
    return ` → ${status}${actor}`;
  }
  if (ev.type === 'ScenarioVerificationEvent') {
    const dir = p.direction === 'OUTBOUND' ? '↗' : '↘';
    return ` ${dir} ${p.participant}: ${String(p.message ?? '').slice(0, 70)}`;
  }
  if (ev.type === 'KpiValueUpdatedEvent') {
    return ` · ${p.newValue}`;
  }
  if (ev.type === 'RiskThresholdSetEvent') {
    return ` · threshold ${p.newThreshold} · ${p.impactLevel}`;
  }
  return '';
}

export default DecisionLog;
