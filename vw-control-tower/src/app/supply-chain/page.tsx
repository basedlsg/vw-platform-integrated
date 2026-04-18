'use client';

import React from 'react';
import { useLang } from '@/lib/app-context';
import { T } from '@/lib/translations';
import { PortfolioKpis } from '@/components/supply-chain/PortfolioKpis';
import { SupplierList } from '@/components/supply-chain/SupplierList';
import { SupplierDetail } from '@/components/supply-chain/SupplierDetail';
import { GeminiPanel } from '@/components/supply-chain/GeminiPanel';

export default function SupplyChainPage() {
  const { lang } = useLang();
  const t = T[lang];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold t-primary">{t.sc_title}</h1>
        <p className="text-sm t-muted mt-1">{t.sc_subtitle}</p>
      </div>

      {/* Top KPI bar */}
      <PortfolioKpis />

      {/* Main grid: supplier list | supplier detail | gemini panel */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '240px 1fr 280px', minHeight: '70vh' }}>
        <SupplierList />
        <SupplierDetail />
        <GeminiPanel />
      </div>
    </div>
  );
}
