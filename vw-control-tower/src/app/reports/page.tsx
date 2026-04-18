"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Shell from '@/components/Shell';
import { useLang } from '@/lib/app-context';
import { T } from '@/lib/translations';

const VW_REPORTS = [
  {
    title: 'Annual Report 2023', period: 'FY 2023', date: 'March 2024', type: 'Annual',
    url: 'https://annualreport2023.volkswagenag.com/',
    highlights: ['Revenue: €322.3B', 'Operating margin: 6.4%', 'Deliveries: 9.24M vehicles'],
  },
  {
    title: 'Annual Report 2022', period: 'FY 2022', date: 'March 2023', type: 'Annual',
    url: 'https://annualreport2022.volkswagenag.com/',
    highlights: ['Revenue: €279.2B', 'Operating margin: 8.1%', 'Strong ICE profitability'],
  },
  {
    title: 'Half-Year Report 2024', period: 'H1 2024', date: 'July 2024', type: 'Interim',
    url: 'https://www.volkswagen-group.com/en/half-year-report-2024-18896',
    highlights: ['Margin declined to 2.3%', 'Profit warning issued', 'Restructuring announced'],
  },
  {
    title: 'Investor Relations Portal', period: 'All periods', date: 'Updated regularly', type: 'Portal',
    url: 'https://www.volkswagen-group.com/en/investors-17',
    highlights: ['All quarterly and annual reports', 'Presentations and webcasts', 'Financial calendar'],
  },
];

const VW_REPORTS_ZH = [
  {
    title: '2023年年报', period: 'FY 2023', date: '2024年3月', type: 'Annual',
    url: 'https://annualreport2023.volkswagenag.com/',
    highlights: ['营收：3223亿欧元', '营业利润率：6.4%', '交付量：924万辆'],
  },
  {
    title: '2022年年报', period: 'FY 2022', date: '2023年3月', type: 'Annual',
    url: 'https://annualreport2022.volkswagenag.com/',
    highlights: ['营收：2792亿欧元', '营业利润率：8.1%', '燃油车盈利能力强劲'],
  },
  {
    title: '2024年半年报', period: 'H1 2024', date: '2024年7月', type: 'Interim',
    url: 'https://www.volkswagen-group.com/en/half-year-report-2024-18896',
    highlights: ['利润率下滑至2.3%', '发布利润预警', '宣布重组计划'],
  },
  {
    title: '投资者关系门户', period: '全部期间', date: '定期更新', type: 'Portal',
    url: 'https://www.volkswagen-group.com/en/investors-17',
    highlights: ['所有季报和年报', '路演及网络直播', '财务日历'],
  },
];

type DataPoint = { date: string; value: number; source: string };

const TYPE_CONFIG: Record<string, { bg: string; color: string }> = {
  Annual:  { bg: 'rgba(19,91,236,0.15)',  color: '#135bec' },
  Interim: { bg: 'rgba(249,115,22,0.15)', color: '#f97316' },
  Portal:  { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
};

function GeneratedAnalysis({ lang }: { lang: 'en' | 'zh' }) {
  const t = T[lang];
  const [marginData, setMarginData] = useState<DataPoint[]>([]);
  const [cashData,   setCashData]   = useState<DataPoint[]>([]);
  const [bevData,    setBevData]    = useState<DataPoint[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [deepDive, setDeepDive] = useState<Record<string, string>>({});
  const [deepDiveLoading, setDeepDiveLoading] = useState<Record<string, boolean>>({});

  const fetchData = useCallback(async () => {
    try {
      const [mRes, cRes, bRes] = await Promise.all([
        fetch('/api/kpi/KPI_OP_MARGIN/history'),
        fetch('/api/kpi/KPI_CASH_CONV/history'),
        fetch('/api/kpi/KPI_BEV_SHARE/history'),
      ]);
      if (mRes.ok) setMarginData(((await mRes.json()) as { history: DataPoint[] }).history);
      if (cRes.ok) setCashData(((await cRes.json()) as { history: DataPoint[] }).history);
      if (bRes.ok) setBevData(((await bRes.json()) as { history: DataPoint[] }).history);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const handleCardClick = useCallback(async (cardId: string, question: string, context: string) => {
    setExpandedCard(prev => prev === cardId ? null : cardId);
    if (deepDive[cardId] !== undefined) return; // already fetched
    setDeepDiveLoading(prev => ({ ...prev, [cardId]: true }));
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, context }),
      });
      const data = await res.json() as { answer: string };
      setDeepDive(prev => ({ ...prev, [cardId]: data.answer }));
    } catch {
      setDeepDive(prev => ({ ...prev, [cardId]: lang === 'zh' ? '分析加载失败，请重试。' : 'Failed to load analysis. Please try again.' }));
    } finally {
      setDeepDiveLoading(prev => ({ ...prev, [cardId]: false }));
    }
  }, [deepDive, lang]);

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <div className="animate-spin w-8 h-8 rounded-full border-2 border-t-transparent mx-auto mb-3" style={{ borderColor: 'rgba(19,91,236,0.3)', borderTopColor: '#135bec' }} />
        <p className="text-sm t-secondary">{t.reports_pulling}</p>
      </div>
    );
  }

  if (marginData.length < 2 && cashData.length < 2 && bevData.length < 2) return null;

  const mFirst = marginData.length > 0 ? marginData[0] : null;
  const mLast  = marginData.length > 0 ? marginData[marginData.length - 1] : null;
  const mPeak  = marginData.length > 0 ? marginData.reduce((a, b) => a.value > b.value ? a : b) : null;
  const mTrough= marginData.length > 0 ? marginData.reduce((a, b) => a.value < b.value ? a : b) : null;
  const cFirst = cashData.length > 0 ? cashData[0] : null;
  const cLast  = cashData.length > 0 ? cashData[cashData.length - 1] : null;
  const bFirst = bevData.length > 0 ? bevData[0] : null;
  const bLast  = bevData.length > 0 ? bevData[bevData.length - 1] : null;
  const fmt    = (d: string) => new Date(d).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', year: 'numeric' });

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-bold t-primary">{t.reports_analysis_title}</h2>
        <p className="text-sm t-secondary">
          {lang === 'zh'
            ? `根据大众集团报告的 ${marginData.length + cashData.length + bevData.length} 个季度数据点自动生成`
            : `Auto-generated from ${marginData.length + cashData.length + bevData.length} quarterly data points sourced from VW Group reports`}
        </p>
      </div>

      {mFirst && mLast && mPeak && mTrough && marginData.length >= 2 && (
      <div
        className="glass-card glass-card-interactive rounded-2xl p-6 space-y-4 cursor-pointer"
        onClick={() => void handleCardClick(
          'margin',
          lang === 'zh'
            ? `请深入分析大众集团营业利润率下滑的根本原因、当前状态及未来展望。请用中文回答。`
            : `Provide a deep-dive analysis of VW Group's operating margin decline: root causes, current status, and outlook toward the 6% target.`,
          `Operating Margin data: ${marginData.map(d => `${d.date}: ${d.value}% (${d.source})`).join(', ')}`
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.15)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#ef4444' }}>trending_down</span>
            </div>
            <h3 className="font-semibold t-primary">
              {lang === 'zh'
                ? `营业利润率：${mFirst.value.toFixed(1)}% → ${mLast.value.toFixed(1)}%`
                : `Operating Margin: ${mFirst.value.toFixed(1)}% → ${mLast.value.toFixed(1)}%`}
            </h3>
          </div>
          <span className="material-symbols-outlined t-muted transition-transform duration-200" style={{ fontSize: '20px', color: 'var(--text-muted)', transform: expandedCard === 'margin' ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
        </div>
        <p className="text-sm leading-relaxed t-body">
          {lang === 'zh'
            ? <>大众集团盈利能力从 {fmt(mFirst.date)} 的 <strong className="t-primary">{mFirst.value.toFixed(1)}%</strong> 大幅下降，峰值为 {fmt(mPeak.date)} 的 <strong className="t-primary">{mPeak.value.toFixed(1)}%</strong>，目前已降至 <strong className="t-primary">{mLast.value.toFixed(1)}%</strong>。最低点为 {fmt(mTrough.date)} 的 <strong className="t-primary">{mTrough.value.toFixed(1)}%</strong>。</>
            : <>VW Group&apos;s profitability has declined significantly. Margin was <strong className="t-primary">{mFirst.value.toFixed(1)}%</strong> in {fmt(mFirst.date)}, peaked at <strong className="t-primary">{mPeak.value.toFixed(1)}%</strong> in {fmt(mPeak.date)}, and has since fallen to <strong className="t-primary">{mLast.value.toFixed(1)}%</strong>. The lowest point was <strong className="t-primary">{mTrough.value.toFixed(1)}%</strong> in {fmt(mTrough.date)}.</>
          }
        </p>
        <div className="glass-blue rounded-xl px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#135bec' }}>
            {lang === 'zh' ? '为何重要' : 'Why this matters'}
          </p>
          <p className="text-sm t-body">
            {lang === 'zh'
              ? `大众5年计划目标是2026财年实现6%+利润率。当前仅为 ${mLast.value.toFixed(1)}%，盈利能力几乎需要翻倍。关键驱动因素：激励支出、电动化转型成本、原材料通胀及德国工厂重组。`
              : `VW's 5-year plan targets 6%+ margin by FY2026. At ${mLast.value.toFixed(1)}%, they need to nearly double profitability. Key drivers: incentive spending, EV transition costs, raw material inflation, and German plant restructuring.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {marginData.map(h => h.source).filter((v, i, a) => a.indexOf(v) === i).slice(0, 5).map((src, i) => (
            <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}>{src}</span>
          ))}
        </div>
        {expandedCard === 'margin' && (
          <div style={{ borderTop: '1px solid var(--border-subtle)' }} className="pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#135bec' }}>
              {lang === 'zh' ? '深入分析' : 'Deep Dive'}
            </p>
            {deepDiveLoading['margin'] ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin w-4 h-4 rounded-full border-2 border-t-transparent flex-shrink-0" style={{ borderColor: 'rgba(19,91,236,0.3)', borderTopColor: '#135bec' }} />
                <span className="text-sm t-secondary">{lang === 'zh' ? '正在分析…' : 'Analyzing…'}</span>
              </div>
            ) : deepDive['margin'] ? (
              <p className="text-sm leading-relaxed t-body whitespace-pre-line">{deepDive['margin']}</p>
            ) : null}
          </div>
        )}
      </div>
      )}

      {cFirst && cLast && cashData.length >= 2 && (
        <div
          className="glass-card glass-card-interactive rounded-2xl p-6 space-y-4 cursor-pointer"
          onClick={() => void handleCardClick(
            'cash',
            lang === 'zh'
              ? `请深入分析大众集团现金转化率下降的原因及其对战略投资能力的影响。请用中文回答。`
              : `Provide a deep-dive analysis of VW Group's cash conversion decline: causes, capex allocation, and implications for the EV investment program.`,
            `Cash Conversion data: ${cashData.map(d => `${d.date}: ${d.value}% (${d.source})`).join(', ')}`
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.15)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#f97316' }}>currency_exchange</span>
              </div>
              <h3 className="font-semibold t-primary">
                {lang === 'zh' ? '现金转化率' : 'Cash Conversion'}: {cFirst.value.toFixed(0)}% → {cLast.value.toFixed(0)}%
              </h3>
            </div>
            <span className="material-symbols-outlined transition-transform duration-200" style={{ fontSize: '20px', color: 'var(--text-muted)', transform: expandedCard === 'cash' ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
          </div>
          <p className="text-sm leading-relaxed t-body">
            {lang === 'zh'
              ? `现金转化率从 ${cFirst.value.toFixed(1)}% 降至 ${cLast.value.toFixed(1)}%。大众更少的营业利润转化为实际现金——反映出在电动化平台、电池工厂及营运资本方面的大量资本支出。`
              : `Cash conversion declined from ${cFirst.value.toFixed(1)}% to ${cLast.value.toFixed(1)}%. Less of VW's operating profit is converting into actual cash — reflecting heavy capital spending on EV platforms, battery factory investments, and working capital pressure.`}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {cashData.map(h => h.source).filter((v, i, a) => a.indexOf(v) === i).slice(0, 4).map((src, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}>{src}</span>
            ))}
          </div>
          {expandedCard === 'cash' && (
            <div style={{ borderTop: '1px solid var(--border-subtle)' }} className="pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#f97316' }}>
                {lang === 'zh' ? '深入分析' : 'Deep Dive'}
              </p>
              {deepDiveLoading['cash'] ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 rounded-full border-2 border-t-transparent flex-shrink-0" style={{ borderColor: 'rgba(249,115,22,0.3)', borderTopColor: '#f97316' }} />
                  <span className="text-sm t-secondary">{lang === 'zh' ? '正在分析…' : 'Analyzing…'}</span>
                </div>
              ) : deepDive['cash'] ? (
                <p className="text-sm leading-relaxed t-body whitespace-pre-line">{deepDive['cash']}</p>
              ) : null}
            </div>
          )}
        </div>
      )}

      {bFirst && bLast && bevData.length >= 2 && (
        <div
          className="glass-card glass-card-interactive rounded-2xl p-6 space-y-4 cursor-pointer"
          onClick={() => void handleCardClick(
            'ev',
            lang === 'zh'
              ? `请深入分析大众集团纯电动车交付占比的进展、面临的挑战及实现20%目标的路径。请用中文回答。`
              : `Provide a deep-dive analysis of VW Group's EV transition: BEV delivery share progress, competitive threats from China, and the path to the 20% target.`,
            `BEV Delivery Share data: ${bevData.map(d => `${d.date}: ${d.value}% (${d.source})`).join(', ')}`
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#10b981' }}>bolt</span>
              </div>
              <h3 className="font-semibold t-primary">
                {lang === 'zh' ? '电动化转型' : 'EV Transition'}: {bFirst.value.toFixed(0)}% → {bLast.value.toFixed(0)}% {lang === 'zh' ? '纯电动' : 'electric'}
              </h3>
            </div>
            <span className="material-symbols-outlined transition-transform duration-200" style={{ fontSize: '20px', color: 'var(--text-muted)', transform: expandedCard === 'ev' ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
          </div>
          <p className="text-sm leading-relaxed t-body">
            {lang === 'zh'
              ? `纯电动交付量从总交付量的 ${bFirst.value.toFixed(1)}% 增长至 ${bLast.value.toFixed(1)}%。尽管有所进展，但20%的目标仍相去甚远。增长受制于中国市场竞争加剧及欧洲市场普及速度低于预期。`
              : `Battery electric deliveries have grown from ${bFirst.value.toFixed(1)}% to ${bLast.value.toFixed(1)}% of total deliveries. While progress is visible, the 20% target remains distant. Growth constrained by competition in China and slower-than-expected European adoption.`}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {bevData.map(h => h.source).filter((v, i, a) => a.indexOf(v) === i).slice(0, 4).map((src, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}>{src}</span>
            ))}
          </div>
          {expandedCard === 'ev' && (
            <div style={{ borderTop: '1px solid var(--border-subtle)' }} className="pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#10b981' }}>
                {lang === 'zh' ? '深入分析' : 'Deep Dive'}
              </p>
              {deepDiveLoading['ev'] ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 rounded-full border-2 border-t-transparent flex-shrink-0" style={{ borderColor: 'rgba(16,185,129,0.3)', borderTopColor: '#10b981' }} />
                  <span className="text-sm t-secondary">{lang === 'zh' ? '正在分析…' : 'Analyzing…'}</span>
                </div>
              ) : deepDive['ev'] ? (
                <p className="text-sm leading-relaxed t-body whitespace-pre-line">{deepDive['ev']}</p>
              ) : null}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function ReportGenerator({ lang }: { lang: 'en' | 'zh' }) {
  const t = T[lang];
  const sections = [
    { id: 'margins',  label: t.reports_sections_margin,   description: t.reports_sections_margin_desc },
    { id: 'risks',    label: t.reports_sections_risks,    description: t.reports_sections_risks_desc },
    { id: 'ev',       label: t.reports_sections_ev,       description: t.reports_sections_ev_desc },
    { id: 'cash',     label: t.reports_sections_cash,     description: t.reports_sections_cash_desc },
    { id: 'strategy', label: t.reports_sections_strategy, description: t.reports_sections_strategy_desc },
  ];

  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set(['margins', 'risks', 'ev']));
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [generatedReport, setGeneratedReport] = useState('');
  const [generating, setGenerating] = useState(false);

  const toggleSection = (id: string) => {
    const next = new Set(selectedSections);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedSections(next);
  };

  const generateReport = async () => {
    if (selectedSections.size === 0) return;
    setGenerating(true);
    setGeneratedReport('');
    try {
      const [mRes, cRes, bRes] = await Promise.all([
        fetch('/api/kpi/KPI_OP_MARGIN/history'),
        fetch('/api/kpi/KPI_CASH_CONV/history'),
        fetch('/api/kpi/KPI_BEV_SHARE/history'),
      ]);
      const marginData = mRes.ok ? ((await mRes.json()) as { history: DataPoint[] }).history : [];
      const cashData   = cRes.ok ? ((await cRes.json()) as { history: DataPoint[] }).history : [];
      const bevData    = bRes.ok ? ((await bRes.json()) as { history: DataPoint[] }).history : [];

      const dataContext = [
        marginData.length > 0 ? `Operating Margin history:\n${marginData.map(d => `${d.date}: ${d.value}% (Source: ${d.source})`).join('\n')}` : '',
        cashData.length > 0   ? `\nCash Conversion history:\n${cashData.map(d => `${d.date}: ${d.value}% (Source: ${d.source})`).join('\n')}` : '',
        bevData.length > 0    ? `\nBEV Delivery Share history:\n${bevData.map(d => `${d.date}: ${d.value}% (Source: ${d.source})`).join('\n')}` : '',
      ].join('\n');

      const selectedLabels = sections.filter(s => selectedSections.has(s.id)).map(s => s.label).join(', ');
      const langInstr = lang === 'zh' ? 'Write entirely in Chinese (中文).' : '';

      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: `Generate a professional monthly finance report covering: ${selectedLabels}. ${additionalNotes ? `Additional focus: ${additionalNotes}` : ''}\n\nWrite as a structured report with **bold** section headers. For each section: state current status with specific numbers, compare to prior periods and targets, identify key drivers, cite source reports. Write like a senior finance analyst preparing a board report. ${langInstr}`,
          context: dataContext,
        }),
      });

      if (res.ok) {
        const data = await res.json() as { answer: string };
        setGeneratedReport(data.answer);
      } else {
        setGeneratedReport(lang === 'zh' ? '报告生成失败，请重试。' : 'Failed to generate report. Please try again.');
      }
    } catch {
      setGeneratedReport(lang === 'zh' ? '连接错误，请检查网络。' : 'Error generating report. Check your connection.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-bold t-primary">{t.reports_gen_title}</h2>
        <p className="text-sm t-secondary">{t.reports_gen_subtitle}</p>
      </div>

      <div className="glass-card rounded-2xl p-6 space-y-5">
        <div>
          <p className="text-sm font-semibold t-primary mb-3">{t.reports_include}</p>
          <div className="space-y-2.5">
            {sections.map(section => (
              <label key={section.id} className="flex items-start gap-3 cursor-pointer">
                <div
                  className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
                  style={{
                    background: selectedSections.has(section.id) ? '#135bec' : 'var(--bg-btn-secondary)',
                    border: `1px solid ${selectedSections.has(section.id) ? '#135bec' : 'var(--border-btn-sec)'}`,
                  }}
                  onClick={() => toggleSection(section.id)}
                >
                  {selectedSections.has(section.id) && (
                    <span className="material-symbols-outlined" style={{ fontSize: '13px', color: 'white' }}>check</span>
                  )}
                </div>
                <div onClick={() => toggleSection(section.id)}>
                  <p className="text-sm font-medium t-primary">{section.label}</p>
                  <p className="text-xs t-secondary">{section.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold t-primary mb-2">{t.reports_notes_label}</p>
          <textarea
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            placeholder={t.reports_notes_placeholder}
            className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none resize-none"
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-input)',
              color: 'var(--text-primary)',
            }}
            rows={3}
          />
        </div>

        <button
          onClick={() => void generateReport()}
          disabled={generating || selectedSections.size === 0}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl disabled:opacity-40 transition-colors"
          style={{ background: '#135bec', color: 'white' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
            {generating ? 'hourglass_empty' : 'auto_awesome'}
          </span>
          {generating ? t.reports_generating : `${t.reports_gen_btn} (${selectedSections.size})`}
        </button>

        {generatedReport && (
          <div style={{ borderTop: '1px solid var(--border-subtle)' }} className="pt-5 mt-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold t-primary">{t.reports_output_title}</h3>
              <button
                onClick={() => void navigator.clipboard.writeText(generatedReport)}
                className="flex items-center gap-1 text-xs font-medium t-accent"
                style={{ color: '#135bec' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>content_copy</span>
                {t.reports_copy}
              </button>
            </div>
            <div className="glass-surface rounded-xl p-5">
              <div className="text-sm leading-relaxed whitespace-pre-line t-body">{generatedReport}</div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default function ReportsPage(): React.JSX.Element {
  const { lang } = useLang();
  const t = T[lang];

  return (
    <Shell>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold t-primary">{t.reports_title}</h1>
          <p className="text-sm t-secondary mt-1">{t.reports_subtitle}</p>
        </div>

        <ReportGenerator lang={lang} />

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold t-primary">{t.reports_official_title}</h2>
            <p className="text-sm t-secondary">{t.reports_official_subtitle}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(lang === 'zh' ? VW_REPORTS_ZH : VW_REPORTS).map((report, idx) => {
              const config = TYPE_CONFIG[report.type] ?? { bg: 'rgba(100,116,139,0.15)', color: '#64748b' };
              return (
                <a
                  key={idx}
                  href={report.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass-card glass-card-interactive rounded-2xl p-5 transition-all duration-200 block group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold t-primary">{report.title}</h3>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{report.period} · {report.date}</p>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ml-2" style={{ background: config.bg, color: config.color }}>
                      {report.type}
                    </span>
                  </div>
                  <ul className="space-y-1.5 mb-3">
                    {report.highlights.map((h, i) => (
                      <li key={i} className="text-sm flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                        <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: config.color }} />
                        {h}
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: '#135bec' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>open_in_new</span>
                    {t.reports_open}
                  </div>
                </a>
              );
            })}
          </div>
        </section>

        <GeneratedAnalysis lang={lang} />
      </div>
    </Shell>
  );
}
