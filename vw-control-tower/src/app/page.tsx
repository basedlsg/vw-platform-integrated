"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Shell from "@/components/Shell";
import KpiCenter from "@/components/dashboard/KpiCenter";
import Briefing from "@/components/board/Briefing";
import SignalFeed from "@/components/board/SignalFeed";
import Workspace from "@/components/board/Workspace";
import ApprovalQueue from "@/components/board/ApprovalQueue";
import DecisionLog from "@/components/board/DecisionLog";
import { rankSignals } from "@/components/board/meta";
import { useESAAStore } from "@/lib/esaa/store";
import { useLang } from "@/lib/app-context";
import { T } from "@/lib/translations";
import type { AgentProposal, BaseEvent } from "@/lib/esaa/types";

/**
 * Nemu — Finance Decision Board home screen.
 *
 * Calm one-page workflow built around the user's spec: open it, see
 * what changed, understand why, decide, move on.
 *
 *   Briefing      — 2-4 sentences, AI-streamed, anchored to state.
 *   Signal feed   — 3-5 cards with just title / touches / may affect.
 *   Approval queue — small list of items waiting on the manager.
 *   KPI strip      — three live charts.
 *   Decision log   — quiet table at the bottom, clickable to expand.
 *
 * Strategy lives in a separate tab, not on the home screen.
 */
export default function Home(): React.JSX.Element {
  const loadDomain = useESAAStore((state) => state.loadDomain);
  const isHydrated = useESAAStore((state) => state.isHydrated);
  const proposals = useESAAStore((state) => state.state.proposals);
  const { lang } = useLang();
  const t = T[lang];

  const [signalEvents, setSignalEvents] = useState<Record<string, BaseEvent[]>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [active, setActive] = useState<AgentProposal | null>(null);
  const [managerMode, setManagerMode] = useState(false);

  useEffect(() => {
    void loadDomain("VW_FINANCE_CONTROL_TOWER");
  }, [loadDomain]);

  // Pull events for each proposal so signal cards can read touches/affects.
  // Resilient: a single failed fetch becomes an empty list for that
  // proposal, the rest still render their tags.
  useEffect(() => {
    let cancelled = false;
    const ids = Object.keys(proposals);
    if (ids.length === 0) return;

    (async () => {
      const settled = await Promise.allSettled(
        ids.map(async (id) => {
          const res = await fetch(`/api/esaa/events?entityId=${id}`);
          if (!res.ok) throw new Error(`HTTP ${res.status} for ${id}`);
          return [id, (await res.json()) as BaseEvent[]] as const;
        })
      );
      if (cancelled) return;
      const map: Record<string, BaseEvent[]> = {};
      for (let i = 0; i < settled.length; i++) {
        const result = settled[i];
        if (result.status === 'fulfilled') {
          const [id, evs] = result.value;
          map[id] = evs;
        } else {
          map[ids[i]] = [];
          console.warn(`Home: signalEvents fetch skipped ${ids[i]}`, result.reason);
        }
      }
      setSignalEvents(map);
    })();

    return () => {
      cancelled = true;
    };
  }, [proposals]);

  const proposalArray = useMemo(() => Object.values(proposals), [proposals]);
  const signals = useMemo(() => rankSignals(proposalArray), [proposalArray]);
  const awaiting = useMemo(
    () => proposalArray.filter((p) => p.status === 'AWAITING_APPROVAL'),
    [proposalArray]
  );
  const inDiscussion = useMemo(
    () => proposalArray.filter((p) => p.status === 'IN_DISCUSSION'),
    [proposalArray]
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadDomain("VW_FINANCE_CONTROL_TOWER");
    } finally {
      setTimeout(() => setRefreshing(false), 400);
    }
  }, [loadDomain]);

  const handleOpenSignal = useCallback((p: AgentProposal) => {
    setManagerMode(false);
    setActive(p);
  }, []);

  const handleManagerReview = useCallback((p: AgentProposal) => {
    setManagerMode(true);
    setActive(p);
  }, []);

  const handleStatusChanged = useCallback(async () => {
    await loadDomain("VW_FINANCE_CONTROL_TOWER");
  }, [loadDomain]);

  const handleClose = useCallback(() => {
    setActive(null);
    setManagerMode(false);
    void loadDomain("VW_FINANCE_CONTROL_TOWER");
  }, [loadDomain]);

  return (
    <Shell>
      <div className="space-y-12 max-w-3xl mx-auto">
        {/* Briefing — calm 2-4 sentences */}
        <Briefing />

        {/* Signal feed */}
        <section>
          <SignalFeed
            signals={signals}
            signalEvents={signalEvents}
            isHydrated={isHydrated}
            onOpen={handleOpenSignal}
            onRefresh={() => void handleRefresh()}
            refreshing={refreshing}
          />
        </section>

        {/* Approval queue (only renders when there's actually a queue) */}
        {(awaiting.length > 0 || inDiscussion.length > 0) && (
          <section>
            <p
              className="text-[10px] uppercase tracking-[0.18em] mb-3 px-1"
              style={{ color: 'var(--text-muted)' }}
            >
              {t.queue_label}
            </p>
            <ApprovalQueue
              awaiting={awaiting}
              inDiscussion={inDiscussion}
              onReview={handleManagerReview}
            />
          </section>
        )}

        {/* KPI strip */}
        <section>
          <p
            className="text-[10px] uppercase tracking-[0.18em] mb-4 px-1"
            style={{ color: 'var(--text-muted)' }}
          >
            {t.kpi_strip_label}
          </p>
          <KpiCenter />
        </section>

        {/* Decision log */}
        <section>
          <p
            className="text-[10px] uppercase tracking-[0.18em] mb-3 px-1"
            style={{ color: 'var(--text-muted)' }}
          >
            {t.log_label}
          </p>
          <DecisionLog proposals={proposalArray} />
        </section>
      </div>

      {active && (
        <Workspace
          proposal={active}
          managerMode={managerMode}
          onClose={handleClose}
          onStatusChanged={() => void handleStatusChanged()}
        />
      )}
    </Shell>
  );
}
