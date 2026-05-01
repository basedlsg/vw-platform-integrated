'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useESAAStore } from '@/lib/esaa/store';
import { useLang } from '@/lib/app-context';
import { T } from '@/lib/translations';
import { KPI_LABELS } from './meta';

/**
 * The calm, two-to-four sentence briefing that sits at the top of the
 * Decision Board. Streams from /api/ask, anchored to the current KPI
 * snapshot + the active signal queue so the wording is real and not
 * hallucinated. Re-streams whenever the underlying state changes
 * meaningfully (KPI value, count of pending signals).
 */
export const Briefing: React.FC = () => {
  const { lang } = useLang();
  const t = T[lang];
  const kpis = useESAAStore((s) => s.state.kpis);
  const proposals = useESAAStore((s) => s.state.proposals);
  const isHydrated = useESAAStore((s) => s.isHydrated);

  const [text, setText] = useState('');
  const [streaming, setStreaming] = useState(false);
  const reqRef = useRef(0);

  /**
   * A short, stable hash of the bits of state that should re-trigger
   * the briefing. Keeps the regeneration narrow — we don't want it
   * firing on every render.
   */
  const stateHash = useMemo(() => {
    const kpiBits = Object.values(kpis)
      .map((k) => `${k.id}:${k.currentValue}`)
      .sort()
      .join('|');
    const pending = Object.values(proposals).filter(
      (p) => p.status === 'PENDING' || p.status === 'WATCHING' || p.status === 'AWAITING_APPROVAL'
    ).length;
    return `${kpiBits}::pending=${pending}::lang=${lang}`;
  }, [kpis, proposals, lang]);

  useEffect(() => {
    if (!isHydrated) return;

    const reqId = ++reqRef.current;
    const controller = new AbortController();

    (async () => {
      const kpiLines = Object.values(kpis)
        .map((k) => {
          const lbl = KPI_LABELS[k.id];
          const name = lbl ? lbl.en : k.id;
          const unit = lbl?.unit ?? '';
          return `${name}: ${k.currentValue}${unit}`;
        })
        .join('\n');
      const activeProps = Object.values(proposals).filter(
        (p) =>
          p.status === 'PENDING' ||
          p.status === 'WATCHING' ||
          p.status === 'AWAITING_APPROVAL'
      );
      const activeSignals = activeProps
        .map((p) => `- ${p.title} (status: ${p.status})`)
        .join('\n');

      const ctx = [
        'Current VW Group KPIs:',
        kpiLines || '(no KPI data yet)',
        '',
        'Active signals in the queue:',
        activeSignals || '(no active signals)',
      ].join('\n');

      const question = lang === 'zh'
        ? `用2-4句话写一段安静、客观的"今日观察"。第一句说总体情况；第二句说一个具体压力点；第三句说一个稳定或抵消因素；第四句（可选）建议未来几周关注什么。语气克制，无标点夸张，无markdown，无标题，无前言。`
        : `Write a calm, factual 2-to-4 sentence briefing for VW's CFO office about what the morning looks like. First sentence: the overall picture. Second: a single specific pressure point. Third: a stabilizing or offsetting factor. Fourth (optional): one thing to watch. No bullets, no headings, no markdown, no exclamation, no preamble.`;

      try {
        setStreaming(true);
        setText('');
        const res = await fetch('/api/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question, context: ctx, maxTokens: 220 }),
          signal: controller.signal,
        });
        if (reqId !== reqRef.current) return;

        const data = (await res.json()) as { answer?: string };
        if (reqId !== reqRef.current) return;
        setText((data.answer ?? '').trim());
      } catch {
        // Network/abort — leave text empty; the loading skeleton stays visible.
      } finally {
        if (reqId === reqRef.current) setStreaming(false);
      }
    })();

    return () => controller.abort();
  }, [stateHash, isHydrated, kpis, proposals, lang]);

  return (
    <div className="px-1 py-2">
      <p
        className="text-[10px] uppercase tracking-[0.18em] mb-3"
        style={{ color: 'var(--text-muted)' }}
      >
        {t.briefing_label}
      </p>
      {!isHydrated || (streaming && !text) ? (
        <div className="space-y-2">
          <div className="h-3 w-3/4 rounded animate-pulse" style={{ background: 'var(--border-subtle)' }} />
          <div className="h-3 w-2/3 rounded animate-pulse" style={{ background: 'var(--border-subtle)' }} />
          <div className="h-3 w-3/5 rounded animate-pulse" style={{ background: 'var(--border-subtle)' }} />
        </div>
      ) : (
        <p
          className="text-base leading-relaxed"
          style={{ color: 'var(--text-body)', maxWidth: '60ch' }}
        >
          {text}
        </p>
      )}
    </div>
  );
};

export default Briefing;
