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
       * Loads the events for every domain entity from the server and
       * projects them into the store. Resilient: a transient failure
       * on one entity (network blip, Supabase rate limit) does NOT
       * wipe the rest of the dashboard. Failed entities log a warning
       * and contribute an empty events list; the rest of the projection
       * still hydrates.
       *
       * @param domainId Reserved for future multi-domain support.
       */
      loadDomain: async (_domainId: string) => {
        set({ isHydrated: false });

        const entityIds = [
          'KPI_OP_MARGIN', 'KPI_CASH_CONV', 'KPI_BEV_SHARE',
          'RISK_TARIFF_001', 'RISK_NEV_001', 'RISK_STOCK_PRESSURE', 'RISK_MARGIN_001',
          'PROP_MARGIN_REC_001', 'PROP_BYD_PRICING', 'PROP_TARIFF_ESC',
          'PROP_XPENG_PLATFORM', 'PROP_ACEA_BEV', 'PROP_POWERCO_DELAY',
        ];

        const settled = await Promise.allSettled(
          entityIds.map(async (id) => {
            const res = await fetch(`/api/esaa/events?entityId=${id}`);
            if (!res.ok) {
              throw new Error(`HTTP ${res.status} for ${id}`);
            }
            return (await res.json()) as BaseEvent[];
          })
        );

        const events: BaseEvent[] = [];
        for (let i = 0; i < settled.length; i++) {
          const result = settled[i];
          if (result.status === 'fulfilled') {
            events.push(...result.value);
          } else {
            console.warn(`Store: loadDomain skipped ${entityIds[i]}`, result.reason);
          }
        }

        await get().initializeStateFromEvents(events);
      }
      
    })),
    {
      name: 'esaa-storage', // unique name
      version: 2, // bump when the persisted shape changes — invalidates stale browser caches
      storage: createJSONStorage(() => localStorage),
      // Discard the persisted hydration flag so the store always re-projects
      // from fresh events on first render. Persisting state without
      // re-running materialize led to white screens after schema changes
      // (e.g. new proposal statuses) in browsers carrying the old cache.
      partialize: () => ({}),
    }
  )
);

// Export utility functions for external access/debugging if needed
export const getInitialState = () => initialControlTowerState;
export const getHydratedState = () => useESAAStore.getState().state;
