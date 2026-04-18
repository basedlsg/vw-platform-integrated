"use client";

import { useEffect } from "react";
import Shell from "@/components/Shell";
import KpiCenter from "@/components/dashboard/KpiCenter";
import RiskRoadmap from "@/components/dashboard/RiskRoadmap";
import { useESAAStore } from "@/lib/esaa/store";

export default function Home(): React.JSX.Element {
  const loadDomain = useESAAStore((state) => state.loadDomain);

  useEffect(() => {
    loadDomain("VW_FINANCE_CONTROL_TOWER");
  }, [loadDomain]);

  return (
    <Shell>
      <div className="space-y-8">
        <KpiCenter />
        <RiskRoadmap />
      </div>
    </Shell>
  );
}
