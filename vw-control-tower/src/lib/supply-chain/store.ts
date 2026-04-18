'use client';

import { create } from 'zustand';
import { SC_SUPPLIERS } from './seed-data';
import type { SupplierSnapshot, SCRecommendedAction, SupplyChainTab, CorrectiveAction } from './types';

interface SupplyChainStore {
  suppliers: SupplierSnapshot[];
  selectedSupplierId: string;
  activeTab: SupplyChainTab;
  recommendedActions: SCRecommendedAction[];
  actionsLoading: boolean;
  actionsError: string | null;

  selectSupplier: (supplierId: string) => void;
  setActiveTab: (tab: SupplyChainTab) => void;
  setRecommendedActions: (actions: SCRecommendedAction[]) => void;
  setActionsLoading: (loading: boolean) => void;
  setActionsError: (error: string | null) => void;
  updateActionStatus: (actionId: string, status: SCRecommendedAction['status']) => void;
  updateCorrectiveActionStatus: (supplierId: string, actionId: string, status: CorrectiveAction['status']) => void;

  // Computed helpers
  getAwardReadyCount: () => number;
  getHighRiskCount: () => number;
  getOpenCorrectiveActions: () => number;
  getBatteryPassportReadyPrograms: () => number;
  getMissingTraceabilityCount: () => number;
}

export const useSupplyChainStore = create<SupplyChainStore>((set, get) => ({
  suppliers: SC_SUPPLIERS,
  selectedSupplierId: SC_SUPPLIERS[0]?.supplierId ?? '',
  activeTab: 'overview',
  recommendedActions: [],
  actionsLoading: false,
  actionsError: null,

  selectSupplier: (supplierId) => set({ selectedSupplierId: supplierId, activeTab: 'overview' }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setRecommendedActions: (actions) => set({ recommendedActions: actions }),
  setActionsLoading: (loading) => set({ actionsLoading: loading }),
  setActionsError: (error) => set({ actionsError: error }),

  updateActionStatus: (actionId, status) =>
    set((state) => ({
      recommendedActions: state.recommendedActions.map((a) =>
        a.actionId === actionId ? { ...a, status } : a
      ),
    })),

  updateCorrectiveActionStatus: (supplierId, actionId, status) =>
    set((state) => ({
      suppliers: state.suppliers.map((s) =>
        s.supplierId !== supplierId ? s : {
          ...s,
          correctiveActions: s.correctiveActions.map((ca) =>
            ca.actionId !== actionId ? ca : { ...ca, status }
          ),
        }
      ),
    })),

  getAwardReadyCount: () => {
    const { suppliers } = get();
    return suppliers.filter((s) => s.awardStatus === 'Award Ready').length;
  },

  getHighRiskCount: () => {
    const { suppliers } = get();
    return suppliers.filter((s) =>
      s.activeRisks.some((r) => r.level === 'High' || r.level === 'Critical')
    ).length;
  },

  getOpenCorrectiveActions: () => {
    const { suppliers } = get();
    return suppliers.reduce((sum, s) =>
      sum + s.correctiveActions.filter((ca) => ca.status === 'Open' || ca.status === 'In Progress' || ca.status === 'Overdue').length,
      0
    );
  },

  getBatteryPassportReadyPrograms: () => {
    const { suppliers } = get();
    const programs = new Set<string>();
    const readyPrograms = new Set<string>();
    suppliers.forEach((s) => {
      s.programs.forEach((p) => programs.add(p));
      if (s.batteryPassport?.euPassportReady) {
        s.programs.forEach((p) => readyPrograms.add(p));
      }
    });
    return readyPrograms.size;
  },

  getMissingTraceabilityCount: () => {
    const { suppliers } = get();
    return suppliers.filter((s) =>
      s.batteryPassport &&
      s.batteryPassport.completenessPercent < 80
    ).length;
  },
}));
