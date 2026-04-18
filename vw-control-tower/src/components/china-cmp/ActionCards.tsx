"use client";

import React, { useState } from 'react';
import { T } from '@/lib/translations';
import type { RecommendedAction, ChinaCmpProgramSnapshot } from '@/lib/china-cmp/types';

const RISK_COLOR: Record<string, string> = {
  'supply-chain-risk':       '#ef4444',
  'volume-commitment-risk':  '#f59e0b',
  'technical-risk':          '#8b5cf6',
  'regulatory-risk':         '#135bec',
  'engineering-risk':        '#f97316',
  'relationship-risk':       '#ec4899',
  'margin-at-risk-next-90-days': '#ef4444',
  'engineering-capacity-constraint': '#f59e0b',
};

const STATUS_CONFIG = {
  pending:  { color: 'var(--text-muted)',   bg: 'var(--bg-surface)' },
  approved: { color: '#10b981',             bg: 'rgba(16,185,129,0.12)' },
  deferred: { color: '#f59e0b',             bg: 'rgba(245,158,11,0.12)' },
  rejected: { color: '#ef4444',             bg: 'rgba(239,68,68,0.12)' },
};

interface ActionCardProps {
  action: RecommendedAction;
  rank: number;
  lang: 'en' | 'zh';
  onStatusChange: (actionId: string, status: RecommendedAction['status']) => void;
  onMoreResearch: (actionId: string) => void;
}

function ActionCard({ action, rank, lang, onStatusChange, onMoreResearch }: ActionCardProps) {
  const t = T[lang];
  const [expanded, setExpanded] = useState(false);
  const title = lang === 'zh' ? action.titleZh : action.titleEn;
  const description = lang === 'zh' ? action.descriptionZh : action.descriptionEn;
  const dependencies = lang === 'zh' ? action.dependenciesZh : action.dependencies;
  const riskFlags = lang === 'zh' ? action.riskFlagsZh : action.riskFlags;
  const statusCfg = STATUS_CONFIG[action.status];
  const isActed = action.status !== 'pending';

  return (
    <div
      className="glass-card rounded-2xl overflow-hidden transition-all"
      style={{ borderLeft: `3px solid ${rank === 0 ? '#135bec' : rank === 1 ? '#10b981' : rank === 2 ? '#f59e0b' : '#8b5cf6'}` }}
    >
      {/* Card header */}
      <button
        className="w-full text-left px-5 py-4"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <span
              className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: rank === 0 ? '#135bec' : rank === 1 ? '#10b981' : rank === 2 ? '#f59e0b' : '#8b5cf6' }}
            >
              {rank + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold t-primary leading-snug">{title}</p>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <span className="text-xs font-bold" style={{ color: '#135bec' }}>
                  {t.china_cmp_actions_impact} {action.impactPct}{t.china_cmp_pp}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {t.china_cmp_actions_lead_time}: {action.leadTimeWeeks}{t.china_cmp_actions_weeks}
                </span>
                <span className="text-xs" style={{ color: '#ef4444' }}>
                  {t.china_cmp_actions_margin_risk}: {action.marginAtRiskIfSkipped}{t.china_cmp_pp}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isActed && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: statusCfg.bg, color: statusCfg.color }}>
                {action.status === 'approved' ? t.china_cmp_actions_approved
                  : action.status === 'deferred' ? t.china_cmp_actions_deferred
                  : t.china_cmp_actions_rejected}
              </span>
            )}
            <span className="material-symbols-outlined t-muted" style={{ fontSize: '18px', transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none' }}>
              expand_more
            </span>
          </div>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <p className="text-sm t-body leading-relaxed pt-3">{description}</p>

          {/* Dependencies */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-very-muted)' }}>
              {t.china_cmp_actions_dependencies}
            </p>
            <ul className="space-y-1">
              {dependencies.map((dep, i) => (
                <li key={i} className="flex items-start gap-2 text-xs t-secondary">
                  <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#135bec', marginTop: 1 }}>check_circle</span>
                  {dep}
                </li>
              ))}
            </ul>
          </div>

          {/* Risk flags */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-very-muted)' }}>
              {t.china_cmp_actions_risk_flags}
            </p>
            <div className="flex gap-1.5 flex-wrap">
              {riskFlags.map((flag, i) => {
                const color = RISK_COLOR[action.riskFlags[i]] ?? '#8b5cf6';
                return (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: `${color}20`, color }}>
                    {flag}
                  </span>
                );
              })}
            </div>
          </div>

          {/* EUR impact */}
          <div className="flex items-center gap-4 text-xs">
            <span style={{ color: '#135bec' }}>
              {t.china_cmp_eur_impact}: <strong>€{action.impactEurM}M</strong>/yr
            </span>
            <span style={{ color: 'var(--text-muted)' }}>
              {t.china_cmp_decision_feasibility}: {action.feasibilityScore}/5
            </span>
            <span style={{ color: 'var(--text-muted)' }}>
              {t.china_cmp_decision_risk}: {action.riskScore}/5
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-1 flex-wrap">
            {!isActed && (
              <>
                <button
                  onClick={() => onStatusChange(action.actionId, 'approved')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                  style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check</span>
                  {t.china_cmp_actions_approve}
                </button>
                <button
                  onClick={() => onStatusChange(action.actionId, 'deferred')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                  style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>schedule</span>
                  {t.china_cmp_actions_defer}
                </button>
                <button
                  onClick={() => onStatusChange(action.actionId, 'rejected')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                  style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                  {t.china_cmp_actions_reject}
                </button>
              </>
            )}
            <button
              onClick={() => onMoreResearch(action.actionId)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all"
              style={{ background: 'rgba(19,91,236,0.12)', color: '#135bec', border: '1px solid rgba(19,91,236,0.25)' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>science</span>
              {t.china_cmp_more_research}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface Props {
  program: ChinaCmpProgramSnapshot;
  lang: 'en' | 'zh';
  onStatusChange: (actionId: string, status: RecommendedAction['status']) => void;
  onRegenerateActions: () => void;
  onMoreResearch: (actionId: string) => void;
  loading: boolean;
  error: string | null;
}

export function ActionCards({ program, lang, onStatusChange, onRegenerateActions, onMoreResearch, loading, error }: Props) {
  const t = T[lang];
  const actions = program.recommendedActions;

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-base font-semibold t-primary">{t.china_cmp_actions_title}</h3>
        <button
          onClick={onRegenerateActions}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl transition-all disabled:opacity-50"
          style={{
            background: 'rgba(19,91,236,0.12)',
            color: '#135bec',
            border: '1px solid rgba(19,91,236,0.25)',
          }}
        >
          {loading ? (
            <>
              <div className="w-3 h-3 rounded-full border border-t-transparent animate-spin" style={{ borderColor: 'rgba(19,91,236,0.3)', borderTopColor: '#135bec' }} />
              {t.china_cmp_actions_generating}
            </>
          ) : (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>auto_awesome</span>
              {t.china_cmp_actions_generate}
            </>
          )}
        </button>
      </div>
      <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>{t.china_cmp_actions_subtitle}</p>

      {error && (
        <div className="mb-4 px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
          {error}
        </div>
      )}

      <div className="space-y-3">
        {actions.map((action, i) => (
          <ActionCard
            key={action.actionId}
            action={action}
            rank={i}
            lang={lang}
            onStatusChange={onStatusChange}
            onMoreResearch={onMoreResearch}
          />
        ))}
      </div>
    </div>
  );
}
