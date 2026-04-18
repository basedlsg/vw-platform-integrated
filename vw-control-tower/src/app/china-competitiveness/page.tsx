"use client";

import React, { useState } from 'react';
import Shell from '@/components/Shell';
import { useLang } from '@/lib/app-context';
import { T } from '@/lib/translations';
import { useChinaCmpStore } from '@/lib/china-cmp/store';
import { GapGauge } from '@/components/china-cmp/GapGauge';
import { WaterfallChart } from '@/components/china-cmp/WaterfallChart';
import { EventFeed } from '@/components/china-cmp/EventFeed';
import { ActionCards } from '@/components/china-cmp/ActionCards';
import { CountdownTracker } from '@/components/china-cmp/CountdownTracker';
import { DecisionMatrix } from '@/components/china-cmp/DecisionMatrix';
import { SimulationPanel } from '@/components/china-cmp/SimulationPanel';
import { ChatPanel } from '@/components/china-cmp/ChatPanel';
import type { RecommendedAction, CmpTab } from '@/lib/china-cmp/types';

// ─── Global Targets View ─────────────────────────────────────────────────────

function GlobalTargetsView({ lang }: { lang: 'en' | 'zh' }) {
  const t = T[lang];
  const programs = useChinaCmpStore((s) => s.programs);

  const totalCurrent = programs.reduce((s, p) => s + p.currentCostReductionPct, 0) / programs.length;
  const totalGap = programs.reduce((s, p) => s + p.gapPct, 0);
  const totalGapEur = programs.reduce((s, p) => s + p.gapEurM, 0);
  const totalRisk = programs.reduce((s, p) => s + p.marginAtRisk90Days, 0);
  const totalRiskEur = programs.reduce((s, p) => s + p.marginAtRiskEurM, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold t-primary">{t.china_cmp_global_portfolio}</h2>
        <p className="text-sm t-secondary">{t.china_cmp_global_subtitle}</p>
      </div>

      {/* Portfolio summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label={lang === 'zh' ? '平均进度' : 'Avg Progress'}
          value={`${totalCurrent.toFixed(1)}%`}
          subtitle={`/ 40% ${t.china_cmp_target_label}`}
          color="#135bec"
        />
        <SummaryCard
          label={lang === 'zh' ? '总缺口' : 'Total Gap'}
          value={`${totalGap}${t.china_cmp_pp}`}
          subtitle={`€${totalGapEur}M/yr`}
          color="#ef4444"
        />
        <SummaryCard
          label={lang === 'zh' ? '90天利润风险' : '90-Day Margin Risk'}
          value={`${totalRisk.toFixed(1)}${t.china_cmp_pp}`}
          subtitle={`€${totalRiskEur.toFixed(0)}M`}
          color="#f59e0b"
        />
        <SummaryCard
          label={lang === 'zh' ? '活跃项目' : 'Active Programs'}
          value={`${programs.length}`}
          subtitle={lang === 'zh' ? '个CMP项目' : 'CMP programs'}
          color="#10b981"
        />
      </div>

      {/* Per-program overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {programs.map((p) => {
          const name = lang === 'zh' ? p.programNameZh : p.programNameEn;
          const statusColor = p.status === 'Green' ? '#10b981' : p.status === 'Amber' ? '#f59e0b' : '#ef4444';
          const pct = (p.currentCostReductionPct / p.targetCostReductionPct) * 100;

          return (
            <div key={p.program} className="glass-card rounded-2xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-base font-bold t-primary">{name}</h3>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    SOP: {new Date(p.sopDate).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: `${statusColor}20`, color: statusColor }}>
                  {p.status === 'Green' ? t.china_cmp_status_green : p.status === 'Amber' ? t.china_cmp_status_amber : t.china_cmp_status_red}
                </span>
              </div>

              <div className="h-3 rounded-full overflow-hidden mb-2" style={{ background: 'var(--border-subtle)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: statusColor }} />
              </div>

              <div className="flex justify-between text-xs mb-3">
                <span style={{ color: statusColor, fontWeight: 600 }}>{p.currentCostReductionPct}% {t.china_cmp_achieved_label}</span>
                <span style={{ color: 'var(--text-muted)' }}>{p.gapPct}{t.china_cmp_pp} {t.china_cmp_gap_label} · €{p.gapEurM}M</span>
              </div>

              <div className="text-xs p-2.5 rounded-lg" style={{ background: 'rgba(19,91,236,0.06)', border: '1px solid rgba(19,91,236,0.1)' }}>
                <span className="font-semibold" style={{ color: '#135bec' }}>{t.china_cmp_biggest_lever}:</span>
                <span className="t-secondary"> {lang === 'zh' ? p.biggestLeverZh : p.biggestLeverEn}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Cost Drivers View ───────────────────────────────────────────────────────

function CostDriversView({ lang }: { lang: 'en' | 'zh' }) {
  const t = T[lang];
  const programs = useChinaCmpStore((s) => s.programs);

  const driverKeys = ['battery', 'cea', 'adas_soc', 'localModules'] as const;
  const driverLabels: Record<string, string> = {
    battery: t.china_cmp_driver_battery,
    cea: t.china_cmp_driver_cea,
    adas_soc: t.china_cmp_driver_adas,
    localModules: t.china_cmp_driver_local,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold t-primary">{t.china_cmp_drivers_cross}</h2>
        <p className="text-sm t-secondary">{t.china_cmp_drivers_subtitle}</p>
      </div>

      {driverKeys.map((dk) => (
        <div key={dk} className="glass-card rounded-2xl p-5">
          <h3 className="text-sm font-bold t-primary mb-4">{driverLabels[dk]}</h3>
          <div className="space-y-3">
            {programs.map((p) => {
              const driver = p.costDriverBreakdown[dk];
              const name = lang === 'zh' ? p.programNameZh : p.programNameEn;
              const statusColor = driver.status === 'Green' ? '#10b981' : driver.status === 'Amber' ? '#f59e0b' : '#ef4444';
              const achievedPct = Math.min((Math.abs(driver.achieved) / Math.abs(driver.needed)) * 100, 100);

              return (
                <div key={p.program}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium t-secondary">{name}</span>
                    <span className="text-xs font-bold" style={{ color: statusColor }}>
                      −{Math.abs(driver.achieved)}{t.china_cmp_pp} / −{Math.abs(driver.needed)}{t.china_cmp_pp}
                    </span>
                  </div>
                  <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--border-subtle)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${achievedPct}%`, background: statusColor }} />
                  </div>
                  {driver.recentEvents.length > 0 && (
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      {driver.recentEvents.length} {lang === 'zh' ? '个近期事件' : 'recent events'}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Headwinds comparison */}
      <div className="glass-card rounded-2xl p-5">
        <h3 className="text-sm font-bold t-primary mb-4">{lang === 'zh' ? '逆风因素对比' : 'Headwinds Comparison'}</h3>
        <div className="grid grid-cols-2 gap-4">
          {programs.map((p) => {
            const name = lang === 'zh' ? p.programNameZh : p.programNameEn;
            return (
              <div key={p.program} className="p-3 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                <p className="text-xs font-semibold t-primary mb-2">{name}</p>
                <div className="flex gap-4 text-xs">
                  <span style={{ color: '#ef4444' }}>
                    {t.china_cmp_driver_incentive}: +{p.costDriverBreakdown.incentiveHeadwind}{t.china_cmp_pp}
                  </span>
                  <span style={{ color: '#f97316' }}>
                    {t.china_cmp_driver_timing}: +{p.costDriverBreakdown.timingHeadwind}{t.china_cmp_pp}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({ label, value, subtitle, color }: { label: string; value: string; subtitle: string; color: string }) {
  return (
    <div className="glass-card rounded-2xl p-4">
      <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-very-muted)' }}>{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ChinaCompetitivenessPage(): React.JSX.Element {
  const { lang } = useLang();
  const t = T[lang];

  const programs         = useChinaCmpStore((s) => s.programs);
  const selectedId       = useChinaCmpStore((s) => s.selectedProgramId);
  const actionsLoading   = useChinaCmpStore((s) => s.actionsLoading);
  const actionsError     = useChinaCmpStore((s) => s.actionsError);
  const activeTab        = useChinaCmpStore((s) => s.activeTab);
  const selectProgram    = useChinaCmpStore((s) => s.selectProgram);
  const setActiveTab     = useChinaCmpStore((s) => s.setActiveTab);
  const updateActionStatus  = useChinaCmpStore((s) => s.updateActionStatus);
  const setActionsLoading   = useChinaCmpStore((s) => s.setActionsLoading);
  const setActionsError     = useChinaCmpStore((s) => s.setActionsError);
  const updateProgramActions = useChinaCmpStore((s) => s.updateProgramActions);
  const setChatContext       = useChinaCmpStore((s) => s.setChatContext);

  const program = programs.find((p) => p.program === selectedId) ?? programs[0];
  const [programDropdownOpen, setProgramDropdownOpen] = useState(false);

  const handleStatusChange = (actionId: string, status: RecommendedAction['status']) => {
    if (!program) return;
    updateActionStatus(program.program, actionId, status);
  };

  const handleRegenerateActions = async () => {
    if (!program) return;
    setActionsLoading(true);
    setActionsError(null);
    try {
      const res = await fetch('/api/china-cmp/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshot: program, lang }),
      });
      if (!res.ok) throw new Error('Failed to generate recommendations');
      const data = await res.json() as { actions: RecommendedAction[] };
      updateProgramActions(program.program, data.actions);
    } catch {
      setActionsError(
        lang === 'zh' ? '无法生成推荐，请稍后重试。' : 'Could not generate recommendations. Please try again.'
      );
    } finally {
      setActionsLoading(false);
    }
  };

  const handleMoreResearch = (actionId: string) => {
    const action = program?.recommendedActions.find(a => a.actionId === actionId);
    if (action) {
      const title = lang === 'zh' ? action.titleZh : action.titleEn;
      setChatContext(title);
    }
  };

  if (!program) return <Shell><div className="t-secondary p-8">No programs found.</div></Shell>;

  const tabs: { key: CmpTab; label: string; icon: string }[] = [
    { key: 'programs', label: t.china_cmp_tab_programs, icon: 'analytics' },
    { key: 'global',   label: t.china_cmp_tab_global,   icon: 'public' },
    { key: 'drivers',  label: t.china_cmp_tab_drivers,  icon: 'tune' },
  ];

  return (
    <Shell>
      <div className="space-y-5">
        {/* ─── Page Header ─── */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#135bec' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'white' }}>flag</span>
            </div>
            <div>
              <h1 className="text-xl font-bold t-primary">{t.china_cmp_title}</h1>
              <p className="text-xs t-secondary">{t.china_cmp_subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* 40% Target Badge */}
            <span className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: 'rgba(19,91,236,0.12)', color: '#135bec', border: '1px solid rgba(19,91,236,0.25)' }}>
              {t.china_cmp_badge_target}
            </span>
            {/* Program status badges */}
            {programs.map((p) => {
              const color = p.status === 'Green' ? '#10b981' : p.status === 'Amber' ? '#f59e0b' : '#ef4444';
              return (
                <span key={p.program} className="text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ background: `${color}20`, color }}>
                  {lang === 'zh' ? p.programNameZh.replace(' 成本平价计划', '') : p.programNameEn.replace(' CMP', '')}: {p.currentCostReductionPct}%
                </span>
              );
            })}
          </div>
        </div>

        {/* ─── Top Toolbar ─── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg transition-all"
                style={{
                  background: activeTab === tab.key ? '#135bec' : 'transparent',
                  color: activeTab === tab.key ? 'white' : 'var(--text-muted)',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Program selector (for programs tab) */}
          {activeTab === 'programs' && (
            <div className="relative">
              <button
                onClick={() => setProgramDropdownOpen(!programDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>folder</span>
                {lang === 'zh' ? program.programNameZh : program.programNameEn}
                <span className="material-symbols-outlined" style={{ fontSize: '14px', transform: programDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>expand_more</span>
              </button>
              {programDropdownOpen && (
                <div className="absolute top-full right-0 mt-1 min-w-[200px] rounded-xl overflow-hidden shadow-lg z-50" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                  {programs.map((p) => {
                    const isSelected = p.program === selectedId;
                    const color = p.status === 'Green' ? '#10b981' : p.status === 'Amber' ? '#f59e0b' : '#ef4444';
                    return (
                      <button
                        key={p.program}
                        onClick={() => { selectProgram(p.program); setProgramDropdownOpen(false); }}
                        className="w-full flex items-center justify-between px-4 py-3 text-xs font-medium transition-all"
                        style={{ background: isSelected ? 'rgba(19,91,236,0.08)' : 'transparent', color: isSelected ? '#135bec' : 'var(--text-secondary)' }}
                      >
                        <span>{lang === 'zh' ? p.programNameZh : p.programNameEn}</span>
                        <span className="font-bold" style={{ color }}>{p.currentCostReductionPct}%</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── Tab Content ─── */}
        {activeTab === 'global' && <GlobalTargetsView lang={lang} />}
        {activeTab === 'drivers' && <CostDriversView lang={lang} />}
        {activeTab === 'programs' && (
          <div className="space-y-6">
            {/* Row 1: Gap Gauge + SOP/Lever info */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2">
                <GapGauge program={program} lang={lang} />
              </div>
              <div className="space-y-4">
                {/* SOP countdown */}
                <div className="glass-card rounded-2xl p-5">
                  <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-very-muted)' }}>{t.china_cmp_sop_label}</p>
                  <p className="text-lg font-bold t-primary">
                    {new Date(program.sopDate).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'long', year: 'numeric' })}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {Math.ceil((new Date(program.sopDate).getTime() - Date.now()) / (1000*60*60*24))} {lang === 'zh' ? '天剩余' : 'days remaining'}
                  </p>
                </div>
                {/* EUR gap */}
                <div className="glass-card rounded-2xl p-5">
                  <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-very-muted)' }}>{t.china_cmp_eur_impact}</p>
                  <p className="text-lg font-bold" style={{ color: '#ef4444' }}>€{program.gapEurM}M/yr</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {program.gapPct}{t.china_cmp_pp} × €20M = €{program.gapEurM}M
                  </p>
                </div>
                {/* Biggest lever */}
                <div className="glass-card rounded-2xl p-5">
                  <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-very-muted)' }}>{t.china_cmp_biggest_lever}</p>
                  <p className="text-xs t-body leading-relaxed">
                    {lang === 'zh' ? program.biggestLeverZh : program.biggestLeverEn}
                  </p>
                </div>
              </div>
            </div>

            {/* Row 2: Waterfall + Countdown */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2">
                <WaterfallChart
                  breakdown={program.costDriverBreakdown}
                  lang={lang}
                  targetPct={program.targetCostReductionPct}
                  currentPct={program.currentCostReductionPct}
                />
              </div>
              <CountdownTracker
                milestones={program.countdownMilestones}
                lang={lang}
                onSelectMilestone={(id) => {
                  const m = program.countdownMilestones.find(cm => cm.id === id);
                  if (m) setChatContext(lang === 'zh' ? m.titleZh : m.titleEn);
                }}
              />
            </div>

            {/* Row 3: Events + Decision Matrix */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <EventFeed events={program.recentEvents} lang={lang} />
              <DecisionMatrix
                actions={program.recommendedActions}
                lang={lang}
                onSelectAction={(actionId) => {
                  const action = program.recommendedActions.find(a => a.actionId === actionId);
                  if (action) setChatContext(lang === 'zh' ? action.titleZh : action.titleEn);
                }}
              />
            </div>

            {/* Row 4: Actions + Simulation */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2">
                <ActionCards
                  program={program}
                  lang={lang}
                  onStatusChange={handleStatusChange}
                  onRegenerateActions={handleRegenerateActions}
                  onMoreResearch={handleMoreResearch}
                  loading={actionsLoading}
                  error={actionsError}
                />
              </div>
              <SimulationPanel program={program} lang={lang} />
            </div>

            {/* Row 5: Chat Panel */}
            <ChatPanel program={program} lang={lang} />
          </div>
        )}
      </div>
    </Shell>
  );
}
