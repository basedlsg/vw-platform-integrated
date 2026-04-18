"use client";

import React, { useState } from 'react';
import Shell from '@/components/Shell';
import { useESAAStore } from '@/lib/esaa/store';
import { useLang } from '@/lib/app-context';
import { T } from '@/lib/translations';

export default function ConfigPage(): React.JSX.Element {
  const [copied, setCopied] = useState<string | null>(null);
  const state = useESAAStore((state) => state.state);
  const { lang } = useLang();
  const t = T[lang];

  const handleCopyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Shell>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold t-primary">{t.config_title}</h2>
          <p className="text-sm t-secondary mt-1">{t.config_subtitle}</p>
        </div>

        {/* Environment Info */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold t-primary">{t.config_system_status}</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Global Sequence */}
            <div className="glass-card rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide font-semibold" style={{ color: 'var(--text-very-muted)' }}>{t.config_global_seq}</p>
                  <p className="text-2xl font-bold t-primary mt-2">{state.globalSequence}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{t.config_total_events}</p>
                </div>
                <div className="text-3xl">📊</div>
              </div>
            </div>

            {/* Environment */}
            <div className="glass-card rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide font-semibold" style={{ color: 'var(--text-very-muted)' }}>{t.config_environment}</p>
                  <p className="text-2xl font-bold t-primary mt-2">{t.config_env_cloud}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{t.config_env_desc}</p>
                </div>
                <div className="text-3xl">⚙️</div>
              </div>
            </div>
          </div>
        </section>

        {/* Data Summary */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold t-primary">{t.config_data_summary}</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* KPIs */}
            <div className="glass-card rounded-xl p-5" style={{ borderLeft: '3px solid #135bec' }}>
              <p className="text-xs uppercase tracking-wide font-semibold" style={{ color: '#135bec' }}>{t.config_kpis_tracked}</p>
              <p className="text-2xl font-bold t-primary mt-2">{Object.keys(state.kpis).length}</p>
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                {Object.keys(state.kpis).length > 0 ? Object.keys(state.kpis).join(', ') : t.config_none}
              </p>
            </div>

            {/* Risks */}
            <div className="glass-card rounded-xl p-5" style={{ borderLeft: '3px solid #ef4444' }}>
              <p className="text-xs uppercase tracking-wide font-semibold" style={{ color: '#ef4444' }}>{t.config_risks_monitored}</p>
              <p className="text-2xl font-bold t-primary mt-2">{Object.keys(state.risks).length}</p>
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                {Object.keys(state.risks).length > 0 ? Object.keys(state.risks).join(', ') : t.config_none}
              </p>
            </div>

            {/* Proposals */}
            <div className="glass-card rounded-xl p-5" style={{ borderLeft: '3px solid #f59e0b' }}>
              <p className="text-xs uppercase tracking-wide font-semibold" style={{ color: '#f59e0b' }}>{t.config_proposals}</p>
              <p className="text-2xl font-bold t-primary mt-2">{Object.keys(state.proposals).length}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {t.config_pending}: {Object.values(state.proposals).filter(p => p.status === 'PENDING').length}
              </p>
            </div>
          </div>
        </section>

        {/* API Endpoints */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold t-primary">{t.config_api_title}</h3>
          <p className="text-sm t-secondary">{t.config_api_desc}</p>

          <div className="space-y-3">
            {/* GET Proposals */}
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 text-xs font-semibold rounded" style={{ background: 'rgba(34,197,94,0.15)', color: '#16a34a' }}>GET</span>
                    <code className="text-sm font-mono t-secondary truncate">/api/agent/proposals</code>
                  </div>
                  <p className="text-xs t-muted">{t.config_api_get_proposals}</p>
                </div>
                <button
                  onClick={() => handleCopyToClipboard('/api/agent/proposals', 'get-proposals')}
                  className="px-3 py-1 text-xs font-medium rounded transition-colors"
                  style={{ background: 'var(--bg-btn-secondary)', border: '1px solid var(--border-btn-sec)', color: 'var(--text-muted)' }}
                >
                  {copied === 'get-proposals' ? t.config_copied : t.config_copy}
                </button>
              </div>
            </div>

            {/* POST Proposals */}
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 text-xs font-semibold rounded" style={{ background: 'rgba(19,91,236,0.15)', color: '#135bec' }}>POST</span>
                    <code className="text-sm font-mono t-secondary truncate">/api/agent/proposals</code>
                  </div>
                  <p className="text-xs t-muted">{t.config_api_post_proposals}</p>
                </div>
                <button
                  onClick={() => handleCopyToClipboard('/api/agent/proposals', 'post-proposals')}
                  className="px-3 py-1 text-xs font-medium rounded transition-colors"
                  style={{ background: 'var(--bg-btn-secondary)', border: '1px solid var(--border-btn-sec)', color: 'var(--text-muted)' }}
                >
                  {copied === 'post-proposals' ? t.config_copied : t.config_copy}
                </button>
              </div>
            </div>

            {/* Ingest Events */}
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 text-xs font-semibold rounded" style={{ background: 'rgba(147,51,234,0.15)', color: '#9333ea' }}>POST</span>
                    <code className="text-sm font-mono t-secondary truncate">/api/ingest/events</code>
                  </div>
                  <p className="text-xs t-muted">{t.config_api_ingest}</p>
                </div>
                <button
                  onClick={() => handleCopyToClipboard('/api/ingest/events', 'ingest-events')}
                  className="px-3 py-1 text-xs font-medium rounded transition-colors"
                  style={{ background: 'var(--bg-btn-secondary)', border: '1px solid var(--border-btn-sec)', color: 'var(--text-muted)' }}
                >
                  {copied === 'ingest-events' ? t.config_copied : t.config_copy}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold t-primary">{t.config_how_title}</h3>
          <div className="glass-card rounded-xl p-5 space-y-4" style={{ borderLeft: '3px solid #135bec' }}>
            <div>
              <h4 className="font-semibold t-primary mb-1">{t.config_how_1_title}</h4>
              <p className="text-sm t-body">{t.config_how_1_desc}</p>
            </div>
            <div>
              <h4 className="font-semibold t-primary mb-1">{t.config_how_2_title}</h4>
              <p className="text-sm t-body">{t.config_how_2_desc}</p>
            </div>
            <div>
              <h4 className="font-semibold t-primary mb-1">{t.config_how_3_title}</h4>
              <p className="text-sm t-body">{t.config_how_3_desc}</p>
            </div>
            <div>
              <h4 className="font-semibold t-primary mb-1">{t.config_how_4_title}</h4>
              <p className="text-sm t-body">{t.config_how_4_desc}</p>
            </div>
          </div>
        </section>
      </div>
    </Shell>
  );
}
