"use client";

import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useESAAStore } from '@/lib/esaa/store';
import { useLang } from '@/lib/app-context';
import { T } from '@/lib/translations';
import type { KpiSnapshot } from '@/lib/esaa/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const KPI_ICONS: Record<string, { icon: string; color: string; context_en: string; context_zh: string }> = {
  KPI_OP_MARGIN: { icon: 'trending_up',      color: '#135bec', context_en: 'Profit kept from each euro of revenue after operating costs.', context_zh: '扣除运营成本后每欧元营收保留的利润。' },
  KPI_CASH_CONV: { icon: 'currency_exchange', color: '#f97316', context_en: 'How efficiently profits turn into actual cash in the bank.',      context_zh: '利润转化为实际现金的效率。' },
  KPI_BEV_SHARE: { icon: 'bolt',             color: '#10b981', context_en: 'Percentage of all deliveries that are fully electric.',           context_zh: '纯电动车辆占全部交付量的百分比。' },
};

const KPI_TARGETS: Record<string, number> = {
  KPI_OP_MARGIN: 6.0,
  KPI_CASH_CONV: 70.0,
  KPI_BEV_SHARE: 20.0,
};

function getMeta(id: string, lang: 'en' | 'zh') {
  const base = KPI_ICONS[id] ?? { icon: 'analytics', color: '#135bec', context_en: '', context_zh: '' };
  const names: Record<string, { en: string; zh: string }> = {
    KPI_OP_MARGIN: { en: T.en.kpi_op_margin, zh: T.zh.kpi_op_margin },
    KPI_CASH_CONV: { en: T.en.kpi_cash_conv, zh: T.zh.kpi_cash_conv },
    KPI_BEV_SHARE: { en: T.en.kpi_bev_share, zh: T.zh.kpi_bev_share },
  };
  return {
    name: names[id]?.[lang] ?? id,
    unit: '%',
    context: lang === 'zh' ? base.context_zh : base.context_en,
    target: KPI_TARGETS[id] ?? 100,
    icon: base.icon,
    color: base.color,
  };
}

type HistoryPoint = { date: string; value: number; source: string; label: string; change?: string };

function ChartTooltip({ active, payload, label, tooltipClick }: {
  active?: boolean;
  payload?: Array<{ payload: HistoryPoint }>;
  label?: string;
  tooltipClick?: string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="glass-modal rounded-xl p-3 max-w-[260px] shadow-xl">
      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{label}: {point.value.toFixed(1)}%</p>
      <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{point.source}</p>
      {point.change && <p className="text-xs mt-1 font-medium" style={{ color: 'var(--text-secondary)' }}>{point.change}</p>}
      <p className="text-xs mt-1 t-accent">{tooltipClick}</p>
    </div>
  );
}

type TStrings = Record<string, string>;

function AskQuestion({ kpiName, history, prefill, t }: {
  kpiName: string;
  history: HistoryPoint[];
  prefill?: string;
  t: TStrings;
}) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (prefill) {
      setQuestion(prefill);
      setAnswer('');
      inputRef.current?.focus();
    }
  }, [prefill]);

  const handleAsk = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer('');
    try {
      const context = history.map(h => `${h.label}: ${h.value}% — ${h.source}${h.change ? ` (${h.change})` : ''}`).join('\n');
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, context: `KPI: ${kpiName}\n\n${context}` }),
      });
      const data = await res.json() as { answer: string };
      setAnswer(data.answer);
    } catch {
      setAnswer(t.kpi_ask_error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-6 py-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined t-accent" style={{ fontSize: '16px', color: '#135bec' }}>chat</span>
        <h3 className="text-sm font-semibold t-primary">{t.kpi_ask_title}</h3>
      </div>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void handleAsk()}
          placeholder={t.kpi_ask_placeholder}
          className="flex-1 px-3 py-2 text-sm rounded-xl focus:outline-none"
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-input)',
            color: 'var(--text-primary)',
          }}
        />
        <button
          onClick={() => void handleAsk()}
          disabled={loading || !question.trim()}
          className="px-4 py-2 text-sm font-medium rounded-xl disabled:opacity-40 transition-colors"
          style={{ background: '#135bec', color: 'white' }}
        >
          {loading ? '…' : t.kpi_ask_btn}
        </button>
      </div>
      {answer && (
        <div className="mt-3 rounded-xl p-4 glass-surface">
          <p className="text-sm leading-relaxed t-body">{answer}</p>
        </div>
      )}
    </div>
  );
}

function KpiEditForm({ kpiId, currentValue, onSaved, onCancel, lang }: {
  kpiId: string;
  currentValue: number;
  onSaved: (newValue: number) => void;
  onCancel: () => void;
  lang: 'en' | 'zh';
}) {
  const t: TStrings = T[lang];
  const [value, setValue] = useState(currentValue.toString());
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    const numVal = parseFloat(value);
    if (isNaN(numVal)) {
      setError(lang === 'zh' ? '请输入有效数字' : 'Please enter a valid number');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/kpi/${kpiId}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: numVal, reason: reason || undefined }),
      });
      if (!res.ok) throw new Error('Failed');
      onSaved(numVal);
    } catch {
      setError(t.kpi_edit_error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-6 py-4 space-y-3" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#135bec' }}>edit</span>
        <h3 className="text-sm font-semibold t-primary">{t.kpi_edit_title}</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium t-secondary block mb-1">{t.kpi_edit_value}</label>
          <input
            type="number"
            step="0.1"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}
            autoFocus
          />
        </div>
        <div>
          <label className="text-xs font-medium t-secondary block mb-1">{t.kpi_edit_reason}</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t.kpi_edit_reason_placeholder}
            className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}
          />
        </div>
      </div>
      {error && <p className="text-xs text-rose-500">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium rounded-xl disabled:opacity-40 transition-colors"
          style={{ background: '#135bec', color: 'white' }}
        >
          {saving ? t.kpi_edit_saving : t.kpi_edit_save}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium rounded-xl transition-colors"
          style={{ background: 'var(--bg-btn-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-btn-sec)' }}
        >
          {t.kpi_edit_cancel}
        </button>
      </div>
    </div>
  );
}

function KpiDetailModal({ kpi, onClose, onKpiUpdated, lang }: { kpi: KpiSnapshot; onClose: () => void; onKpiUpdated?: (id: string, newValue: number) => void; lang: 'en' | 'zh' }) {
  const t: TStrings = T[lang];
  const meta = getMeta(kpi.id, lang);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [askPrefill, setAskPrefill] = useState('');
  const [editing, setEditing] = useState(false);
  const [displayValue, setDisplayValue] = useState(kpi.currentValue);
  const lastClickRef = useRef<{ time: number; point: HistoryPoint | null }>({ time: 0, point: null });

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/kpi/${kpi.id}/history`);
      const data = await res.json() as { history: { date: string; value: number; source: string }[] };
      const locale = lang === 'zh' ? 'zh-CN' : 'en-US';
      const points: HistoryPoint[] = data.history.map((h, i) => {
        const prev = i > 0 ? data.history[i - 1] : null;
        const diff = prev ? h.value - prev.value : 0;
        let change = '';
        if (prev) {
          if (Math.abs(diff) < 0.3) {
            change = lang === 'zh' ? '较上期基本持平。' : 'Largely stable from prior period.';
          } else if (diff > 0) {
            change = lang === 'zh'
              ? `较上期上升 ${diff.toFixed(1)} 个百分点。`
              : `Up ${diff.toFixed(1)}pp from prior period.`;
          } else {
            change = lang === 'zh'
              ? `较上期下降 ${Math.abs(diff).toFixed(1)} 个百分点。`
              : `Down ${Math.abs(diff).toFixed(1)}pp from prior period.`;
          }
        }
        return { ...h, label: new Date(h.date).toLocaleDateString(locale, { month: 'short', year: '2-digit' }), change };
      });
      setHistory(points);
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [kpi.id, lang]);

  useEffect(() => { void fetchHistory(); }, [fetchHistory]);

  const firstValue = history.length > 0 ? history[0].value : 0;
  const lastValue  = history.length > 0 ? history[history.length - 1].value : 0;
  const change     = lastValue - firstValue;
  const changeText = change >= 0 ? `+${change.toFixed(1)}` : change.toFixed(1);

  const handleEditSaved = (newValue: number) => {
    setDisplayValue(newValue);
    setEditing(false);
    onKpiUpdated?.(kpi.id, newValue);
    // Refetch history to show the new data point
    setLoading(true);
    void fetchHistory();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--overlay)' }} onClick={onClose}>
      <div className="glass-modal rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <h2 className="text-xl font-bold t-primary">{meta.name}</h2>
            <p className="text-sm mt-0.5 t-secondary">{meta.context}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditing(!editing)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
              style={{
                background: editing ? 'rgba(19,91,236,0.15)' : 'var(--bg-btn-secondary)',
                color: editing ? '#135bec' : 'var(--text-primary)',
                border: `1px solid ${editing ? '#135bec' : 'var(--border-btn-sec)'}`,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit</span>
              {t.kpi_edit}
            </button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors t-muted hover:t-primary" style={{ background: 'var(--bg-btn-secondary)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--text-muted)' }}>close</span>
            </button>
          </div>
        </div>

        {editing && (
          <KpiEditForm
            kpiId={kpi.id}
            currentValue={displayValue}
            onSaved={handleEditSaved}
            onCancel={() => setEditing(false)}
            lang={lang}
          />
        )}

        <div className="px-6 py-4 grid grid-cols-3 gap-4" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
          <div>
            <p className="text-xs uppercase tracking-wide mb-1 t-very-muted" style={{ color: 'var(--text-very-muted)' }}>{t.kpi_current}</p>
            <p className="text-2xl font-bold text-glow t-primary">{displayValue.toFixed(1)}{meta.unit}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-very-muted)' }}>{t.kpi_target}</p>
            <p className="text-2xl font-bold t-accent" style={{ color: '#135bec' }}>{meta.target.toFixed(1)}{meta.unit}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-very-muted)' }}>{t.kpi_change}</p>
            <p className={`text-2xl font-bold ${change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{changeText}{meta.unit}</p>
          </div>
        </div>

        <div className="px-6 py-4">
          <h3 className="text-sm font-semibold t-primary mb-1">{t.kpi_trend_title}</h3>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>{t.kpi_trend_subtitle}</p>
          {loading ? (
            <div className="h-[250px] flex items-center justify-center">
              <div className="animate-spin w-8 h-8 rounded-full border-2 border-t-transparent" style={{ borderColor: 'rgba(19,91,236,0.3)', borderTopColor: '#135bec' }} />
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>{t.kpi_no_data}</p>
          ) : (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={history}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  onClick={(chartData) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const anyData = chartData as any;
                    const point: HistoryPoint | undefined = anyData?.activePayload?.[0]?.payload;
                    if (!point) return;
                    const now = Date.now();
                    const prev = lastClickRef.current;
                    if (prev.point && prev.point.label === point.label && now - prev.time < 450) {
                      // Double-click detected on same point
                      setAskPrefill(
                        lang === 'zh'
                          ? `${point.label} 的 ${meta.name} 为何为 ${point.value.toFixed(1)}%？主要驱动因素是什么？`
                          : `Why was ${meta.name} at ${point.value.toFixed(1)}% in ${point.label}? What caused this movement?`
                      );
                      lastClickRef.current = { time: 0, point: null };
                    } else {
                      lastClickRef.current = { time: now, point };
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--recharts-grid)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--recharts-text)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--recharts-text)' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                  <Tooltip content={<ChartTooltip tooltipClick={t.kpi_tooltip_click} />} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={meta.color}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: meta.color, strokeWidth: 0, cursor: 'pointer' }}
                    activeDot={{ r: 6, fill: meta.color, stroke: 'white', strokeWidth: 2, cursor: 'pointer' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {history.length > 0 && (
          <div className="px-6 py-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <h3 className="text-sm font-semibold t-primary mb-3">{t.kpi_sources}</h3>
            <div className="space-y-0 max-h-[200px] overflow-y-auto rounded-xl overflow-hidden glass-surface">
              {history.map((h, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-4 py-2.5 text-sm"
                  style={{ borderBottom: i < history.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs w-14 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{h.label}</span>
                    <span className="font-semibold t-primary">{h.value.toFixed(1)}{meta.unit}</span>
                    {h.change && <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{h.change}</span>}
                  </div>
                  <span className="text-xs text-right max-w-[220px] truncate" style={{ color: 'var(--text-secondary)' }}>{h.source}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <AskQuestion kpiName={meta.name} history={history} prefill={askPrefill} t={t} />
      </div>
    </div>
  );
}

function KpiCard({ kpi, onClick, lang }: { kpi: KpiSnapshot; onClick: () => void; lang: 'en' | 'zh' }) {
  const t: TStrings = T[lang];
  const meta = getMeta(kpi.id, lang);
  const pctOfTarget = Math.min((kpi.currentValue / meta.target) * 100, 100);
  const isBelow = kpi.currentValue < meta.target;
  const [pressed, setPressed] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      className="glass-card glass-card-interactive rounded-2xl p-6 text-left w-full group relative overflow-hidden"
      style={{
        borderColor: pressed ? 'var(--border-blue-active)' : undefined,
        background: pressed ? 'var(--bg-card-active)' : undefined,
        boxShadow: pressed ? '0 0 0 3px rgba(19,91,236,0.18), inset 0 0 20px rgba(19,91,236,0.07)' : undefined,
        transform: pressed ? 'scale(0.982)' : undefined,
      }}
    >
      {/* Ambient glow blob */}
      <div
        className="absolute top-0 right-0 w-28 h-28 rounded-full -mr-14 -mt-14 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `${meta.color}18` }}
      />

      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{meta.name}</p>
        <span className="material-symbols-outlined" style={{ color: meta.color, fontSize: '20px' }}>{meta.icon}</span>
      </div>

      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-4xl font-bold text-glow t-primary">{kpi.currentValue.toFixed(1)}</span>
        <span className="text-lg" style={{ color: 'var(--text-muted)' }}>{meta.unit}</span>
        <span className={`text-xs font-semibold ml-1 ${isBelow ? 'text-rose-500' : 'text-emerald-500'}`}>
          {isBelow ? `${(meta.target - kpi.currentValue).toFixed(1)}${t.kpi_below_target}` : t.kpi_on_target}
        </span>
      </div>

      <div className="w-full h-1 rounded-full" style={{ background: 'var(--border-subtle)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pctOfTarget}%`, background: meta.color, boxShadow: `0 0 8px ${meta.color}60` }}
        />
      </div>

      <p className="text-xs mt-3 font-medium t-accent" style={{ color: '#135bec' }}>{t.kpi_click_hint}</p>
    </button>
  );
}

export const KpiCenter: React.FC = () => {
  const kpis = useESAAStore((state) => state.state.kpis);
  const isHydrated = useESAAStore((state) => state.isHydrated);
  const loadDomain = useESAAStore((state) => state.loadDomain);
  const { lang } = useLang();
  const t: TStrings = T[lang];
  const [selectedKpi, setSelectedKpi] = useState<KpiSnapshot | null>(null);
  const kpiArray = useMemo(() => Object.values(kpis), [kpis]);

  const handleKpiUpdated = useCallback((_id: string, _newValue: number) => {
    // Reload domain to refresh the store with the latest event
    void loadDomain('VW_FINANCE_CONTROL_TOWER');
  }, [loadDomain]);

  if (!isHydrated) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <div className="animate-spin w-8 h-8 rounded-full border-2 border-t-transparent mx-auto mb-3" style={{ borderColor: 'rgba(19,91,236,0.3)', borderTopColor: '#135bec' }} />
        <p className="text-sm t-secondary">{t.kpi_loading}</p>
      </div>
    );
  }

  if (kpiArray.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <p className="text-sm t-secondary">{t.kpi_empty}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold t-primary">{t.kpi_title}</h2>
        <p className="text-sm t-secondary mt-0.5">{t.kpi_subtitle}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {kpiArray.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} lang={lang} onClick={() => setSelectedKpi(kpi)} />
        ))}
      </div>
      {selectedKpi && <KpiDetailModal kpi={selectedKpi} lang={lang} onClose={() => setSelectedKpi(null)} onKpiUpdated={handleKpiUpdated} />}
    </div>
  );
};

export default KpiCenter;
