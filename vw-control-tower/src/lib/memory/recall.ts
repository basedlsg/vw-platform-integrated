/**
 * Institutional memory — surface past decisions that overlap with the
 * current signal so the AI narration layer (Briefing, Why-it-matters,
 * Discuss reply) can reason against history, not just the snapshot.
 *
 * Implementation note: this is the "small fix" version. We score
 * relevance by counting overlap on the strategy pillars a signal
 * touches and the KPIs / risks it affects, then break ties by
 * recency. No embeddings, no Weaviate, no Neo4j — just a single SQL
 * scan over the existing PROPOSAL events. When the signal volume
 * outgrows that (months to years away), swap the score function for
 * pgvector cosine similarity on stored embeddings.
 */

import {
  fetchAllEventsByEntityType,
  fetchAllEventsForEntity,
} from '@/lib/esaa/event-store';
import type { BaseEvent } from '@/lib/esaa/types';

export type StrategyPillar =
  | 'MARGIN'
  | 'CASH'
  | 'CHINA'
  | 'EV'
  | 'INVENTORY'
  | 'REGULATORY'
  | 'SUSTAINABILITY';

export type ClosedStatus = 'APPROVED' | 'REJECTED' | 'DISMISSED';

export interface RecalledDecision {
  proposalId: string;
  title: string;
  description: string;
  /** Closed-state status — APPROVED / REJECTED / DISMISSED. */
  status: ClosedStatus;
  /** ISO timestamp of when the decision was last touched. */
  decidedAt: string;
  /** Pillars this signal touched. */
  touches: StrategyPillar[];
  /** KPI / risk ids this signal affects. */
  affects: string[];
  /**
   * Brief plain-text summary of what changed when this proposal was
   * approved (KPI targets, risk thresholds). Empty for non-APPROVED.
   */
  rippleSummary: string;
  /**
   * Number of verification messages logged on this proposal. A rough
   * proxy for "did the team actually debate this or rubber-stamp it."
   */
  verificationCount: number;
  /** 0–1 relevance score against the query — higher is more relevant. */
  score: number;
}

interface RecallQuery {
  /** Pillars the current signal touches. */
  touches?: StrategyPillar[];
  /** KPI / risk ids the current signal could affect. */
  affects?: string[];
  /** Optional id to exclude (e.g. don't return the current signal itself). */
  excludeProposalId?: string;
  /** Hard cap on the number of results returned. Defaults to 5. */
  limit?: number;
}

const HALF_LIFE_DAYS = 90; // recency weighting decays with this half-life
const PILLAR_WEIGHT = 1.0;
const AFFECTS_WEIGHT = 1.5; // matching the same KPI / risk is stronger signal
const STATUS_BIAS: Record<ClosedStatus, number> = {
  APPROVED: 1.0, // approved decisions are most informative
  REJECTED: 0.7,
  DISMISSED: 0.5,
};

/**
 * Walk the PROPOSAL event stream and return the past decisions most
 * relevant to the current signal. Decisions still in flight (PENDING /
 * WATCHING / IN_DISCUSSION / AWAITING_APPROVAL) are excluded — only
 * closed-state proposals contribute to institutional memory.
 */
export async function recallRelevantDecisions(
  q: RecallQuery
): Promise<RecalledDecision[]> {
  const limit = q.limit ?? 5;
  const queryPillars = new Set(q.touches ?? []);
  const queryAffects = new Set(q.affects ?? []);

  // Fetch all proposal-stream events at once. This is currently fine
  // (a few tens of proposals); when it grows, push the filter into
  // Supabase as a SQL where-clause.
  const allEvents = await fetchAllEventsByEntityType('PROPOSAL');

  // Group events by proposalId.
  const byProposal = new Map<string, BaseEvent[]>();
  for (const ev of allEvents) {
    const id = String(ev.entityId);
    const arr = byProposal.get(id) ?? [];
    arr.push(ev);
    byProposal.set(id, arr);
  }

  const candidates: RecalledDecision[] = [];
  const now = Date.now();

  for (const [proposalId, events] of byProposal.entries()) {
    if (proposalId === q.excludeProposalId) continue;

    const created = events.find((e) => e.type === 'AgentProposalCreatedEvent');
    if (!created) continue;

    // Latest status change wins. Skip if still in flight.
    const statusEvents = events
      .filter((e) => e.type === 'ProposalStatusChangedEvent')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const latestStatus = statusEvents[0]?.payload as
      | { newStatus?: string }
      | undefined;
    const status = latestStatus?.newStatus;
    if (status !== 'APPROVED' && status !== 'REJECTED' && status !== 'DISMISSED') {
      continue;
    }

    const payload = created.payload as {
      title?: string;
      description?: string;
      touches?: StrategyPillar[];
      affects?: string[];
      proposedStateChange?: {
        kpis?: Record<string, { target?: number }>;
        risks?: Record<string, { threshold?: number; impact?: string }>;
      };
    };

    const touches: StrategyPillar[] = payload.touches ?? [];
    const affects: string[] = payload.affects ?? [];

    // Score: pillar overlap + affects overlap, status bias, recency decay.
    const pillarOverlap = touches.filter((p) => queryPillars.has(p)).length;
    const affectsOverlap = affects.filter((a) => queryAffects.has(a)).length;
    const rawOverlap =
      pillarOverlap * PILLAR_WEIGHT + affectsOverlap * AFFECTS_WEIGHT;
    if (rawOverlap === 0) continue; // no overlap = not relevant

    const decidedAt = statusEvents[0]?.timestamp ?? created.timestamp;
    const ageDays = Math.max(
      0,
      (now - new Date(decidedAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    const recencyFactor = Math.pow(0.5, ageDays / HALF_LIFE_DAYS);
    const statusFactor = STATUS_BIAS[status as ClosedStatus];
    const score = rawOverlap * recencyFactor * statusFactor;

    // Brief ripple summary — what changed when this was approved.
    const rippleParts: string[] = [];
    if (status === 'APPROVED') {
      for (const [kpiId, change] of Object.entries(
        payload.proposedStateChange?.kpis ?? {}
      )) {
        if (typeof change?.target === 'number') {
          rippleParts.push(`${kpiId} → ${change.target}`);
        }
      }
      for (const [riskId, change] of Object.entries(
        payload.proposedStateChange?.risks ?? {}
      )) {
        if (typeof change?.threshold === 'number' && change.impact) {
          rippleParts.push(
            `${riskId} → threshold ${change.threshold} · ${change.impact}`
          );
        }
      }
    }
    const rippleSummary = rippleParts.join('; ');

    const verificationCount = events.filter(
      (e) => e.type === 'ScenarioVerificationEvent'
    ).length;

    candidates.push({
      proposalId,
      title: payload.title ?? proposalId,
      description: payload.description ?? '',
      status: status as ClosedStatus,
      decidedAt,
      touches,
      affects,
      rippleSummary,
      verificationCount,
      score,
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, limit);
}

/**
 * Convenience: format a list of recalled decisions as a short prose
 * block ready to be included in an LLM context. Empty string if no
 * results so the caller can simply concat without a separator dance.
 */
export function formatRecallForPrompt(
  recalls: RecalledDecision[],
  lang: 'en' | 'zh' = 'en'
): string {
  if (recalls.length === 0) return '';

  const header =
    lang === 'zh'
      ? '过去同类决策（按相关性排序，仅供参考，不要捏造细节）：'
      : 'Past decisions on related signals (relevance-ranked, do not invent details):';

  const lines = recalls.map((r) => {
    const date = new Date(r.decidedAt).toISOString().slice(0, 10);
    const ripple = r.rippleSummary ? ` — ripple: ${r.rippleSummary}` : '';
    const verif =
      r.verificationCount > 0
        ? ` — ${r.verificationCount} verification message${r.verificationCount === 1 ? '' : 's'}`
        : '';
    return `- [${date}] ${r.title} → ${r.status}${ripple}${verif}`;
  });

  return [header, ...lines].join('\n');
}

/**
 * Helper: pull `touches` and `affects` from a single proposal's
 * created event so the caller doesn't have to parse it themselves.
 */
export async function readSignalContext(
  proposalId: string
): Promise<{ touches: StrategyPillar[]; affects: string[] } | null> {
  const events = await fetchAllEventsForEntity(proposalId);
  const created = events.find((e) => e.type === 'AgentProposalCreatedEvent');
  if (!created) return null;
  const p = created.payload as {
    touches?: StrategyPillar[];
    affects?: string[];
  };
  return {
    touches: p.touches ?? [],
    affects: p.affects ?? [],
  };
}
