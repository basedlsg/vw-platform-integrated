'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useLang } from '@/lib/app-context';
import { T } from '@/lib/translations';
import type { AgentProposal, BaseEvent } from '@/lib/esaa/types';
import {
  buildSignalView,
  labelFor,
  PILLAR_LABELS,
  simulateOutput,
  type SignalView,
} from './meta';

type ProposalStatus = AgentProposal['status'];
type Tab = 'overview' | 'discuss' | 'simulate';

interface Props {
  proposal: AgentProposal;
  /** True when the parent is in manager-review mode (Approve/Reject bar). */
  managerMode: boolean;
  onClose: () => void;
  onStatusChanged: () => void;
}

interface ThreadEntry {
  id: string;
  direction: 'OUTBOUND' | 'INBOUND';
  participant: string;
  message: string;
  timestamp: string;
}

/**
 * The single panel that opens when a signal is clicked. Three tabs:
 *
 *   • Overview — what happened, why it matters, what it could affect,
 *                suggested change.  Plus the lifecycle action bar
 *                (Watch / Discuss / Simulate / Submit / Dismiss, or
 *                Approve / Reject in manager mode).
 *   • Discuss  — threaded message + replies, no canned chips.
 *   • Simulate — one slider, one number out, with a "Customize"
 *                affordance for a future power-user view.
 *
 * Nothing on this surface mutates planning numbers. Only the manager's
 * Approve click (which goes through the parent's transition call)
 * commits the cascade.
 */
export const Workspace: React.FC<Props> = ({
  proposal,
  managerMode,
  onClose,
  onStatusChanged,
}) => {
  const { lang } = useLang();
  const t = T[lang];

  const [tab, setTab] = useState<Tab>('overview');
  const [view, setView] = useState<SignalView | null>(null);
  const [thread, setThread] = useState<ThreadEntry[]>([]);
  const [whyItMatters, setWhyItMatters] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [busy, setBusy] = useState<ProposalStatus | null>(null);

  // Pull events for this proposal so we can read the canonical signal view + thread.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/esaa/events?entityId=${proposal.id}`);
        if (!res.ok) return;
        const events = (await res.json()) as BaseEvent[];
        if (cancelled) return;

        const built = buildSignalView(proposal, events);
        if (built) setView(built);

        const thr = events
          .filter((e) => e.type === 'ScenarioVerificationEvent')
          .map((e) => {
            const p = e.payload as Omit<ThreadEntry, 'id' | 'timestamp'>;
            return { id: e.id, timestamp: e.timestamp, ...p };
          })
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        setThread(thr);
      } catch {
        /* swallow */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [proposal]);

  // Fetch a one-line "why it matters" the moment the workspace opens.
  useEffect(() => {
    if (!view) return;
    let cancelled = false;
    const ctrl = new AbortController();
    setWhyItMatters('');
    setStreaming(true);

    (async () => {
      try {
        // Pull institutional memory before composing the prompt — past
        // decisions on the same pillars / KPIs become part of the
        // context so the explanation can reference them.
        let recallText = '';
        try {
          const recallRes = await fetch('/api/memory/recall', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ proposalId: proposal.id, limit: 4, lang }),
            signal: ctrl.signal,
          });
          if (recallRes.ok) {
            const recallData = (await recallRes.json()) as { promptText?: string };
            recallText = recallData.promptText ?? '';
          }
        } catch {
          /* recall is best-effort */
        }

        const ctx = [
          `Signal: ${view.title}`,
          `Description: ${view.description}`,
          `Strategy pillars touched: ${view.touches.join(', ') || 'none declared'}`,
          `KPIs/risks possibly affected: ${view.affects.join(', ') || 'none'}`,
          ...(recallText ? ['', recallText] : []),
        ].join('\n');

        const question = lang === 'zh'
          ? `请用1-2句中文写"为什么重要"——简洁、客观、无 markdown，无前言。如果有过去同类决策，可以提及一句"上次类似情况下，团队做了 X"，但只在数据真实的情况下，不要捏造。`
          : `In 1-2 plain English sentences, explain why this signal matters to VW Group. Calm, factual, no markdown, no bullets, no preamble. If there is relevant past-decision context, you may include one short clause like "last time something similar came up the team did X" — but only if the data supports it; do not invent.`;

        const res = await fetch('/api/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question, context: ctx, maxTokens: 180 }),
          signal: ctrl.signal,
        });
        if (cancelled) return;
        const data = (await res.json()) as { answer?: string };
        if (cancelled) return;
        setWhyItMatters((data.answer ?? '').trim());
      } catch {
        // Network/abort — leave empty; the skeleton stays visible.
      } finally {
        if (!cancelled) setStreaming(false);
      }
    })();

    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [view, lang]);

  async function transition(newStatus: ProposalStatus) {
    setBusy(newStatus);
    try {
      const res = await fetch(`/api/agent/proposals/${proposal.id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newStatus,
          actor: managerMode ? 'CFO Office' : 'FP&A Analyst',
        }),
      });
      if (!res.ok) throw new Error(`Transition failed: ${res.status}`);
      onStatusChanged();
      const closes: ProposalStatus[] = ['APPROVED', 'REJECTED', 'DISMISSED'];
      if (managerMode || closes.includes(newStatus)) onClose();
    } catch (err) {
      console.error('Workspace.transition', err);
    } finally {
      setBusy(null);
    }
  }

  async function refreshThread() {
    try {
      const res = await fetch(`/api/esaa/events?entityId=${proposal.id}`);
      if (!res.ok) return;
      const events = (await res.json()) as BaseEvent[];
      const thr = events
        .filter((e) => e.type === 'ScenarioVerificationEvent')
        .map((e) => {
          const p = e.payload as Omit<ThreadEntry, 'id' | 'timestamp'>;
          return { id: e.id, timestamp: e.timestamp, ...p };
        })
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setThread(thr);
    } catch {
      /* swallow */
    }
  }

  const isAwaitingApproval = proposal.status === 'AWAITING_APPROVAL';
  const showApprovalBar = managerMode || isAwaitingApproval;

  // ESC closes the panel.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end"
      style={{ background: 'var(--overlay)' }}
      onClick={onClose}
    >
      <div
        className="glass-modal h-full w-full max-w-xl flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ borderLeft: '1px solid var(--border-subtle)' }}
      >
        {/* Header */}
        <div
          className="px-7 pt-7 pb-5 flex items-start justify-between gap-3"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div className="min-w-0 flex-1">
            <p
              className="text-[10px] uppercase tracking-[0.18em] mb-2"
              style={{ color: 'var(--text-very-muted)' }}
            >
              {t[`status_${proposal.status.toLowerCase()}` as keyof typeof t] ?? proposal.status}
            </p>
            <h2 className="text-lg font-semibold t-primary leading-snug">{proposal.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0 transition-colors"
            style={{ background: 'var(--bg-btn-secondary)', color: 'var(--text-muted)' }}
            aria-label={t.workspace_close_aria}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
          </button>
        </div>

        {/* Tab strip */}
        <div
          className="px-7 flex items-center gap-1"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <TabButton
            active={tab === 'overview'}
            onClick={() => setTab('overview')}
            label={t.workspace_tab_overview}
          />
          <TabButton
            active={tab === 'discuss'}
            onClick={() => setTab('discuss')}
            label={t.workspace_tab_discuss}
            badge={thread.length > 0 ? thread.length : undefined}
          />
          {view?.sensitivity && (
            <TabButton
              active={tab === 'simulate'}
              onClick={() => setTab('simulate')}
              label={t.workspace_tab_simulate}
            />
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-7 py-6">
          {tab === 'overview' && view && (
            <OverviewBody view={view} whyItMatters={whyItMatters} streaming={streaming} />
          )}
          {tab === 'discuss' && (
            <DiscussBody
              proposalId={proposal.id}
              view={view}
              thread={thread}
              onAfterPost={refreshThread}
            />
          )}
          {tab === 'simulate' && view?.sensitivity && (
            <SimulateBody view={view} />
          )}
        </div>

        {/* Action bar */}
        <div
          className="px-7 py-4 flex items-center gap-2"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          {!showApprovalBar && (
            <>
              <ActionButton
                disabled={busy !== null || proposal.status === 'WATCHING'}
                onClick={() => void transition('WATCHING')}
                label={t.workspace_action_watch}
              />
              <ActionButton
                disabled={busy !== null}
                onClick={() => setTab('discuss')}
                label={t.workspace_action_discuss}
              />
              {view?.sensitivity && (
                <ActionButton
                  disabled={busy !== null}
                  onClick={() => setTab('simulate')}
                  label={t.workspace_action_simulate}
                />
              )}
              <div className="flex-1" />
              <ActionButton
                disabled={busy !== null}
                onClick={() => void transition('DISMISSED')}
                label={t.workspace_action_dismiss}
                variant="quiet"
              />
              <ActionButton
                disabled={busy !== null}
                onClick={() => void transition('AWAITING_APPROVAL')}
                label={t.workspace_action_submit}
                variant="primary"
              />
            </>
          )}

          {showApprovalBar && (
            <>
              <ActionButton
                disabled={busy !== null}
                onClick={() => void transition('REJECTED')}
                label={t.workspace_action_reject}
                variant="reject"
              />
              <div className="flex-1" />
              <ActionButton
                disabled={busy !== null}
                onClick={() => void transition('WATCHING')}
                label={t.workspace_action_watch}
                variant="quiet"
              />
              <ActionButton
                disabled={busy !== null}
                onClick={() => void transition('APPROVED')}
                label={t.workspace_action_approve}
                variant="approve"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Sub-components — kept inline so the workspace lives in one file.
// ---------------------------------------------------------------------------

const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  label: string;
  badge?: number;
}> = ({ active, onClick, label, badge }) => (
  <button
    onClick={onClick}
    className="px-3 py-2.5 text-xs font-medium transition-colors relative"
    style={{
      color: active ? 'var(--text-primary)' : 'var(--text-muted)',
      borderBottom: `1px solid ${active ? '#135bec' : 'transparent'}`,
    }}
  >
    {label}
    {badge !== undefined && badge > 0 && (
      <span
        className="ml-1.5 inline-flex items-center justify-center text-[9px] font-bold rounded-full"
        style={{
          background: active ? '#135bec' : 'var(--text-very-muted)',
          color: 'white',
          minWidth: '15px',
          height: '15px',
          padding: '0 4px',
        }}
      >
        {badge}
      </span>
    )}
  </button>
);

const ActionButton: React.FC<{
  disabled?: boolean;
  onClick: () => void;
  label: string;
  variant?: 'primary' | 'approve' | 'reject' | 'quiet' | 'default';
}> = ({ disabled, onClick, label, variant = 'default' }) => {
  const styles: Record<NonNullable<typeof variant>, React.CSSProperties> = {
    primary: { background: '#135bec', color: 'white' },
    approve: { background: '#10b981', color: 'white' },
    reject:  { background: 'transparent', color: '#ef4444', border: '1px solid #ef444440' },
    quiet:   { background: 'transparent', color: 'var(--text-muted)' },
    default: { background: 'var(--bg-btn-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' },
  };
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="px-3 py-2 text-xs font-medium rounded-lg transition-colors disabled:opacity-40"
      style={styles[variant]}
    >
      {label}
    </button>
  );
};

const OverviewBody: React.FC<{
  view: SignalView;
  whyItMatters: string;
  streaming: boolean;
}> = ({ view, whyItMatters, streaming }) => {
  const { lang } = useLang();
  const t = T[lang];

  const kpiChanges = Object.entries(view.proposedStateChange.kpis ?? {}).filter(
    ([, c]) => typeof c?.target === 'number'
  );
  const riskChanges = Object.entries(view.proposedStateChange.risks ?? {}).filter(
    ([, c]) => typeof c?.threshold === 'number' && c?.impact
  );

  return (
    <div className="space-y-7 text-sm leading-relaxed">
      <div>
        <p className="text-[10px] uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-muted)' }}>
          {t.workspace_what_happened}
        </p>
        <p style={{ color: 'var(--text-body)' }}>{view.description}</p>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-muted)' }}>
          {t.workspace_why_it_matters}
        </p>
        {whyItMatters ? (
          <p style={{ color: 'var(--text-body)' }}>
            {whyItMatters}
            {streaming && (
              <span
                aria-hidden
                className="ml-1 inline-block w-[2px] h-[14px] align-middle animate-pulse"
                style={{ background: '#135bec' }}
              />
            )}
          </p>
        ) : (
          <div className="space-y-1.5">
            <div className="h-3 w-3/4 rounded animate-pulse" style={{ background: 'var(--border-subtle)' }} />
            <div className="h-3 w-1/2 rounded animate-pulse" style={{ background: 'var(--border-subtle)' }} />
          </div>
        )}
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-muted)' }}>
          {t.workspace_could_affect}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {view.touches.map((p) => {
            const lbl = PILLAR_LABELS[p];
            if (!lbl) return null;
            return (
              <span
                key={p}
                className="text-xs font-medium"
                style={{ color: lbl.color }}
              >
                {lbl[lang]}
              </span>
            );
          })}
          {view.affects.map((id) => (
            <span key={id} className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {labelFor(id, lang)}
            </span>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-muted)' }}>
          {t.workspace_suggested_change}
        </p>
        <p style={{ color: 'var(--text-body)' }}>{view.suggestedAction}</p>
        {(kpiChanges.length > 0 || riskChanges.length > 0) && (
          <div className="mt-3 space-y-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            {kpiChanges.map(([id, c]) => (
              <div key={id}>
                <span style={{ color: 'var(--text-secondary)' }}>{labelFor(id, lang)}</span>
                <span className="mx-1.5">→</span>
                <span className="t-primary font-medium">{c.target}%</span>
              </div>
            ))}
            {riskChanges.map(([id, c]) => (
              <div key={id}>
                <span style={{ color: 'var(--text-secondary)' }}>{labelFor(id, lang)}</span>
                <span className="mx-1.5">→</span>
                <span className="t-primary font-medium">{c.threshold}</span>
                <span className="mx-1" style={{ color: 'var(--text-very-muted)' }}>·</span>
                <span style={{ color: c.impact === 'HIGH' ? '#ef4444' : c.impact === 'MEDIUM' ? '#f97316' : '#10b981' }}>
                  {c.impact}
                </span>
              </div>
            ))}
            <p className="text-[10px] italic pt-2" style={{ color: 'var(--text-very-muted)' }}>
              {t.workspace_no_change_until_approve}
            </p>
          </div>
        )}
      </div>

      {view.source && (
        <p
          className="pt-2 text-[11px]"
          style={{ color: 'var(--text-very-muted)', borderTop: '1px solid var(--border-subtle)' }}
        >
          {view.source.publication} · {view.source.date}
        </p>
      )}
    </div>
  );
};

/**
 * Pick the stakeholder who would naturally answer this signal based
 * on the first strategy pillar it touches. Falls back to a generic
 * FP&A lead if the signal has no declared touches.
 */
function stakeholderFor(view: SignalView | null, lang: 'en' | 'zh'): string {
  const STAKEHOLDERS: Record<string, { en: string; zh: string }> = {
    CHINA:          { en: 'China Finance',          zh: '中国财务' },
    EV:             { en: 'EV Strategy',            zh: '电动车战略' },
    REGULATORY:     { en: 'Trade & Tariff Desk',    zh: '贸易与关税' },
    INVENTORY:      { en: 'Inventory Ops',          zh: '库存运营' },
    CASH:           { en: 'Treasury',               zh: '资金部' },
    MARGIN:         { en: 'FP&A Lead',              zh: 'FP&A 负责人' },
    SUSTAINABILITY: { en: 'Sustainability Office',  zh: '可持续办公室' },
  };
  const pillar = view?.touches?.[0];
  const s = pillar ? STAKEHOLDERS[pillar] : undefined;
  return s ? s[lang] : (lang === 'zh' ? 'FP&A 负责人' : 'FP&A Lead');
}

const DiscussBody: React.FC<{
  proposalId: string;
  view: SignalView | null;
  thread: ThreadEntry[];
  onAfterPost: () => Promise<void> | void;
}> = ({ proposalId, view, thread, onAfterPost }) => {
  const { lang } = useLang();
  const t = T[lang];
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);

  async function send() {
    const msg = draft.trim();
    if (!msg) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/agent/proposals/${proposalId}/discuss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          direction: 'OUTBOUND',
          participant: 'You',
          message: msg,
        }),
      });
      if (!res.ok) throw new Error(`Discuss POST failed: ${res.status}`);
      setDraft('');
      await onAfterPost();
    } catch (err) {
      console.error('DiscussBody.send', err);
    } finally {
      setPosting(false);
    }
  }

  async function simulateReply() {
    if (!view) return;
    setPosting(true);
    try {
      const stakeholder = stakeholderFor(view, lang);
      const lastOutbound = [...thread].reverse().find((e) => e.direction === 'OUTBOUND');
      const conversation = thread
        .map((e) => `${e.participant}: ${e.message}`)
        .join('\n');

      // Past decisions on the same pillars — gives the simulated
      // stakeholder a way to say "we already decided X last quarter"
      // when that's actually true.
      let recallText = '';
      try {
        const recallRes = await fetch('/api/memory/recall', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ proposalId: proposalId, limit: 3, lang }),
        });
        if (recallRes.ok) {
          const recallData = (await recallRes.json()) as { promptText?: string };
          recallText = recallData.promptText ?? '';
        }
      } catch {
        /* recall is best-effort */
      }

      const ctx = [
        `Signal: ${view.title}`,
        `Description: ${view.description}`,
        `Strategy pillars touched: ${view.touches.join(', ') || 'none'}`,
        `KPIs/risks possibly affected: ${view.affects.join(', ') || 'none'}`,
        '',
        `You are ${stakeholder} at VW Group, replying inside the Decision Board to the FP&A analyst.`,
        ...(recallText ? ['', recallText] : []),
        '',
        `Conversation so far:`,
        conversation || '(analyst has not asked anything yet)',
      ].join('\n');

      const lastQuestion = lastOutbound?.message ?? '(no specific question yet)';
      const question = lang === 'zh'
        ? `请扮演 ${stakeholder} 的角色，对分析师的最新问题给出 1-3 句简短、克制、专业的回复。最新问题："${lastQuestion}"。直接给出回复内容，不要前言、不要 markdown。`
        : `Reply as ${stakeholder} to the analyst's latest question in 1-3 short, calm, professional sentences. Reference real numbers from the signal where useful. The latest question was: "${lastQuestion}". Reply directly — no preamble, no markdown.`;

      const askRes = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, context: ctx, maxTokens: 200 }),
      });
      const askData = (await askRes.json()) as { answer?: string };
      const message = (askData.answer ?? '').trim();
      if (!message) {
        // Llama returned empty — don't post a blank message.
        setPosting(false);
        return;
      }

      const res = await fetch(`/api/agent/proposals/${proposalId}/discuss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          direction: 'INBOUND',
          participant: stakeholder,
          message,
        }),
      });
      if (!res.ok) throw new Error(`Discuss POST failed: ${res.status}`);
      await onAfterPost();
    } catch (err) {
      console.error('DiscussBody.simulateReply', err);
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        {thread.length === 0 && (
          <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>
            {t.discuss_thread_empty}
          </p>
        )}
        {thread.map((e) => {
          const isYou = e.direction === 'OUTBOUND';
          return (
            <div
              key={e.id}
              className="text-sm leading-relaxed"
              style={{
                paddingLeft: isYou ? 0 : 14,
                borderLeft: isYou ? 'none' : '1px solid var(--border-subtle)',
              }}
            >
              <p
                className="text-[10px] uppercase tracking-[0.16em] mb-0.5"
                style={{ color: isYou ? 'var(--text-muted)' : '#0ea5e9' }}
              >
                {e.participant}
              </p>
              <p style={{ color: 'var(--text-body)' }}>{e.message}</p>
            </div>
          );
        })}
      </div>

      <div
        className="space-y-2 pt-4"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          placeholder={t.discuss_compose_placeholder}
          className="w-full text-sm px-3 py-2 rounded-lg leading-relaxed"
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-input)',
            color: 'var(--text-primary)',
            resize: 'vertical',
          }}
        />
        <div className="flex items-center gap-2">
          <button
            disabled={posting || !draft.trim()}
            onClick={() => void send()}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors disabled:opacity-40"
            style={{ background: '#135bec', color: 'white' }}
          >
            {t.discuss_send_btn}
          </button>
          <button
            disabled={posting}
            onClick={() => void simulateReply()}
            className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-40"
            style={{
              background: 'transparent',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {t.discuss_simulate_reply_btn}
          </button>
        </div>
      </div>
    </div>
  );
};

const SimulateBody: React.FC<{ view: SignalView }> = ({ view }) => {
  const { lang } = useLang();
  const t = T[lang];
  const s = view.sensitivity!;
  const [input, setInput] = useState(s.inputDefault);
  const [customizing, setCustomizing] = useState(false);

  const output = useMemo(() => simulateOutput(s, input), [s, input]);
  const displayOutput = output.toFixed(Math.abs(output) < 1 ? 2 : 1);
  const inputLabel = lang === 'zh' ? s.inputLabel_zh : s.inputLabel_en;
  const outputLabel = lang === 'zh' ? s.outputLabel_zh : s.outputLabel_en;

  return (
    <div className="space-y-7">
      <div>
        <p className="text-[10px] uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-muted)' }}>
          {t.simulate_label}
        </p>
        <p className="text-sm" style={{ color: 'var(--text-body)' }}>
          {t.simulate_explainer}
        </p>
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-3">
          <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            {inputLabel}
          </p>
          <p className="text-2xl font-semibold t-primary">
            {input.toFixed(Math.abs(s.inputStep) < 1 ? 1 : 0)}
            <span className="text-sm ml-1" style={{ color: 'var(--text-muted)' }}>{s.inputUnit}</span>
          </p>
        </div>
        <input
          type="range"
          min={s.inputMin}
          max={s.inputMax}
          step={s.inputStep}
          value={input}
          onChange={(e) => setInput(parseFloat(e.target.value))}
          className="w-full"
          style={{ accentColor: '#135bec' }}
        />
        <div className="flex items-center justify-between text-[10px] mt-1" style={{ color: 'var(--text-very-muted)' }}>
          <span>{s.inputMin}</span>
          <span>{s.inputMax}</span>
        </div>
      </div>

      <div
        className="rounded-xl px-5 py-4"
        style={{ background: 'var(--bg-blue-tint)', border: '1px solid var(--border-blue)' }}
      >
        <p className="text-[10px] uppercase tracking-[0.18em] mb-1.5" style={{ color: '#135bec' }}>
          {t.simulate_estimate}
        </p>
        <p className="text-3xl font-semibold t-primary">
          {output >= 0 ? '+' : ''}{displayOutput}
          <span className="text-base ml-1" style={{ color: 'var(--text-muted)' }}>{s.outputUnit}</span>
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{outputLabel}</p>
      </div>

      <div>
        <button
          onClick={() => setCustomizing((v) => !v)}
          className="text-xs font-medium inline-flex items-center gap-1 transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>tune</span>
          {customizing ? t.simulate_customize_close : t.simulate_customize}
        </button>
        {customizing && (
          <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
            {t.simulate_customize_placeholder}
          </p>
        )}
      </div>
    </div>
  );
};

export default Workspace;
