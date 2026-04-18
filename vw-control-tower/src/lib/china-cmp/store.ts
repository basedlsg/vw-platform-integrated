'use client';

import { create } from 'zustand';
import { CHINA_CMP_PROGRAMS } from './seed-data';
import type { ChinaCmpProgramSnapshot, RecommendedAction, ChatMessage, CmpTab } from './types';

interface ChinaCmpStore {
  programs: ChinaCmpProgramSnapshot[];
  selectedProgramId: string;
  actionsLoading: boolean;
  actionsError: string | null;
  activeTab: CmpTab;
  chatMessages: ChatMessage[];
  chatLoading: boolean;
  chatContext: string | null;       // selected element context for chat
  simulationActive: boolean;
  simulatedApprovedIds: string[];   // action IDs toggled for simulation

  selectProgram: (programId: string) => void;
  setActiveTab: (tab: CmpTab) => void;
  updateActionStatus: (programId: string, actionId: string, status: RecommendedAction['status']) => void;
  setActionsLoading: (loading: boolean) => void;
  setActionsError: (error: string | null) => void;
  updateProgramActions: (programId: string, actions: RecommendedAction[]) => void;
  addChatMessage: (msg: ChatMessage) => void;
  setChatLoading: (loading: boolean) => void;
  setChatContext: (ctx: string | null) => void;
  clearChat: () => void;
  toggleSimulationAction: (actionId: string) => void;
  setSimulationActive: (active: boolean) => void;
  getSimulatedPct: (programId: string) => number;
}

export const useChinaCmpStore = create<ChinaCmpStore>((set, get) => ({
  programs: CHINA_CMP_PROGRAMS,
  selectedProgramId: CHINA_CMP_PROGRAMS[0]?.program ?? '',
  actionsLoading: false,
  actionsError: null,
  activeTab: 'programs',
  chatMessages: [],
  chatLoading: false,
  chatContext: null,
  simulationActive: false,
  simulatedApprovedIds: [],

  selectProgram: (programId) => set({ selectedProgramId: programId }),
  setActiveTab: (tab) => set({ activeTab: tab }),

  updateActionStatus: (programId, actionId, status) =>
    set((state) => ({
      programs: state.programs.map((p) =>
        p.program !== programId ? p : {
          ...p,
          recommendedActions: p.recommendedActions.map((a) =>
            a.actionId !== actionId ? a : { ...a, status }
          ),
        }
      ),
    })),

  setActionsLoading: (loading) => set({ actionsLoading: loading }),
  setActionsError: (error) => set({ actionsError: error }),

  updateProgramActions: (programId, actions) =>
    set((state) => ({
      programs: state.programs.map((p) =>
        p.program !== programId ? p : { ...p, recommendedActions: actions }
      ),
    })),

  addChatMessage: (msg) => set((state) => ({ chatMessages: [...state.chatMessages, msg] })),
  setChatLoading: (loading) => set({ chatLoading: loading }),
  setChatContext: (ctx) => set({ chatContext: ctx }),
  clearChat: () => set({ chatMessages: [], chatContext: null }),

  toggleSimulationAction: (actionId) =>
    set((state) => ({
      simulatedApprovedIds: state.simulatedApprovedIds.includes(actionId)
        ? state.simulatedApprovedIds.filter((id) => id !== actionId)
        : [...state.simulatedApprovedIds, actionId],
    })),

  setSimulationActive: (active) => set({ simulationActive: active, simulatedApprovedIds: active ? [] : [] }),

  getSimulatedPct: (programId) => {
    const state = get();
    const program = state.programs.find((p) => p.program === programId);
    if (!program) return 0;
    const simImpact = program.recommendedActions
      .filter((a) => state.simulatedApprovedIds.includes(a.actionId))
      .reduce((sum, a) => sum + a.impactPct, 0);
    return program.currentCostReductionPct + simImpact;
  },
}));
