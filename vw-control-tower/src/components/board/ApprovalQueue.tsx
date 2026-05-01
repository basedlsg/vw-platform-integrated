'use client';

import React from 'react';
import { useLang } from '@/lib/app-context';
import { T } from '@/lib/translations';
import type { AgentProposal } from '@/lib/esaa/types';

interface Props {
  awaiting: AgentProposal[];
  inDiscussion: AgentProposal[];
  onReview: (proposal: AgentProposal) => void;
}

/**
 * The minimal manager waiting list. Items in AWAITING_APPROVAL bubble
 * to the top with a "Waiting on you" framing; items still in active
 * verification sit underneath. No avatars, no urgency badges, no
 * commitment colors — just a quiet list with one CTA.
 */
export const ApprovalQueue: React.FC<Props> = ({ awaiting, inDiscussion, onReview }) => {
  const { lang } = useLang();
  const t = T[lang];

  if (awaiting.length === 0 && inDiscussion.length === 0) {
    return (
      <p className="text-sm" style={{ color: 'var(--text-very-muted)' }}>
        {t.queue_empty}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {awaiting.length > 0 && (
        <div>
          <p
            className="text-[10px] uppercase tracking-[0.18em] mb-2"
            style={{ color: 'var(--text-muted)' }}
          >
            {t.queue_awaiting}
          </p>
          <div className="space-y-1.5">
            {awaiting.map((p) => (
              <Row key={p.id} proposal={p} kind="awaiting" onClick={() => onReview(p)} />
            ))}
          </div>
        </div>
      )}
      {inDiscussion.length > 0 && (
        <div>
          <p
            className="text-[10px] uppercase tracking-[0.18em] mb-2"
            style={{ color: 'var(--text-muted)' }}
          >
            {t.queue_discussion}
          </p>
          <div className="space-y-1.5">
            {inDiscussion.map((p) => (
              <Row key={p.id} proposal={p} kind="discussion" onClick={() => onReview(p)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const Row: React.FC<{
  proposal: AgentProposal;
  kind: 'awaiting' | 'discussion';
  onClick: () => void;
}> = ({ proposal, kind, onClick }) => {
  const { lang } = useLang();
  const t = T[lang];
  return (
    <button
      onClick={onClick}
      className="glass-card glass-card-interactive w-full text-left rounded-lg px-4 py-2.5 flex items-center gap-3 transition-all"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium t-primary truncate">{proposal.title}</p>
      </div>
      <span
        className="text-[11px] font-medium flex-shrink-0 inline-flex items-center gap-1"
        style={{ color: kind === 'awaiting' ? '#f97316' : 'var(--text-muted)' }}
      >
        {kind === 'awaiting' ? t.queue_review : t.queue_view}
        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>arrow_forward</span>
      </span>
    </button>
  );
};

export default ApprovalQueue;
