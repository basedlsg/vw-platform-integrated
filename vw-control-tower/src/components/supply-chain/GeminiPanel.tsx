'use client';

import React, { useState } from 'react';
import { useLang } from '@/lib/app-context';
import { T } from '@/lib/translations';
import { useSupplyChainStore } from '@/lib/supply-chain/store';
import type { SCRecommendedAction } from '@/lib/supply-chain/types';

const PRIORITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Critical: { bg: 'rgba(239,68,68,0.10)',  text: '#f87171', border: 'rgba(239,68,68,0.25)' },
  High:     { bg: 'rgba(249,115,22,0.10)', text: '#fb923c', border: 'rgba(249,115,22,0.25)' },
  Medium:   { bg: 'rgba(251,191,36,0.10)', text: '#fbbf24', border: 'rgba(251,191,36,0.25)' },
};

export function GeminiPanel() {
  const { lang } = useLang();
  const t = T[lang];
  const {
    suppliers,
    selectedSupplierId,
    recommendedActions,
    actionsLoading,
    actionsError,
    setRecommendedActions,
    setActionsLoading,
    setActionsError,
    updateActionStatus,
  } = useSupplyChainStore();

  const [expanded, setExpanded] = useState<string | null>(null);

  const supplier = suppliers.find((s) => s.supplierId === selectedSupplierId);

  const generateRecommendations = async () => {
    if (!supplier) return;
    setActionsLoading(true);
    setActionsError(null);
    try {
      const res = await fetch('/api/supply-chain/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplier, lang }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRecommendedActions(data.actions ?? []);
    } catch (err) {
      setActionsError(err instanceof Error ? err.message : 'Error');
    } finally {
      setActionsLoading(false);
    }
  };

  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-divider)' }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(19,91,236,0.15)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#135bec' }}>auto_awesome</span>
          </div>
          <p className="text-sm font-semibold t-primary">{t.sc_gemini_title}</p>
        </div>
        <button
          onClick={generateRecommendations}
          disabled={actionsLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{
            background: actionsLoading ? 'var(--bg-surface)' : 'rgba(19,91,236,0.15)',
            color: actionsLoading ? 'var(--text-muted)' : '#135bec',
            border: '1px solid rgba(19,91,236,0.25)',
          }}
        >
          {actionsLoading
            ? <><span className="material-symbols-outlined animate-spin" style={{ fontSize: '14px' }}>progress_activity</span> {t.sc_gemini_generating}</>
            : <><span className="material-symbols-outlined" style={{ fontSize: '14px' }}>play_arrow</span> {t.sc_gemini_generate}</>
          }
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {actionsError && (
          <div className="p-3 rounded-xl mb-3 text-xs" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
            {actionsError}
          </div>
        )}

        {recommendedActions.length === 0 && !actionsLoading && (
          <div className="flex flex-col items-center justify-center py-10 t-muted text-center">
            <span className="material-symbols-outlined text-4xl mb-3" style={{ color: 'var(--text-muted)' }}>auto_awesome</span>
            <p className="text-sm font-medium t-primary mb-1">{t.sc_gemini_title}</p>
            <p className="text-xs t-muted max-w-48">
              {lang === 'zh'
                ? '点击"生成推荐"分析所选供应商的供应链风险'
                : 'Click Generate Recommendations to analyse the selected supplier\'s supply chain risks'}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {recommendedActions.map((action: SCRecommendedAction) => {
            const pc = PRIORITY_COLORS[action.priority] ?? PRIORITY_COLORS.Medium;
            const isOpen = expanded === action.actionId;

            return (
              <div
                key={action.actionId}
                className="rounded-xl overflow-hidden"
                style={{ background: pc.bg, border: `1px solid ${pc.border}` }}
              >
                <button
                  onClick={() => setExpanded(isOpen ? null : action.actionId)}
                  className="w-full text-left px-4 py-3"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${pc.text}22`, color: pc.text }}>
                      {action.priority}
                    </span>
                    {action.blocksAward && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
                        {t.sc_gemini_blocks_award}
                      </span>
                    )}
                    <span className="ml-auto text-xs t-muted">{action.daysToResolve}d</span>
                    <span className="material-symbols-outlined t-muted" style={{ fontSize: '16px', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }}>expand_more</span>
                  </div>
                  <p className="text-sm font-semibold t-primary">{lang === 'zh' ? action.titleZh : action.titleEn}</p>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 space-y-3">
                    <div className="p-3 rounded-lg" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                      <p className="text-xs font-semibold t-muted uppercase tracking-wider mb-1">{t.sc_gemini_issue}</p>
                      <p className="text-xs t-body">{lang === 'zh' ? action.issueZh : action.issueEn}</p>
                    </div>
                    <div className="p-3 rounded-lg" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                      <p className="text-xs font-semibold t-muted uppercase tracking-wider mb-1">{t.sc_gemini_why}</p>
                      <p className="text-xs t-body">{lang === 'zh' ? action.whyMattersZh : action.whyMattersEn}</p>
                    </div>
                    <div className="p-3 rounded-lg" style={{ background: 'rgba(19,91,236,0.08)', border: '1px solid rgba(19,91,236,0.2)' }}>
                      <p className="text-xs font-semibold mb-1" style={{ color: '#135bec' }}>{t.sc_gemini_next}</p>
                      <p className="text-xs t-body">{lang === 'zh' ? action.nextActionZh : action.nextActionEn}</p>
                    </div>
                    {action.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateActionStatus(action.actionId, 'approved')}
                          className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                          style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }}
                        >
                          {t.sc_gemini_approve}
                        </button>
                        <button
                          onClick={() => updateActionStatus(action.actionId, 'deferred')}
                          className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                          style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
                        >
                          {t.sc_gemini_defer}
                        </button>
                      </div>
                    )}
                    {action.status !== 'pending' && (
                      <p className="text-xs text-center font-semibold" style={{ color: action.status === 'approved' ? '#4ade80' : 'var(--text-muted)' }}>
                        {action.status === 'approved' ? '✓ Approved' : '⏸ Deferred'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
