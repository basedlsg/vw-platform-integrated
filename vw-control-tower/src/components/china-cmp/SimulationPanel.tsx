"use client";

import React from 'react';
import { T } from '@/lib/translations';
import { useChinaCmpStore } from '@/lib/china-cmp/store';
import type { ChinaCmpProgramSnapshot } from '@/lib/china-cmp/types';

interface Props {
  program: ChinaCmpProgramSnapshot;
  lang: 'en' | 'zh';
}

export function SimulationPanel({ program, lang }: Props) {
  const t = T[lang];
  const simulationActive = useChinaCmpStore((s) => s.simulationActive);
  const setSimulationActive = useChinaCmpStore((s) => s.setSimulationActive);
  const simulatedIds = useChinaCmpStore((s) => s.simulatedApprovedIds);
  const toggleAction = useChinaCmpStore((s) => s.toggleSimulationAction);
  const getSimulatedPct = useChinaCmpStore((s) => s.getSimulatedPct);

  const projectedPct = getSimulatedPct(program.program);
  const projectedGap = program.targetCostReductionPct - projectedPct;
  const EUR_PER_PP = 20;

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-base font-semibold t-primary">{t.china_cmp_simulation_title}</h3>
        <button
          onClick={() => setSimulationActive(!simulationActive)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all"
          style={{
            background: simulationActive ? 'rgba(19,91,236,0.15)' : 'var(--bg-surface)',
            color: simulationActive ? '#135bec' : 'var(--text-muted)',
            border: `1px solid ${simulationActive ? 'rgba(19,91,236,0.3)' : 'var(--border-subtle)'}`,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
            {simulationActive ? 'toggle_on' : 'toggle_off'}
          </span>
          {simulationActive ? t.china_cmp_simulation_on : t.china_cmp_simulation_off}
        </button>
      </div>
      <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>{t.china_cmp_simulation_subtitle}</p>

      {simulationActive && (
        <>
          {/* Action toggles */}
          <div className="space-y-2 mb-4">
            {program.recommendedActions.map((a) => {
              const isToggled = simulatedIds.includes(a.actionId);
              const title = lang === 'zh' ? a.titleZh : a.titleEn;
              return (
                <button
                  key={a.actionId}
                  onClick={() => toggleAction(a.actionId)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all"
                  style={{
                    background: isToggled ? 'rgba(16,185,129,0.1)' : 'var(--bg-surface)',
                    border: `1px solid ${isToggled ? 'rgba(16,185,129,0.3)' : 'var(--border-subtle)'}`,
                  }}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color: isToggled ? '#10b981' : 'var(--text-muted)' }}>
                      {isToggled ? 'check_box' : 'check_box_outline_blank'}
                    </span>
                    <span className="truncate font-medium t-primary">{title}</span>
                  </div>
                  <span className="flex-shrink-0 font-bold" style={{ color: '#135bec' }}>
                    +{a.impactPct}{t.china_cmp_pp}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Projection */}
          <div className="rounded-xl p-4" style={{ background: 'rgba(19,91,236,0.08)', border: '1px solid rgba(19,91,236,0.2)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{t.china_cmp_simulation_projected}</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {program.currentCostReductionPct}% → <strong style={{ color: '#135bec' }}>{projectedPct}%</strong> / {program.targetCostReductionPct}%
              </span>
            </div>
            <div className="h-4 rounded-full overflow-hidden relative mb-2" style={{ background: 'var(--border-subtle)' }}>
              {/* Current */}
              <div
                className="absolute h-full rounded-full transition-all duration-300"
                style={{
                  width: `${(program.currentCostReductionPct / program.targetCostReductionPct) * 100}%`,
                  background: 'var(--text-muted)',
                  opacity: 0.3,
                }}
              />
              {/* Projected */}
              <div
                className="absolute h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min((projectedPct / program.targetCostReductionPct) * 100, 100)}%`,
                  background: projectedPct >= program.targetCostReductionPct ? '#10b981' : '#135bec',
                }}
              />
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--text-muted)' }}>
                {t.china_cmp_gap_label}: {projectedGap > 0 ? `−${projectedGap}` : '0'}{t.china_cmp_pp}
              </span>
              <span style={{ color: '#135bec' }}>
                €{projectedGap > 0 ? projectedGap * EUR_PER_PP : 0}M {t.china_cmp_eur_gap}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
