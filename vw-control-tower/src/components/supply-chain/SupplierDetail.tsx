'use client';

import React from 'react';
import { useLang } from '@/lib/app-context';
import { T } from '@/lib/translations';
import { useSupplyChainStore } from '@/lib/supply-chain/store';
import type { SupplierSnapshot, BatteryPassportField, SupplierRisk, CorrectiveAction, Certification } from '@/lib/supply-chain/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AWARD_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Award Ready':  { bg: 'rgba(34,197,94,0.10)',  text: '#4ade80', border: 'rgba(34,197,94,0.25)' },
  'Conditional':  { bg: 'rgba(251,191,36,0.10)', text: '#fbbf24', border: 'rgba(251,191,36,0.25)' },
  'Not Ready':    { bg: 'rgba(239,68,68,0.10)',  text: '#f87171', border: 'rgba(239,68,68,0.25)' },
  'Blocked':      { bg: 'rgba(239,68,68,0.18)',  text: '#ef4444', border: 'rgba(239,68,68,0.35)' },
};

const RISK_COLORS: Record<string, string> = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#fbbf24',
  Low: '#4ade80',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Active:      { bg: 'rgba(34,197,94,0.12)',  text: '#4ade80' },
  'In Progress': { bg: 'rgba(59,130,246,0.12)', text: '#60a5fa' },
  Expired:     { bg: 'rgba(239,68,68,0.12)',  text: '#f87171' },
  Missing:     { bg: 'rgba(100,116,139,0.12)',text: 'var(--text-muted)' },
};

const ACTION_COLORS: Record<string, { bg: string; text: string }> = {
  Open:        { bg: 'rgba(239,68,68,0.12)',  text: '#f87171' },
  'In Progress': { bg: 'rgba(59,130,246,0.12)', text: '#60a5fa' },
  Closed:      { bg: 'rgba(34,197,94,0.12)',  text: '#4ade80' },
  Overdue:     { bg: 'rgba(239,68,68,0.22)',  text: '#ef4444' },
};

// ─── Sub-views ────────────────────────────────────────────────────────────────

function OverviewTab({ s, t, lang }: { s: SupplierSnapshot; t: (typeof T)[keyof typeof T]; lang: 'en' | 'zh' }) {
  const award = AWARD_COLORS[s.awardStatus] ?? AWARD_COLORS['Not Ready'];
  return (
    <div className="space-y-4">
      {/* Award status card */}
      <div
        className="flex items-center gap-4 p-4 rounded-xl"
        style={{ background: award.bg, border: `1px solid ${award.border}` }}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: '28px', color: award.text }}
        >
          {s.awardStatus === 'Award Ready' ? 'verified' : s.awardStatus === 'Blocked' ? 'block' : 'warning'}
        </span>
        <div>
          <p className="text-base font-bold" style={{ color: award.text }}>
            {lang === 'zh'
              ? { 'Award Ready': t.sc_award_ready, 'Conditional': t.sc_award_conditional, 'Not Ready': t.sc_award_not_ready, 'Blocked': t.sc_award_blocked }[s.awardStatus]
              : s.awardStatus}
          </p>
          <p className="text-xs t-muted">{t.sc_s_rating}: {s.sRating === 'Not Assessed' ? t.sc_s_rating_not_assessed : s.sRating}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs t-muted">{t.sc_last_updated}</p>
          <p className="text-sm font-medium t-primary">{s.lastUpdated}</p>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: t.sc_tier_label, value: s.tier },
          { label: t.sc_country_label, value: lang === 'zh' ? s.countryZh : s.country },
          { label: t.sc_component_label, value: lang === 'zh' ? s.componentZh : s.component },
          { label: t.sc_programs_label, value: s.programs.join(', ') },
        ].map(({ label, value }) => (
          <div key={label} className="p-3 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
            <p className="text-xs t-muted mb-1">{label}</p>
            <p className="text-sm font-semibold t-primary">{value}</p>
          </div>
        ))}
      </div>

      {/* Certifications */}
      <div>
        <p className="text-xs font-semibold t-muted uppercase tracking-wider mb-2">{t.sc_certifications}</p>
        <div className="space-y-1.5">
          {s.certifications.map((cert: Certification) => {
            const color = STATUS_COLORS[cert.status] ?? STATUS_COLORS.Missing;
            const statusLabel: Record<string, string> = {
              Active: t.sc_cert_active,
              'In Progress': t.sc_cert_in_progress,
              Expired: t.sc_cert_expired,
              Missing: t.sc_cert_missing,
            };
            return (
              <div
                key={cert.name}
                className="flex items-center justify-between px-3 py-2 rounded-lg"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
              >
                <span className="text-sm t-primary">{cert.name}</span>
                <div className="flex items-center gap-2">
                  {cert.validUntil && cert.status === 'Active' && (
                    <span className="text-xs t-muted">{t.sc_cert_valid_until} {cert.validUntil}</span>
                  )}
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={{ background: color.bg, color: color.text }}
                  >
                    {statusLabel[cert.status] ?? cert.status}
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

function TraceabilityTab({ s, t }: { s: SupplierSnapshot; t: (typeof T)[keyof typeof T] }) {
  const bp = s.batteryPassport;
  if (!bp) {
    return (
      <div className="flex flex-col items-center justify-center py-12 t-muted">
        <span className="material-symbols-outlined text-4xl mb-3">battery_unknown</span>
        <p className="text-sm">{t.sc_no_battery}</p>
      </div>
    );
  }

  const completeness = bp.completenessPercent;
  const barColor = completeness >= 80 ? '#4ade80' : completeness >= 50 ? '#fbbf24' : '#f87171';

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="p-4 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold t-primary">{t.sc_traceability_completeness}</p>
          <span className="text-lg font-bold" style={{ color: barColor }}>{completeness}%</span>
        </div>
        <div className="h-2 rounded-full" style={{ background: 'var(--border-card)' }}>
          <div className="h-2 rounded-full transition-all" style={{ width: `${completeness}%`, background: barColor }} />
        </div>
      </div>

      {/* Quick facts */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: t.sc_traceability_cell, value: bp.cellSupplier },
          { label: t.sc_traceability_pack, value: bp.packSupplier },
          { label: t.sc_traceability_chemistry, value: bp.chemistry },
          { label: t.sc_traceability_plant, value: bp.plantCountry },
          { label: t.sc_traceability_upstream, value: `${bp.upstreamCoveragePercent}%` },
          { label: t.sc_traceability_eu_ready, value: bp.euPassportReady ? t.sc_traceability_yes : t.sc_traceability_no, warn: !bp.euPassportReady },
          { label: t.sc_traceability_carbon, value: bp.carbonFootprintComplete ? t.sc_traceability_yes : t.sc_traceability_no, warn: !bp.carbonFootprintComplete },
          { label: t.sc_traceability_recycled, value: bp.recycledContentEvidenced ? t.sc_traceability_yes : t.sc_traceability_no, warn: !bp.recycledContentEvidenced },
        ].map(({ label, value, warn }) => (
          <div
            key={label}
            className="p-3 rounded-xl"
            style={{
              background: warn ? 'rgba(239,68,68,0.06)' : 'var(--bg-surface)',
              border: `1px solid ${warn ? 'rgba(239,68,68,0.2)' : 'var(--border-subtle)'}`,
            }}
          >
            <p className="text-xs t-muted mb-1">{label}</p>
            <p className="text-sm font-semibold" style={{ color: warn ? '#f87171' : 'var(--text-primary)' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Field-by-field */}
      <div>
        <p className="text-xs font-semibold t-muted uppercase tracking-wider mb-2">{t.sc_traceability_fields}</p>
        <div className="space-y-1">
          {bp.requiredFields.map((field: BatteryPassportField) => {
            const statusColor = field.status === 'Complete' ? '#4ade80' : field.status === 'Incomplete' ? '#fbbf24' : field.status === 'Missing' ? '#f87171' : 'var(--text-muted)';
            const statusIcon = field.status === 'Complete' ? 'check_circle' : field.status === 'Incomplete' ? 'error' : field.status === 'Missing' ? 'cancel' : 'remove';
            return (
              <div
                key={field.fieldNameEn}
                className="flex items-start gap-3 px-3 py-2 rounded-lg"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
              >
                <span className="material-symbols-outlined mt-0.5 flex-shrink-0" style={{ fontSize: '16px', color: statusColor }}>{statusIcon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm t-primary">{field.fieldNameEn}</p>
                  {field.notes && <p className="text-xs t-muted mt-0.5">{field.notes}</p>}
                  {field.owner && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.sc_traceability_owner}: {field.owner}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SustainabilityTab({ s, t }: { s: SupplierSnapshot; t: (typeof T)[keyof typeof T] }) {
  const trendColor = s.emissionTrend === 'Improving' ? '#4ade80' : s.emissionTrend === 'Worsening' ? '#f87171' : 'var(--text-muted)';
  const trendIcon = s.emissionTrend === 'Improving' ? 'trending_down' : s.emissionTrend === 'Worsening' ? 'trending_up' : 'trending_flat';
  const trendLabels: Record<string, string> = {
    Improving: t.sc_emissions_trend_improving,
    Stable: t.sc_emissions_trend_stable,
    Worsening: t.sc_emissions_trend_worsening,
    'Not Reported': t.sc_emissions_trend_not_reported,
  };

  const hasEmissions = s.latestScope1 > 0 || s.latestScope2 > 0;

  return (
    <div className="space-y-4">
      {/* Emissions summary */}
      <div className="p-4 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold t-primary">{t.sc_emissions_title}</p>
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: trendColor }}>{trendIcon}</span>
            <span className="text-xs font-semibold" style={{ color: trendColor }}>{trendLabels[s.emissionTrend]}</span>
          </div>
        </div>
        <p className="text-xs t-muted mb-3">{t.sc_emissions_quarter}: {s.latestEmissionQ}</p>
        {hasEmissions ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs t-muted">{t.sc_emissions_scope1}</p>
              <p className="text-xl font-bold t-primary">{s.latestScope1.toLocaleString()}</p>
              <p className="text-xs t-muted">{t.sc_emissions_tco2e}</p>
            </div>
            <div>
              <p className="text-xs t-muted">{t.sc_emissions_scope2}</p>
              <p className="text-xl font-bold t-primary">{s.latestScope2.toLocaleString()}</p>
              <p className="text-xs t-muted">{t.sc_emissions_tco2e}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm t-muted">{t.sc_emissions_trend_not_reported}</p>
        )}
      </div>

      {/* Certifications full list */}
      <div>
        <p className="text-xs font-semibold t-muted uppercase tracking-wider mb-2">{t.sc_certifications}</p>
        <div className="space-y-1.5">
          {s.certifications.map((cert) => {
            const color = STATUS_COLORS[cert.status] ?? STATUS_COLORS.Missing;
            const statusLabel: Record<string, string> = {
              Active: t.sc_cert_active,
              'In Progress': t.sc_cert_in_progress,
              Expired: t.sc_cert_expired,
              Missing: t.sc_cert_missing,
            };
            return (
              <div
                key={cert.name}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
              >
                <div>
                  <p className="text-sm t-primary">{cert.name}</p>
                  {cert.validUntil && <p className="text-xs t-muted">{t.sc_cert_valid_until} {cert.validUntil}</p>}
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: color.bg, color: color.text }}>
                  {statusLabel[cert.status] ?? cert.status}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RiskTab({ s, t, lang }: { s: SupplierSnapshot; t: (typeof T)[keyof typeof T]; lang: 'en' | 'zh' }) {
  const catLabels: Record<string, string> = {
    'Human Rights': t.sc_risk_cat_human_rights,
    'Environmental': t.sc_risk_cat_environmental,
    'Geopolitical': t.sc_risk_cat_geopolitical,
    'Single Source': t.sc_risk_cat_single_source,
    'Financial': t.sc_risk_cat_financial,
  };
  const levelLabels: Record<string, string> = {
    Critical: t.sc_risk_level_critical,
    High: t.sc_risk_level_high,
    Medium: t.sc_risk_level_medium,
    Low: t.sc_risk_level_low,
  };

  if (s.activeRisks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 t-muted">
        <span className="material-symbols-outlined text-4xl mb-3">verified_user</span>
        <p className="text-sm">{t.sc_risk_empty}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {s.activeRisks.map((risk: SupplierRisk) => (
        <div
          key={risk.id}
          className="p-4 rounded-xl"
          style={{
            background: `rgba(${risk.level === 'High' || risk.level === 'Critical' ? '239,68,68' : '251,191,36'},0.06)`,
            border: `1px solid rgba(${risk.level === 'High' || risk.level === 'Critical' ? '239,68,68' : '251,191,36'},0.2)`,
          }}
        >
          <div className="flex items-start gap-3">
            <span
              className="material-symbols-outlined flex-shrink-0 mt-0.5"
              style={{ fontSize: '20px', color: RISK_COLORS[risk.level] ?? 'var(--text-muted)' }}
            >
              {risk.category === 'Human Rights' ? 'policy' : risk.category === 'Environmental' ? 'eco' : risk.category === 'Single Source' ? 'hub' : 'warning'}
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <p className="text-sm font-semibold t-primary">{lang === 'zh' ? risk.titleZh : risk.titleEn}</p>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: `${RISK_COLORS[risk.level]}22`, color: RISK_COLORS[risk.level] }}>
                  {levelLabels[risk.level] ?? risk.level}
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}>
                  {catLabels[risk.category] ?? risk.category}
                </span>
              </div>
              <p className="text-xs t-muted leading-relaxed">{lang === 'zh' ? risk.descriptionZh : risk.descriptionEn}</p>
              <div className="flex gap-4 mt-2">
                <span className="text-xs t-muted">{t.sc_risk_detected}: {risk.detectedDate}</span>
                <span className="text-xs t-muted">{t.sc_risk_programs}: {risk.programs.join(', ')}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ActionsTab({ s, t, lang }: { s: SupplierSnapshot; t: (typeof T)[keyof typeof T]; lang: 'en' | 'zh' }) {
  const { updateCorrectiveActionStatus } = useSupplyChainStore();

  if (s.correctiveActions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 t-muted">
        <span className="material-symbols-outlined text-4xl mb-3">task_alt</span>
        <p className="text-sm">{t.sc_actions_empty}</p>
      </div>
    );
  }

  const priorityIcon: Record<string, string> = {
    Critical: 'priority_high',
    High: 'keyboard_double_arrow_up',
    Medium: 'keyboard_arrow_up',
    Low: 'remove',
  };

  return (
    <div className="space-y-3">
      {s.correctiveActions.map((action: CorrectiveAction) => {
        const statusColor = ACTION_COLORS[action.status] ?? ACTION_COLORS.Open;
        const statusLabels: Record<string, string> = {
          Open: t.sc_actions_open,
          'In Progress': t.sc_actions_in_progress,
          Closed: t.sc_actions_closed,
          Overdue: t.sc_actions_overdue,
        };
        return (
          <div
            key={action.actionId}
            className="p-4 rounded-xl"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
          >
            <div className="flex items-start gap-3">
              <span
                className="material-symbols-outlined flex-shrink-0 mt-0.5"
                style={{ fontSize: '18px', color: action.priority === 'Critical' ? '#ef4444' : action.priority === 'High' ? '#f97316' : '#fbbf24' }}
              >
                {priorityIcon[action.priority] ?? 'info'}
              </span>
              <div className="flex-1">
                <div className="flex items-center flex-wrap gap-2 mb-1">
                  <p className="text-sm font-semibold t-primary">{lang === 'zh' ? action.titleZh : action.titleEn}</p>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: statusColor.bg, color: statusColor.text }}>
                    {statusLabels[action.status] ?? action.status}
                  </span>
                  {action.blocksAward && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
                      {t.sc_actions_blocks_award}
                    </span>
                  )}
                </div>
                <p className="text-xs t-muted leading-relaxed mb-2">{lang === 'zh' ? action.descriptionZh : action.descriptionEn}</p>
                <div className="flex flex-wrap gap-4 mb-3">
                  <span className="text-xs t-muted">{t.sc_actions_due}: {action.dueDate}</span>
                  <span className="text-xs t-muted">{t.sc_actions_owner}: {lang === 'zh' ? action.ownerZh : action.ownerEn}</span>
                </div>
                {action.status !== 'Closed' && (
                  <div className="flex gap-2">
                    {action.status === 'Open' && (
                      <button
                        onClick={() => updateCorrectiveActionStatus(s.supplierId, action.actionId, 'In Progress')}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)' }}
                      >
                        {t.sc_actions_mark_done}
                      </button>
                    )}
                    {action.status === 'In Progress' && (
                      <button
                        onClick={() => updateCorrectiveActionStatus(s.supplierId, action.actionId, 'Closed')}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }}
                      >
                        {t.sc_actions_close}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Detail Panel ────────────────────────────────────────────────────────

export function SupplierDetail() {
  const { lang } = useLang();
  const t = T[lang];
  const { suppliers, selectedSupplierId, activeTab, setActiveTab } = useSupplyChainStore();

  const supplier = suppliers.find((s) => s.supplierId === selectedSupplierId);
  if (!supplier) return null;

  const tabs: { key: typeof activeTab; label: string; icon: string }[] = [
    { key: 'overview',       label: t.sc_tab_overview,       icon: 'info' },
    { key: 'traceability',   label: t.sc_tab_traceability,   icon: 'route' },
    { key: 'sustainability', label: t.sc_tab_sustainability, icon: 'eco' },
    { key: 'risk',           label: t.sc_tab_risk,           icon: 'shield' },
    { key: 'actions',        label: t.sc_tab_actions,        icon: 'task' },
  ];

  const openActionCount = supplier.correctiveActions.filter((a) => a.status !== 'Closed').length;
  const highRiskCount = supplier.activeRisks.filter((r) => r.level === 'High' || r.level === 'Critical').length;

  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
    >
      {/* Supplier header */}
      <div className="px-5 pt-5 pb-0" style={{ borderBottom: '1px solid var(--border-divider)' }}>
        <div className="flex items-start gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(19,91,236,0.12)', border: '1px solid rgba(19,91,236,0.2)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#135bec' }}>factory</span>
          </div>
          <div className="flex-1">
            <p className="text-base font-bold t-primary">{lang === 'zh' ? supplier.nameZh : supplier.nameEn}</p>
            <p className="text-xs t-muted">{lang === 'zh' ? supplier.componentZh : supplier.component} · {lang === 'zh' ? supplier.countryZh : supplier.country}</p>
          </div>
          {highRiskCount > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#f87171' }}>warning</span>
              <span className="text-xs font-bold" style={{ color: '#f87171' }}>{highRiskCount}</span>
            </div>
          )}
        </div>
        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-0">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            const hasBadge = (tab.key === 'actions' && openActionCount > 0) || (tab.key === 'risk' && highRiskCount > 0);
            const badgeCount = tab.key === 'actions' ? openActionCount : highRiskCount;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-all border-b-2 flex-shrink-0"
                style={{
                  borderColor: isActive ? '#135bec' : 'transparent',
                  color: isActive ? '#135bec' : 'var(--text-muted)',
                  background: 'transparent',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{tab.icon}</span>
                {tab.label}
                {hasBadge && (
                  <span
                    className="ml-0.5 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: tab.key === 'risk' ? 'rgba(239,68,68,0.2)' : 'rgba(251,191,36,0.2)', color: tab.key === 'risk' ? '#f87171' : '#fbbf24', fontSize: '10px' }}
                  >
                    {badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-5">
        {activeTab === 'overview'       && <OverviewTab      s={supplier} t={t} lang={lang} />}
        {activeTab === 'traceability'   && <TraceabilityTab  s={supplier} t={t} />}
        {activeTab === 'sustainability' && <SustainabilityTab s={supplier} t={t} />}
        {activeTab === 'risk'           && <RiskTab           s={supplier} t={t} lang={lang} />}
        {activeTab === 'actions'        && <ActionsTab        s={supplier} t={t} lang={lang} />}
      </div>
    </div>
  );
}
