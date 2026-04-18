import { z } from 'zod';
import { BaseEvent, ControlTowerState, KpiSnapshot, Risk, AgentProposal, initialControlTowerState, SupportedEvent, SupportedEventSchema } from './types';

// --- Helper Functions for State Manipulation ---

function getOrCreateKpiSnapshot(state: ControlTowerState, kpiId: string): KpiSnapshot {
  return state.kpis[kpiId] || {
    id: kpiId,
    currentValue: 0,
    threshold: 100, // Default if not set by an event
    lastUpdated: new Date(0).toISOString(),
  };
}

function getOrCreateRisk(state: ControlTowerState, riskId: string): Risk {
  return state.risks[riskId] || {
    id: riskId,
    description: `Unknown Risk: ${riskId}`,
    threshold: 100,
    impact: 'MEDIUM',
    status: 'MONITORING',
  };
}

function getOrCreateProposal(state: ControlTowerState, proposalId: string): AgentProposal {
  return state.proposals[proposalId] || {
    id: proposalId,
    title: `Unknown Proposal: ${proposalId}`,
    description: 'No description available.',
    status: 'PENDING',
    suggestedAction: 'No action suggested.',
    createdAt: new Date(0).toISOString(),
  };
}


// --- Event Handlers (Materialization Logic) ---

function applyKpiValueUpdated(state: ControlTowerState, event: Extract<SupportedEvent, { type: 'KpiValueUpdatedEvent' }> & BaseEvent): ControlTowerState {
  const { entityId: kpiId, payload: { newValue }, sequence, timestamp } = event;
  const currentKpi = getOrCreateKpiSnapshot(state, kpiId);

  const updatedKpi: KpiSnapshot = {
    ...currentKpi,
    currentValue: newValue,
    lastUpdated: timestamp,
  };

  return {
    ...state,
    kpis: {
      ...state.kpis,
      [kpiId]: updatedKpi,
    },
    globalSequence: Math.max(state.globalSequence, sequence),
  };
}

function applyRiskThresholdSet(state: ControlTowerState, event: Extract<SupportedEvent, { type: 'RiskThresholdSetEvent' }> & BaseEvent): ControlTowerState {
  const { entityId: riskId, payload: { newThreshold, impactLevel }, sequence, timestamp } = event;
  const currentRisk = getOrCreateRisk(state, riskId);

  // Logic to determine status change based on new threshold vs current value (which we don't have easily here, relying on external context or other events)
  // For now, we only set the threshold and assume status is MONITORED unless an explicit status event arrives.
  const updatedRisk: Risk = {
    ...currentRisk,
    threshold: newThreshold,
    impact: impactLevel,
    // Status remains as is unless explicitly set by another event type
  };

  return {
    ...state,
    risks: {
      ...state.risks,
      [riskId]: updatedRisk,
    },
    globalSequence: Math.max(state.globalSequence, sequence),
  };
}

function applyAgentProposalCreated(state: ControlTowerState, event: Extract<SupportedEvent, { type: 'AgentProposalCreatedEvent' }> & BaseEvent): ControlTowerState {
  const { entityId: proposalId, payload, sequence, timestamp } = event;
  const currentProposal = getOrCreateProposal(state, proposalId);

  const updatedProposal: AgentProposal = {
    id: proposalId,
    title: payload.title,
    description: payload.description,
    suggestedAction: payload.suggestedAction,
    createdAt: currentProposal.createdAt === initialControlTowerState.proposals[proposalId]?.createdAt ? timestamp : currentProposal.createdAt, // Keep original creation time if already set
    status: 'PENDING', // Proposals start as PENDING on creation event
  };

  return {
    ...state,
    proposals: {
      ...state.proposals,
      [proposalId]: updatedProposal,
    },
    globalSequence: Math.max(state.globalSequence, sequence),
  };
}

function applyProposalStatusChanged(state: ControlTowerState, event: Extract<SupportedEvent, { type: 'ProposalStatusChangedEvent' }> & BaseEvent): ControlTowerState {
  const { entityId: proposalId, payload: { newStatus }, sequence } = event;
  const current = getOrCreateProposal(state, proposalId);

  return {
    ...state,
    proposals: {
      ...state.proposals,
      [proposalId]: { ...current, status: newStatus },
    },
    globalSequence: Math.max(state.globalSequence, sequence),
  };
}

// --- MAIN PROJECTION FUNCTION ---

/**
 * Materializes the full ControlTowerState from an array of events.
 * Events MUST be ordered chronologically and by sequence number for correct projection.
 * @param events An array of validated BaseEvents.
 * @returns The calculated ControlTowerState.
 */
export function materialize(events: BaseEvent[]): ControlTowerState {
  let state: ControlTowerState = initialControlTowerState;

  // Sort events to ensure correct order, especially when applying to the same entity in one batch.
  const sortedEvents = [...events].sort((a, b) => {
    if (a.entityId !== b.entityId) {
        // Cannot reliably sort across entities, rely on sequence for events on the same entity
        return 0;
    }
    return a.sequence - b.sequence;
  });

  for (const event of sortedEvents) {
    // Validate event type again to ensure we have the correct structural types for handlers
    const validationResult = SupportedEventSchema.safeParse(event);
    if (!validationResult.success) {
        console.warn(`Skipping unhandled or invalid event during materialization: ${event.type} (${event.id})`);
        continue;
    }
    const typedEvent = validationResult.data;
    
    // Apply event based on entity type
    switch (typedEvent.entityType) {
      case 'KPI':
        if (typedEvent.type === 'KpiValueUpdatedEvent') {
          state = applyKpiValueUpdated(state, typedEvent as unknown as Extract<SupportedEvent, { type: 'KpiValueUpdatedEvent' }> & BaseEvent);
        }
        break;

      case 'RISK':
        if (typedEvent.type === 'RiskThresholdSetEvent') {
          state = applyRiskThresholdSet(state, typedEvent as unknown as Extract<SupportedEvent, { type: 'RiskThresholdSetEvent' }> & BaseEvent);
        }
        break;

      case 'PROPOSAL':
        if (typedEvent.type === 'AgentProposalCreatedEvent') {
          state = applyAgentProposalCreated(state, typedEvent as unknown as Extract<SupportedEvent, { type: 'AgentProposalCreatedEvent' }> & BaseEvent);
        } else if (typedEvent.type === 'ProposalStatusChangedEvent') {
          state = applyProposalStatusChanged(state, typedEvent as unknown as Extract<SupportedEvent, { type: 'ProposalStatusChangedEvent' }> & BaseEvent);
        }
        break;
        
      default:
        // Ignore unknown entity types or events not explicitly handled
        break;
    }
  }

  return state;
}
