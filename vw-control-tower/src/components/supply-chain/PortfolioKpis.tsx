'use client';

import React from 'react';
import { useLang } from '@/lib/app-context';
import { T } from '@/lib/translations';
import { useSupplyChainStore } from '@/lib/supply-chain/store';

interface KpiCardProps {
  icon: string;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  warn?: boolean;
}

function KpiCard({ icon, label, value, sub, color = '#135bec', warn }: KpiCardProps) {
  return (
    <div
      className="flex items-center gap-3 p-4 rounded-2xl"
      style={{
        background: warn ? `rgba(239,68,68,0.07)` : 'var(--bg-card)',
        border: `1px solid ${warn ? 'rgba(239,68,68,0.2)' : 'var(--border-card)'}`,
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}1a`, border: `1px solid ${color}33` }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '20px', color }}>{icon}</span>
      </div>
      <div>
        <p className="text-xs t-muted leading-tight">{label}</p>
        <p className="text-2xl font-bold t-primary leading-none mt-0.5">{value}</p>
        {sub && <p className="text-xs t-muted mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export function PortfolioKpis() {
  const { lang } = useLang();
  const t = T[lang];
  const store = useSupplyChainStore();

  const awardReady = store.getAwardReadyCount();
  const highRisk = store.getHighRiskCount();
  const openActions = store.getOpenCorrectiveActions();
  const passportReady = store.getBatteryPassportReadyPrograms();
  const missingTrace = store.getMissingTraceabilityCount();
  const total = store.suppliers.length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <KpiCard
        icon="verified"
        label={t.sc_kpi_award_ready}
        value={`${awardReady}/${total}`}
        color={awardReady === total ? '#4ade80' : awardReady >= total / 2 ? '#fbbf24' : '#f87171'}
        warn={awardReady < total / 2}
      />
      <KpiCard
        icon="battery_charging_full"
        label={t.sc_kpi_passport_ready}
        value={`${passportReady}`}
        sub={t.sc_kpi_programs_label}
        color="#60a5fa"
        warn={passportReady === 0}
      />
      <KpiCard
        icon="warning"
        label={t.sc_kpi_high_risk}
        value={highRisk}
        color={highRisk === 0 ? '#4ade80' : '#f87171'}
        warn={highRisk > 0}
      />
      <KpiCard
        icon="task_alt"
        label={t.sc_kpi_open_actions}
        value={openActions}
        color={openActions === 0 ? '#4ade80' : '#fbbf24'}
        warn={openActions > 2}
      />
      <KpiCard
        icon="route"
        label={t.sc_kpi_missing_trace}
        value={missingTrace}
        color={missingTrace === 0 ? '#4ade80' : '#f97316'}
        warn={missingTrace > 0}
      />
    </div>
  );
}
