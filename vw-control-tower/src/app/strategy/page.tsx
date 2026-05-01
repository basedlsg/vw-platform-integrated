"use client";

import React, { useEffect, useMemo, useState } from "react";
import Shell from "@/components/Shell";
import { useESAAStore } from "@/lib/esaa/store";
import { useLang } from "@/lib/app-context";
import { T } from "@/lib/translations";
import { PILLAR_LABELS } from "@/components/board/meta";
import type { AgentProposal, BaseEvent, StrategyPillar } from "@/lib/esaa/types";

interface PillarMeta {
  id: StrategyPillar;
  icon: string;
  /** One-sentence explanation of what this pillar means for VW. */
  rationale_en: string;
  rationale_zh: string;
}

const PILLAR_META: PillarMeta[] = [
  { id: 'MARGIN',         icon: 'trending_up',
    rationale_en: 'Get back to a 6%+ operating margin by FY2026 — protect the bottom line of every euro of revenue after operating cost.',
    rationale_zh: '到 FY2026 重新回到 6%+ 营业利润率 —— 在每欧元营收的底线层面保住盈利能力。' },
  { id: 'CASH',           icon: 'account_balance_wallet',
    rationale_en: 'Lift cash conversion back above 70% so capex on EV platforms and gigafactories is funded organically.',
    rationale_zh: '把现金转化率拉回 70% 以上，让电动车平台和电池厂的资本开支通过自有现金流支撑。' },
  { id: 'CHINA',          icon: 'public',
    rationale_en: 'Defend the China position. Restore cost parity with local OEMs (BYD, Geely, XPENG) within the joint-venture footprint.',
    rationale_zh: '保住中国阵地。在合资框架内对本土厂商（比亚迪、吉利、小鹏）实现成本平价。' },
  { id: 'EV',             icon: 'bolt',
    rationale_en: 'Grow EV share toward 20%+ of group deliveries while keeping the contribution margin from going negative.',
    rationale_zh: '把纯电动车占比向集团交付的 20%+ 推进，同时保持产品贡献利润不转为负值。' },
  { id: 'INVENTORY',      icon: 'inventory_2',
    rationale_en: 'Keep working capital under control. Avoid a repeat of the 2023 BEV inventory build that pressured cash.',
    rationale_zh: '管控运营资金。避免再次出现 2023 年 BEV 库存堆积挤压现金流的情况。' },
  { id: 'REGULATORY',     icon: 'gavel',
    rationale_en: 'Insulate the group from tariff shocks. Maintain optionality for USMCA-routed production and Chinese-market policy shifts.',
    rationale_zh: '降低关税冲击敞口。在 USMCA 路径生产与中国政策变动间保持灵活性。' },
  { id: 'SUSTAINABILITY', icon: 'eco',
    rationale_en: 'Stay credibly aligned with the EU 2035 ICE phase-out and supplier sustainability standards already promised to the board.',
    rationale_zh: '与欧盟 2035 内燃机退出节奏，以及已向董事会承诺的供应商可持续性标准保持一致。' },
];

/**
 * Strategy page — separate from the home Decision Board. Lays out
 * what VW is optimizing for, in plain English, with a quiet count of
 * how many active decisions are touching each pillar so the team can
 * see at a glance where attention is concentrated.
 */
export default function Strategy(): React.JSX.Element {
  const loadDomain = useESAAStore((s) => s.loadDomain);
  const proposals = useESAAStore((s) => s.state.proposals);
  const { lang } = useLang();
  const t = T[lang];

  const [signalEvents, setSignalEvents] = useState<Record<string, BaseEvent[]>>({});

  useEffect(() => {
    void loadDomain('VW_FINANCE_CONTROL_TOWER');
  }, [loadDomain]);

  // Pull events for every proposal so we can read each one's `touches` array.
  // Resilient: a single failed fetch becomes an empty list for that
  // proposal, the rest still render their pillar tallies.
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
          console.warn(`Strategy: signalEvents fetch skipped ${ids[i]}`, result.reason);
        }
      }
      setSignalEvents(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [proposals]);

  // Tally how many active proposals touch each pillar.
  const pillarCounts = useMemo(() => {
    const counts: Record<StrategyPillar, number> = {
      MARGIN: 0, CASH: 0, CHINA: 0, EV: 0,
      INVENTORY: 0, REGULATORY: 0, SUSTAINABILITY: 0,
    };
    for (const p of Object.values(proposals)) {
      // Only count active items — pending/watching/in_discussion/awaiting.
      if (p.status === 'APPROVED' || p.status === 'REJECTED' || p.status === 'DISMISSED') continue;
      const created = signalEvents[p.id]?.find((e) => e.type === 'AgentProposalCreatedEvent');
      const touches = (created?.payload as { touches?: StrategyPillar[] } | undefined)?.touches ?? [];
      for (const pillar of touches) {
        counts[pillar] = (counts[pillar] ?? 0) + 1;
      }
    }
    return counts;
  }, [proposals, signalEvents]);

  // For each pillar, collect the active proposals touching it.
  const pillarSignals = useMemo(() => {
    const map: Record<StrategyPillar, AgentProposal[]> = {
      MARGIN: [], CASH: [], CHINA: [], EV: [],
      INVENTORY: [], REGULATORY: [], SUSTAINABILITY: [],
    };
    for (const p of Object.values(proposals)) {
      if (p.status === 'APPROVED' || p.status === 'REJECTED' || p.status === 'DISMISSED') continue;
      const created = signalEvents[p.id]?.find((e) => e.type === 'AgentProposalCreatedEvent');
      const touches = (created?.payload as { touches?: StrategyPillar[] } | undefined)?.touches ?? [];
      for (const pillar of touches) {
        map[pillar].push(p);
      }
    }
    return map;
  }, [proposals, signalEvents]);

  return (
    <Shell>
      <div className="space-y-12 max-w-3xl mx-auto">
        <header>
          <p
            className="text-[10px] uppercase tracking-[0.18em] mb-3"
            style={{ color: 'var(--text-muted)' }}
          >
            {t.strategy_label}
          </p>
          <h1 className="text-2xl font-semibold t-primary leading-tight">
            {t.strategy_title}
          </h1>
          <p className="text-sm mt-3 leading-relaxed" style={{ color: 'var(--text-body)', maxWidth: '60ch' }}>
            {t.strategy_intro}
          </p>
        </header>

        <section className="space-y-6">
          {PILLAR_META.map((meta) => {
            const lbl = PILLAR_LABELS[meta.id];
            const count = pillarCounts[meta.id];
            const signals = pillarSignals[meta.id];
            return (
              <div
                key={meta.id}
                className="glass-surface rounded-xl p-5"
                style={{ borderLeft: `2px solid ${lbl.color}` }}
              >
                <div className="flex items-start gap-4">
                  <span
                    className="material-symbols-outlined flex-shrink-0 mt-0.5"
                    style={{ fontSize: '20px', color: lbl.color }}
                  >
                    {meta.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <h3 className="text-base font-semibold t-primary">{lbl[lang]}</h3>
                      {count > 0 ? (
                        <p
                          className="text-[11px] font-medium"
                          style={{ color: lbl.color }}
                        >
                          {count} {count === 1 ? t.strategy_active_signal_singular : t.strategy_active_signal_plural}
                        </p>
                      ) : (
                        <p className="text-[11px]" style={{ color: 'var(--text-very-muted)' }}>
                          {t.strategy_no_signals}
                        </p>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-body)' }}>
                      {lang === 'zh' ? meta.rationale_zh : meta.rationale_en}
                    </p>
                    {signals.length > 0 && (
                      <ul className="mt-3 space-y-1">
                        {signals.map((s) => (
                          <li
                            key={s.id}
                            className="text-xs truncate"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            <span className="opacity-50 mr-2">·</span>
                            {s.title}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <p
          className="text-xs italic"
          style={{ color: 'var(--text-very-muted)' }}
        >
          {t.strategy_footnote}
        </p>
      </div>
    </Shell>
  );
}
