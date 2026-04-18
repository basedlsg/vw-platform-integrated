"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Shell from '@/components/Shell';
import { useLang } from '@/lib/app-context';
import { T } from '@/lib/translations';
import type { AgentProposal } from '@/lib/esaa/types';

type ProposalWithId = AgentProposal & { id: string };
type ActionState = { proposalId: string; action: 'approving' | 'rejecting' } | null;

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&#038;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime()) || d.getFullYear() < 2000) return 'Recent';
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function extractSourceUrl(description: string): string | null {
  const match = description.match(/Source:\s*(https?:\/\/[^\s]+)/);
  if (match) return match[1];
  const urlMatch = description.match(/https?:\/\/[^\s"'<>]+/);
  return urlMatch ? urlMatch[0] : null;
}

function cleanDescription(description: string): string {
  let clean = description.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  clean = clean.replace(/Source:\s*https?:\/\/[^\s]+/g, '').replace(/Published:\s*[^\n]+/g, '').trim();
  if (clean.length > 400) clean = clean.slice(0, 400) + '…';
  return clean;
}

function getTriggeredRisks(proposal: ProposalWithId): string[] {
  const pc = (proposal as unknown as { proposedStateChange?: { triggeredRisks?: string[] } }).proposedStateChange;
  return pc?.triggeredRisks ?? [];
}

const RISK_NAMES_EN: Record<string, string> = {
  RISK_TARIFF_001: 'US Tariffs', RISK_NEV_001: 'China EV Competition',
  RISK_STOCK_PRESSURE: 'Stock Price Pressure', RISK_MARGIN_001: 'Margin Erosion',
};
const RISK_NAMES_ZH: Record<string, string> = {
  RISK_TARIFF_001: '美国关税', RISK_NEV_001: '中国电动车竞争',
  RISK_STOCK_PRESSURE: '股价压力', RISK_MARGIN_001: '利润侵蚀',
};

function ReviewModal({
  proposal, onClose, onConfirm, action, lang,
}: {
  proposal: ProposalWithId; onClose: () => void; onConfirm: () => void;
  action: 'approve' | 'reject'; lang: 'en' | 'zh';
}) {
  const t = T[lang];
  const riskNames = lang === 'zh' ? RISK_NAMES_ZH : RISK_NAMES_EN;
  const sourceUrl = extractSourceUrl(proposal.description);
  const triggeredRisks = getTriggeredRisks(proposal);
  const isApprove = action === 'approve';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--overlay)' }} onClick={onClose}>
      <div className="glass-modal rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 className="text-lg font-bold t-primary">{isApprove ? t.agents_review_title : t.agents_dismiss_title}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors" style={{ background: 'var(--bg-btn-secondary)', color: 'var(--text-muted)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <p className="text-base font-semibold t-primary mb-2">{stripHtml(proposal.title)}</p>
            <p className="text-sm leading-relaxed t-body">{cleanDescription(proposal.description)}</p>
          </div>

          <div className="rounded-xl px-4 py-3 glass-blue">
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#135bec' }}>
              {isApprove ? t.agents_what_if_approved : t.agents_what_if_dismissed}
            </p>
            <p className="text-sm t-body">{proposal.suggestedAction}</p>
          </div>

          {triggeredRisks.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>{t.agents_affects}</p>
              <div className="flex flex-wrap gap-2">
                {triggeredRisks.map((r, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(249,115,22,0.15)', color: '#f97316' }}>
                    {riskNames[r] ?? r}
                  </span>
                ))}
              </div>
            </div>
          )}

          {sourceUrl && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>{t.agents_source_article}</p>
              <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm break-all" style={{ color: '#135bec' }}>
                <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: '14px' }}>open_in_new</span>
                {sourceUrl}
              </a>
            </div>
          )}
        </div>

        <div className="px-6 py-4 flex gap-3 justify-end" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-xl transition-colors"
            style={{ background: 'var(--bg-btn-secondary)', border: '1px solid var(--border-btn-sec)', color: 'var(--text-btn-sec)' }}
          >
            {t.agents_cancel}
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 text-sm font-medium rounded-xl transition-colors"
            style={{ background: isApprove ? '#135bec' : '#dc2626', color: 'white' }}
          >
            {isApprove ? t.agents_approve : t.agents_dismiss}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NewsAlertsPage(): React.JSX.Element {
  const { lang } = useLang();
  const t = T[lang];
  const riskNames = lang === 'zh' ? RISK_NAMES_ZH : RISK_NAMES_EN;

  const [proposals, setProposals] = useState<ProposalWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionState, setActionState] = useState<ActionState>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: 'approve' | 'reject' } | null>(null);
  const [pressedId, setPressedId] = useState<string | null>(null);

  const fetchProposals = useCallback(async () => {
    try {
      const res = await fetch('/api/agent/proposals');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json() as { proposals: ProposalWithId[] };
      setProposals(data.proposals.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchProposals(); }, [fetchProposals]);

  const executeAction = async (proposalId: string, action: 'approve' | 'reject') => {
    setActionState({ proposalId, action: action === 'approve' ? 'approving' : 'rejecting' });
    setConfirmAction(null);
    try {
      const res = await fetch(`/api/agent/proposals/${proposalId}/${action}`, { method: 'POST' });
      if (!res.ok) throw new Error(`Failed to ${action}`);
      setToast(`${action === 'approve' ? (lang === 'zh' ? '已批准' : 'Approved') : (lang === 'zh' ? '已忽略' : 'Dismissed')} successfully`);
      setTimeout(() => setToast(null), 3000);
      await fetchProposals();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Action failed');
      setTimeout(() => setToast(null), 3000);
    } finally {
      setActionState(null);
    }
  };

  const pending = proposals.filter(p => p.status === 'PENDING');
  const resolved = proposals.filter(p => p.status !== 'PENDING');
  const confirmProposal = confirmAction ? proposals.find(p => p.id === confirmAction.id) : null;

  return (
    <Shell>
      <div className="space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold t-primary">{t.agents_title}</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{t.agents_subtitle}</p>
          </div>
          <button
            onClick={() => { setLoading(true); void fetchProposals(); }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors"
            style={{ background: '#135bec', color: 'white' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>refresh</span>
            {t.agents_refresh}
          </button>
        </div>

        {toast && (
          <div className="fixed top-4 right-4 z-50 glass-modal rounded-xl px-4 py-3 shadow-lg text-sm t-primary">
            {toast}
          </div>
        )}

        {confirmAction && confirmProposal && (
          <ReviewModal
            proposal={confirmProposal} action={confirmAction.action} lang={lang}
            onClose={() => setConfirmAction(null)}
            onConfirm={() => void executeAction(confirmAction.id, confirmAction.action)}
          />
        )}

        {loading && (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-8 h-8 rounded-full border-2 border-t-transparent" style={{ borderColor: 'rgba(19,91,236,0.3)', borderTopColor: '#135bec' }} />
          </div>
        )}

        {error && (
          <div className="glass-card rounded-xl p-4 text-sm text-rose-400" style={{ borderColor: 'rgba(239,68,68,0.2)' }}>{error}</div>
        )}

        {!loading && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-semibold t-primary">{t.agents_needs_review}</h2>
              {pending.length > 0 && (
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full" style={{ background: 'rgba(249,115,22,0.2)', color: '#f97316' }}>
                  {pending.length}
                </span>
              )}
            </div>

            {pending.length === 0 ? (
              <div className="glass-card rounded-2xl p-8 text-center">
                <span className="material-symbols-outlined block mb-3" style={{ fontSize: '32px', color: 'var(--text-muted)' }}>check_circle</span>
                <p style={{ color: 'var(--text-muted)' }}>{t.agents_all_clear}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pending.map(proposal => {
                  const isExpanded = expandedId === proposal.id;
                  const isPressed = pressedId === proposal.id;
                  const sourceUrl = extractSourceUrl(proposal.description);
                  const isActing = actionState?.proposalId === proposal.id;
                  const triggeredRisks = getTriggeredRisks(proposal);

                  return (
                    <div
                      key={proposal.id}
                      className="glass-card rounded-2xl overflow-hidden transition-all duration-200"
                      style={{
                        borderColor: isExpanded ? 'var(--border-blue-hover)' : isPressed ? 'var(--border-blue-active)' : undefined,
                        background: isExpanded ? 'var(--bg-card-active)' : undefined,
                        boxShadow: isExpanded ? '0 0 0 2px rgba(19,91,236,0.12)' : undefined,
                        transform: isPressed ? 'scale(0.995)' : undefined,
                      }}
                    >
                      <button
                        className="w-full px-5 py-4 text-left transition-colors"
                        style={{ background: 'transparent' }}
                        onClick={() => setExpandedId(isExpanded ? null : proposal.id)}
                        onMouseDown={() => setPressedId(proposal.id)}
                        onMouseUp={() => setPressedId(null)}
                        onMouseLeave={() => setPressedId(null)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{formatDate(proposal.createdAt)}</span>
                          {sourceUrl && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(19,91,236,0.15)', color: '#135bec' }}>
                              {t.agents_external_source}
                            </span>
                          )}
                          <span className="ml-auto" style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                              {isExpanded ? 'expand_less' : 'expand_more'}
                            </span>
                          </span>
                        </div>
                        <h3 className="text-base font-semibold t-primary">{stripHtml(proposal.title)}</h3>
                        {!isExpanded && (
                          <p className="text-sm mt-1.5 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                            {cleanDescription(proposal.description)}
                          </p>
                        )}
                      </button>

                      {isExpanded && (
                        <div className="px-5 pb-5 space-y-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                          <p className="text-sm pt-4 leading-relaxed t-body">{cleanDescription(proposal.description)}</p>

                          <div className="glass-blue rounded-xl px-4 py-3">
                            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#135bec' }}>{t.agents_rec_action}</p>
                            <p className="text-sm t-body">{proposal.suggestedAction}</p>
                          </div>

                          {triggeredRisks.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>{t.agents_affects}</p>
                              <div className="flex flex-wrap gap-2">
                                {triggeredRisks.map((r, i) => (
                                  <span key={i} className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(249,115,22,0.12)', color: '#f97316' }}>
                                    {riskNames[r] ?? r}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {sourceUrl && (
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>{t.agents_source_article}</p>
                              <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm break-all" style={{ color: '#135bec' }} onClick={(e) => e.stopPropagation()}>
                                <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: '14px' }}>open_in_new</span>
                                {sourceUrl}
                              </a>
                            </div>
                          )}

                          <div className="flex gap-3 pt-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmAction({ id: proposal.id, action: 'reject' }); }}
                              disabled={!!actionState}
                              className="px-4 py-2 text-sm font-medium rounded-xl transition-colors disabled:opacity-40"
                              style={{ background: 'var(--bg-btn-secondary)', border: '1px solid var(--border-btn-sec)', color: 'var(--text-btn-sec)' }}
                            >
                              {t.agents_dismiss}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmAction({ id: proposal.id, action: 'approve' }); }}
                              disabled={isActing || !!actionState}
                              className="px-5 py-2 text-sm font-medium rounded-xl transition-colors disabled:opacity-40 flex items-center gap-2"
                              style={{ background: '#135bec', color: 'white' }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check</span>
                              {t.agents_review_approve}
                            </button>
                          </div>
                        </div>
                      )}

                      {!isExpanded && (
                        <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                          <div className="glass-blue rounded-lg px-3 py-2 flex-1 mr-4">
                            <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: '#135bec' }}>{t.agents_rec_action}</p>
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{proposal.suggestedAction}</p>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmAction({ id: proposal.id, action: 'reject' }); }}
                              disabled={!!actionState}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-40"
                              style={{ background: 'var(--bg-btn-secondary)', border: '1px solid var(--border-btn-sec)', color: 'var(--text-btn-sec)' }}
                            >
                              {t.agents_dismiss}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmAction({ id: proposal.id, action: 'approve' }); }}
                              disabled={!!actionState}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-40"
                              style={{ background: '#135bec', color: 'white' }}
                            >
                              {t.agents_review_approve}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {!loading && resolved.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold t-primary mb-3">{t.agents_prev_reviewed}</h2>
            <div className="space-y-2">
              {resolved.map(proposal => {
                const isExpanded = expandedId === `resolved-${proposal.id}`;
                const sourceUrl = extractSourceUrl(proposal.description);
                const isApproved = proposal.status === 'APPROVED';

                return (
                  <div key={proposal.id} className="glass-card rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : `resolved-${proposal.id}`)}
                      className="w-full px-5 py-3 flex items-center gap-3 text-left transition-colors"
                    >
                      <span className="px-2 py-0.5 rounded text-xs font-semibold flex-shrink-0" style={{
                        background: isApproved ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.15)',
                        color: isApproved ? '#10b981' : 'var(--text-secondary)',
                      }}>
                        {isApproved ? t.agents_approved_badge : t.agents_dismissed_badge}
                      </span>
                      <p className="text-sm font-medium flex-1 truncate t-secondary">{stripHtml(proposal.title)}</p>
                      <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{formatDate(proposal.createdAt)}</span>
                      <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: '16px', color: 'var(--text-muted)' }}>
                        {isExpanded ? 'expand_less' : 'expand_more'}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="px-5 pb-4 space-y-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                        <p className="text-sm pt-3 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                          {cleanDescription(proposal.description)}
                        </p>
                        <div className="glass-surface rounded-lg px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
                            {isApproved ? t.agents_action_taken : t.agents_orig_rec}
                          </p>
                          <p className="text-sm t-body">{proposal.suggestedAction}</p>
                        </div>
                        {sourceUrl && (
                          <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm" style={{ color: '#135bec' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>open_in_new</span>
                            {t.agents_view_source}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </Shell>
  );
}
