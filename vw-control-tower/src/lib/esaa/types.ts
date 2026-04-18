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

export const AgentProposalCreatedEventSchema = z.object({
  proposalId: z.string(),
  title: z.string(),
  description: z.string(),
  suggestedAction: z.string(),
  proposedStateChange: z.record(z.string(), z.any()), // Flexible payload for proposals
});

export type AgentProposalCreatedEvent = BaseEvent & {
  type: 'AgentProposalCreatedEvent';
  payload: z.infer<typeof AgentProposalCreatedEventSchema>;
};

export const ProposalStatusChangedEventSchema = z.object({
  proposalId: z.string(),
  newStatus: z.enum(['APPROVED', 'REJECTED']),
  reviewerNote: z.string().optional(),
});

export type ProposalStatusChangedEvent = BaseEvent & {
  type: 'ProposalStatusChangedEvent';
  payload: z.infer<typeof ProposalStatusChangedEventSchema>;
};

// Union of all supported events for easier validation/handling
export const SupportedEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('KpiValueUpdatedEvent'), payload: KpiValueUpdatedEventSchema }).passthrough(),
  z.object({ type: z.literal('RiskThresholdSetEvent'), payload: RiskThresholdSetEventSchema }).passthrough(),
  z.object({ type: z.literal('AgentProposalCreatedEvent'), payload: AgentProposalCreatedEventSchema }).passthrough(),
  z.object({ type: z.literal('ProposalStatusChangedEvent'), payload: ProposalStatusChangedEventSchema }).passthrough(),
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

/** Read Model for an Agent Proposal */
export const AgentProposalSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
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
