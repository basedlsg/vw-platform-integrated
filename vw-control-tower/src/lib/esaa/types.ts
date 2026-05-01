import { z } from 'zod';

// --- Event Types ---

/** Base interface for all ESAA events */
export interface BaseEvent {
  id: string; // UUID of the event
  entityId: string; // ID of the entity this event applies to (e.g., 'KPI_A')
  entityType: 'KPI' | 'RISK' | 'PROPOSAL'; // Type of entity
  type: string; // Specific event name (e.g., 'KpiValueUpdatedEvent')
  sequence: number; // Monotonically increasing sequence number for the entityId
  timestamp: string; // ISO 8601 timestamp
  payload: unknown; // Raw event data
}

// --- Specific Events ---

export const KpiValueUpdatedEventSchema = z.object({
  kpiId: z.string(),
  newValue: z.number(),
  reason: z.string().optional(),
});

export type KpiValueUpdatedEvent = BaseEvent & {
  type: 'KpiValueUpdatedEvent';
  payload: z.infer<typeof KpiValueUpdatedEventSchema>;
};

export const RiskThresholdSetEventSchema = z.object({
  riskId: z.string(),
  newThreshold: z.number(),
  impactLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']),
});

export type RiskThresholdSetEvent = BaseEvent & {
  type: 'RiskThresholdSetEvent';
  payload: z.infer<typeof RiskThresholdSetEventSchema>;
};

/**
 * Strategy pillars a signal can touch. Mirrors the priorities the
 * CFO office is currently optimizing for. Hardcoded for now; could
 * later be driven by a separate strategy event stream.
 */
export const StrategyPillarSchema = z.enum([
  'MARGIN',
  'CASH',
  'CHINA',
  'EV',
  'INVENTORY',
  'REGULATORY',
  'SUSTAINABILITY',
]);
export type StrategyPillar = z.infer<typeof StrategyPillarSchema>;

/**
 * Lightweight sensitivity model attached to a signal so the analyst
 * can run a simple what-if without leaving the workspace. Output =
 * outputBase + (input - inputDefault) * outputCoefficient.
 *
 * This is intentionally tiny — one slider in, one number out. The
 * point is to give the team a feel for the order of magnitude, not
 * to replace a real driver model.
 */
export const SignalSensitivitySchema = z.object({
  inputLabel_en: z.string(),
  inputLabel_zh: z.string(),
  inputUnit: z.string(),
  inputDefault: z.number(),
  inputMin: z.number(),
  inputMax: z.number(),
  inputStep: z.number(),
  outputLabel_en: z.string(),
  outputLabel_zh: z.string(),
  outputUnit: z.string(),
  outputBase: z.number(),
  outputCoefficient: z.number(),
});
export type SignalSensitivity = z.infer<typeof SignalSensitivitySchema>;

export const AgentProposalCreatedEventSchema = z.object({
  proposalId: z.string(),
  title: z.string(),
  description: z.string(),
  suggestedAction: z.string(),
  /** Flexible payload — the canonical "if approved, change X to Y" instructions. */
  proposedStateChange: z.record(z.string(), z.any()),
  /** Strategy pillars this signal touches; drives the "Touches:" tags on a card. */
  touches: z.array(StrategyPillarSchema).optional(),
  /** KPI / risk ids this signal could affect; drives the "May affect:" line. */
  affects: z.array(z.string()).optional(),
  /** Where the signal came from. */
  source: z
    .object({ publication: z.string(), date: z.string() })
    .optional(),
  /** Lightweight what-if model for the workspace's Simulate panel. */
  sensitivity: SignalSensitivitySchema.optional(),
});

export type AgentProposalCreatedEvent = BaseEvent & {
  type: 'AgentProposalCreatedEvent';
  payload: z.infer<typeof AgentProposalCreatedEventSchema>;
};

/**
 * Full proposal lifecycle. Each value is a step in the Decision Board:
 *   PENDING            — signal arrived, no analyst action yet
 *   WATCHING           — analyst is tracking it, no scenario filed yet
 *   IN_DISCUSSION      — analyst sent it out for team verification
 *   AWAITING_APPROVAL  — discussion done, sent up to the manager
 *   APPROVED           — manager approved, ripples committed to KPIs/risks
 *   REJECTED           — manager rejected
 *   DISMISSED          — analyst closed it without escalating
 *
 * Only the APPROVED transition writes the cascading KPI/risk events.
 * Every other status change is logged-only — planning numbers don't move.
 */
export const ProposalStatusChangedEventSchema = z.object({
  proposalId: z.string(),
  newStatus: z.enum([
    'PENDING',
    'WATCHING',
    'IN_DISCUSSION',
    'AWAITING_APPROVAL',
    'APPROVED',
    'REJECTED',
    'DISMISSED',
  ]),
  reviewerNote: z.string().optional(),
  /** Free-form actor label — e.g. "FP&A Analyst", "CFO Office". */
  actor: z.string().optional(),
});

export type ProposalStatusChangedEvent = BaseEvent & {
  type: 'ProposalStatusChangedEvent';
  payload: z.infer<typeof ProposalStatusChangedEventSchema>;
};

/**
 * One message attached to a scenario's discussion thread. Records the
 * round-trip with a stakeholder so the audit log can replay who said
 * what before a decision was reached.
 */
export const ScenarioVerificationEventSchema = z.object({
  proposalId: z.string(),
  /** 'OUTBOUND' = analyst asks; 'INBOUND' = stakeholder responds. */
  direction: z.enum(['OUTBOUND', 'INBOUND']),
  participant: z.string(),
  message: z.string(),
});

export type ScenarioVerificationEvent = BaseEvent & {
  type: 'ScenarioVerificationEvent';
  payload: z.infer<typeof ScenarioVerificationEventSchema>;
};

// Union of all supported events for easier validation/handling
export const SupportedEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('KpiValueUpdatedEvent'), payload: KpiValueUpdatedEventSchema }).passthrough(),
  z.object({ type: z.literal('RiskThresholdSetEvent'), payload: RiskThresholdSetEventSchema }).passthrough(),
  z.object({ type: z.literal('AgentProposalCreatedEvent'), payload: AgentProposalCreatedEventSchema }).passthrough(),
  z.object({ type: z.literal('ProposalStatusChangedEvent'), payload: ProposalStatusChangedEventSchema }).passthrough(),
  z.object({ type: z.literal('ScenarioVerificationEvent'), payload: ScenarioVerificationEventSchema }).passthrough(),
]);

export type SupportedEvent = z.infer<typeof SupportedEventSchema>;


// --- Read Models (Snapshots) ---

/** Read Model for a single KPI */
export const KpiSnapshotSchema = z.object({
  id: z.string(), // e.g., 'KPI_A'
  currentValue: z.number(),
  threshold: z.number().default(100), // Default threshold
  lastUpdated: z.string(), // ISO timestamp
});

export type KpiSnapshot = z.infer<typeof KpiSnapshotSchema>;

/** Read Model for a single Risk */
export const RiskSchema = z.object({
  id: z.string(), // e.g., 'RISK_FIN_001'
  description: z.string(),
  threshold: z.number(),
  impact: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  status: z.enum(['MONITORING', 'BREACHED', 'MITIGATED']),
});

export type Risk = z.infer<typeof RiskSchema>;

/** Read Model for an Agent Proposal / Scenario */
export const AgentProposalSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.enum([
    'PENDING',
    'WATCHING',
    'IN_DISCUSSION',
    'AWAITING_APPROVAL',
    'APPROVED',
    'REJECTED',
    'DISMISSED',
  ]),
  suggestedAction: z.string(),
  createdAt: z.string(), // ISO timestamp
});

export type AgentProposal = z.infer<typeof AgentProposalSchema>;


// --- Aggregate State ---

/** The complete state of the Control Tower */
export interface ControlTowerState {
  kpis: Record<string, KpiSnapshot>;
  risks: Record<string, Risk>;
  proposals: Record<string, AgentProposal>;
  // Global sequence number for overall state projection, useful for concurrency control
  globalSequence: number;
}

// Initial state definition for Zustand initialization
export const initialControlTowerState: ControlTowerState = {
  kpis: {},
  risks: {},
  proposals: {},
  globalSequence: 0,
};
