'use client';

import React from 'react';
import { useLang } from '@/lib/app-context';
import { T } from '@/lib/translations';
import type { AgentProposal, BaseEvent, StrategyPillar } from '@/lib/esaa/types';
import { PILLAR_LABELS, KPI_LABELS, RISK_LABELS } from './meta';

interface Props {
  signals: AgentProposal[];
  /** Map of proposalId → its event stream so the card can read touches/affects. */
  signalEvents: Record<string, BaseEvent[]>;
  onOpen: (proposal: AgentProposal) => void;
  isHydrated: boolean;
  onRefresh: () => void;
  refreshing: boolean;
}

/**
 * The priority signal feed. Renders a thin column of clickable cards.
 * Nothing decorative — title, the priority pillars it touches, the
 * KPIs/risks it could affect, an open arrow. That's it.
 */
export const SignalFeed: React.FC<Props> = ({
  signals,
  signalEvents,
  onOpen,
  isHydrated,
  onRefresh,
  refreshing,
}) => {
  const { lang } = useLang();
  const t = T[lang];

  if (!isHydrated) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-20 rounded-xl animate-pulse"
            style={{ background: 'var(--border-subtle)' }}
          />
        ))}
      </div>
    );
  }

  if (signals.length === 0) {
    return (
      <div className="px-1 py-8 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
        {t.signals_empty}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-1">
        <p
          className="text-[10px] uppercase tracking-[0.18em]"
          style={{ color: 'var(--text-muted)' }}
        >
          {t.signals_label}
        </p>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1 text-xs font-medium disabled:opacity-40 transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          <span
            className={`material-symbols-outlined ${refreshing ? 'animate-spin' : ''}`}
            style={{ fontSize: '13px' }}
          >
            refresh
          </span>
          {refreshing ? t.signals_refreshing : t.signals_refresh}
        </button>
      </div>

      <div className="space-y-2">
        {signals.slice(0, 5).map((s) => (
          <SignalCard
            key={s.id}
            signal={s}
            events={signalEvents[s.id] ?? []}
            onClick={() => onOpen(s)}
          />
        ))}
      </div>
    </div>
  );
};

interface CardProps {
  signal: AgentProposal;
  events: BaseEvent[];
  onClick: () => void;
}

const SignalCard: React.FC<CardProps> = ({ signal, events, onClick }) => {
  const { lang } = useLang();
  const t = T[lang];

  const created = events.find((e) => e.type === 'AgentProposalCreatedEvent');
  const payload = (created?.payload as Record<string, unknown>) ?? {};
  const touches = (payload.touches as StrategyPillar[]) ?? [];
  const affects = (payload.affects as string[]) ?? [];

  const affectLabels = affects.map((id) => {
    const k = KPI_LABELS[id];
    if (k) return k[lang];
    const r = RISK_LABELS[id];
    if (r) return r[lang];
    return id;
  });

  const isWatching = signal.status === 'WATCHING';

  return (
    <button
      onClick={onClick}
      className="glass-card glass-card-interactive w-full text-left rounded-xl px-4 py-3.5 transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold t-primary leading-snug mb-2 truncate">
            {signal.title}
          </p>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {touches.length > 0 && (
              <div className="inline-flex items-center gap-1.5">
                <span style={{ color: 'var(--text-very-muted)' }}>{t.signal_touches}:</span>
                {touches.map((p) => {
                  const label = PILLAR_LABELS[p];
                  if (!label) return null;
                  return (
                    <span
                      key={p}
                      className="font-medium"
                      style={{ color: label.color }}
                    >
                      {label[lang]}
                    </span>
                  );
                })}
              </div>
            )}
            {affectLabels.length > 0 && (
              <div className="inline-flex items-center gap-1.5">
                <span style={{ color: 'var(--text-very-muted)' }}>{t.signal_may_affect}:</span>
                <span style={{ color: 'var(--text-secondary)' }}>{affectLabels.join(' · ')}</span>
              </div>
            )}
            {isWatching && (
              <span
                className="inline-flex items-center gap-1 font-semibold"
                style={{ color: '#0ea5e9' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>visibility</span>
                {t.status_watching}
              </span>
            )}
          </div>
        </div>

        <span
          className="material-symbols-outlined flex-shrink-0 mt-0.5"
          style={{ fontSize: '18px', color: 'var(--text-very-muted)' }}
        >
          arrow_forward
        </span>
      </div>
    </button>
  );
};

export default SignalFeed;
