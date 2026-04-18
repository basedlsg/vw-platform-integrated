import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { BaseEvent, ControlTowerState, SupportedEventSchema, initialControlTowerState } from './types';
import { materialize } from './materializer';
import { fetchAllEventsForEntity } from './event-store';

// --- Store Definition ---

interface ESAAStore {
  state: ControlTowerState;
  isHydrated: boolean;
  initializeStateFromEvents: (events: BaseEvent[]) => Promise<void>;
  applyEvent: (event: BaseEvent) => Promise<void>;
  loadDomain: (domainId: string) => Promise<void>;
}

export const useESAAStore = create<ESAAStore>()(
  persist(
    immer((set, get) => ({
      state: initialControlTowerState,
      isHydrated: false,

      /**
       * Initializes or rehydrates the store state by projecting a list of events.
       * This simulates loading historical data from Supabase upon application start.
       * @param events The list of events to process.
       */
      initializeStateFromEvents: async (events: BaseEvent[]) => {
        const newState = materialize(events);

        set((state) => {
          state.state = newState;
          state.isHydrated = true;
        });
      },

      /**
       * Applies a single event to the state by running it through the materializer, 
       * assuming the event has already been successfully persisted (e.g., via appendEvent outside the store).
       * This implements the incremental state update.
       * @param event The event to apply.
       */
      applyEvent: async (event: BaseEvent) => {
        const validationResult = SupportedEventSchema.safeParse(event);
        if (!validationResult.success) {
            console.error(`Store: Invalid event received for application: ${event.type}`, validationResult.error.issues);
            return; // Do not update state if event is invalid
        }
        const typedEvent = validationResult.data;
        
        set((draft) => {
            // Incremental update logic, mirroring materializer handlers but operating on `draft.state`.
            
            switch (typedEvent.entityType) {
                case 'KPI':
                    if (typedEvent.type === 'KpiValueUpdatedEvent') {
                        const kpiId = String(typedEvent.entityId);
                        // We rely on materialize's getOrCreate logic implicitly by merging
                        draft.state.kpis[kpiId] = {
                            ...(draft.state.kpis[kpiId] || {}),
                            currentValue: typedEvent.payload.newValue,
                            lastUpdated: String(typedEvent.timestamp),
                        };
                    }
                    break;
                case 'RISK':
                    if (typedEvent.type === 'RiskThresholdSetEvent') {
                        const riskId = String(typedEvent.entityId);
                        draft.state.risks[riskId] = {
                            ...(draft.state.risks[riskId] || {}),
                            threshold: typedEvent.payload.newThreshold,
                            impact: typedEvent.payload.impactLevel,
                        };
                    }
                    break;
                case 'PROPOSAL':
                    if (typedEvent.type === 'AgentProposalCreatedEvent') {
                         const proposalId = String(typedEvent.entityId);
                        draft.state.proposals[proposalId] = {
                            ...(draft.state.proposals[proposalId] || {}),
                            title: typedEvent.payload.title,
                            description: typedEvent.payload.description,
                            suggestedAction: typedEvent.payload.suggestedAction,
                            createdAt: String(typedEvent.timestamp),
                            status: 'PENDING',
                        };
                    } else if (typedEvent.type === 'ProposalStatusChangedEvent') {
                        const pid = String(typedEvent.entityId);
                        draft.state.proposals[pid] = {
                            ...(draft.state.proposals[pid] || {}),
                            status: typedEvent.payload.newStatus,
                        };
                    }
                    break;
            }
            draft.state.globalSequence = Math.max(Number(draft.state.globalSequence) || 0, Number(typedEvent.sequence) || 0);
        });

      },

      /**
       * Stub function to simulate loading events from Supabase and hydrating the store.
       * @param domainId The ID of the domain to load (e.g., 'VW_FINANCE_CONTROL_TOWER').
       */
      loadDomain: async (_domainId: string) => {
        set({ isHydrated: false });

        const entityIds = [
          'KPI_OP_MARGIN', 'KPI_CASH_CONV', 'KPI_BEV_SHARE',
          'RISK_TARIFF_001', 'RISK_NEV_001', 'PROP_MARGIN_REC_001',
        ];

        try {
          const results = await Promise.all(
            entityIds.map(async (id) => {
              const res = await fetch(`/api/esaa/events?entityId=${id}`);
              if (!res.ok) throw new Error(`Failed to fetch events for ${id}`);
              return res.json();
            })
          );
          await get().initializeStateFromEvents(results.flat());
        } catch (error) {
          console.error("Store: loadDomain failed", error);
          await get().initializeStateFromEvents([]); // unblock UI
        }
      }
      
    })),
    {
      name: 'esaa-storage', // unique name
      storage: createJSONStorage(() => localStorage), // Use localStorage stub
      partialize: (state) => ({ state: state.state, isHydrated: state.isHydrated }),
    }
  )
);

// Export utility functions for external access/debugging if needed
export const getInitialState = () => initialControlTowerState;
export const getHydratedState = () => useESAAStore.getState().state;
