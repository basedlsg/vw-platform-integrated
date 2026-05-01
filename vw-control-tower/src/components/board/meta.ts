/**
 * Shared lookup tables for the Decision Board surface — pillar labels,
 * KPI / risk display names, and the lightweight helpers that turn raw
 * proposal payloads into the simplified card / workspace shape.
 */

import type { AgentProposal, BaseEvent, StrategyPillar } from '@/lib/esaa/types';

export const PILLAR_LABELS: Record<StrategyPillar, { en: string; zh: string; color: string }> = {
  MARGIN:         { en: 'Margin',        zh: '利润率',  color: '#10b981' },
  CASH:           { en: 'Cash',          zh: '现金流',  color: '#0ea5e9' },
  CHINA:          { en: 'China',         zh: '中国',    color: '#ef4444' },
  EV:             { en: 'EV',            zh: '电动车',  color: '#f97316' },
  INVENTORY:      { en: 'Inventory',     zh: '库存',    color: '#a855f7' },
  REGULATORY:     { en: 'Regulatory',    zh: '监管',    color: '#64748b' },
  SUSTAINABILITY: { en: 'Sustainability', zh: '可持续', color: '#22c55e' },
};

export const KPI_LABELS: Record<string, { en: string; zh: string; unit: string }> = {
  KPI_OP_MARGIN: { en: 'Operating margin', zh: '营业利润率', unit: '%' },
  KPI_CASH_CONV: { en: 'Cash conversion',  zh: '现金转化率', unit: '%' },
  KPI_BEV_SHARE: { en: 'EV market share',  zh: '电动车市占', unit: '%' },
};

export const RISK_LABELS: Record<string, { en: string; zh: string }> = {
  RISK_TARIFF_001:     { en: 'US tariff exposure',       zh: '美国关税敞口' },
  RISK_NEV_001:        { en: 'China share loss',         zh: '中国市占下滑' },
  RISK_STOCK_PRESSURE: { en: 'Inventory stock pressure', zh: '库存压力' },
  RISK_MARGIN_001:     { en: 'Operating margin breach',  zh: '营业利润率突破' },
};

/** A signal's view-model — the minimal slice the cards and workspace render. */
export interface SignalView {
  id: string;
  title: string;
  description: string;
  suggestedAction: string;
  status: AgentProposal['status'];
  createdAt: string;
  touches: StrategyPillar[];
  affects: string[];
  source?: { publication: string; date: string };
  proposedStateChange: ProposedStateChange;
  sensitivity?: SignalSensitivity;
}

export type ProposedStateChange = {
  kpis?: Record<string, { target?: number }>;
  risks?: Record<string, { threshold?: number; impact?: 'LOW' | 'MEDIUM' | 'HIGH' }>;
};

export type SignalSensitivity = {
  inputLabel_en: string;
  inputLabel_zh: string;
  inputUnit: string;
  inputDefault: number;
  inputMin: number;
  inputMax: number;
  inputStep: number;
  outputLabel_en: string;
  outputLabel_zh: string;
  outputUnit: string;
  outputBase: number;
  outputCoefficient: number;
};

/**
 * Pull the AgentProposalCreatedEvent for a proposal out of an event
 * stream and assemble a SignalView. Returns null if no created event
 * is found (the proposal was deleted or never created).
 */
export function buildSignalView(
  proposal: AgentProposal,
  events: BaseEvent[]
): SignalView | null {
  const created = events.find((e) => e.type === 'AgentProposalCreatedEvent');
  if (!created) return null;
  const p = created.payload as Record<string, unknown>;
  return {
    id: proposal.id,
    title: proposal.title,
    description: proposal.description,
    suggestedAction: proposal.suggestedAction,
    status: proposal.status,
    createdAt: proposal.createdAt,
    touches: ((p.touches as StrategyPillar[]) ?? []),
    affects: ((p.affects as string[]) ?? []),
    source: p.source as SignalView['source'],
    proposedStateChange: (p.proposedStateChange as ProposedStateChange) ?? {},
    sensitivity: p.sensitivity as SignalSensitivity | undefined,
  };
}

/** Resolve an entity id (KPI / risk) to a display label. */
export function labelFor(entityId: string, lang: 'en' | 'zh'): string {
  const k = KPI_LABELS[entityId];
  if (k) return k[lang];
  const r = RISK_LABELS[entityId];
  if (r) return r[lang];
  return entityId;
}

/**
 * Filter + order the proposals for the priority signal feed: only items
 * still actively in the queue (PENDING / WATCHING), newest first.
 */
export function rankSignals(proposals: AgentProposal[]): AgentProposal[] {
  return proposals
    .filter((p) => p.status === 'PENDING' || p.status === 'WATCHING')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/** Compute the simulate output: base + (input - default) × coefficient. */
export function simulateOutput(s: SignalSensitivity, input: number): number {
  return s.outputBase + (input - s.inputDefault) * s.outputCoefficient;
}
