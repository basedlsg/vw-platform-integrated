import { NextRequest, NextResponse } from 'next/server';
import type { ChinaCmpProgramSnapshot, RecommendedAction } from '@/lib/china-cmp/types';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export async function POST(req: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
  }

  const body = await req.json() as { snapshot: ChinaCmpProgramSnapshot; lang: 'en' | 'zh' };
  const { snapshot, lang } = body;

  const driverLines = [
    `Battery: ${snapshot.costDriverBreakdown.battery.achieved}pp achieved vs ${snapshot.costDriverBreakdown.battery.needed}pp needed (${snapshot.costDriverBreakdown.battery.status})`,
    `E/E Architecture (CEA): ${snapshot.costDriverBreakdown.cea.achieved}pp achieved vs ${snapshot.costDriverBreakdown.cea.needed}pp needed (${snapshot.costDriverBreakdown.cea.status})`,
    `ADAS/SoC (Horizon): ${snapshot.costDriverBreakdown.adas_soc.achieved}pp achieved vs ${snapshot.costDriverBreakdown.adas_soc.needed}pp needed (${snapshot.costDriverBreakdown.adas_soc.status})`,
    `Local Modules: ${snapshot.costDriverBreakdown.localModules.achieved}pp achieved vs ${snapshot.costDriverBreakdown.localModules.needed}pp needed (${snapshot.costDriverBreakdown.localModules.status})`,
    `Incentive headwind: +${snapshot.costDriverBreakdown.incentiveHeadwind}pp`,
    `Timing headwind: +${snapshot.costDriverBreakdown.timingHeadwind}pp`,
  ].join('\n');

  const recentEventSummary = snapshot.recentEvents.slice(0, 5).map((e) => {
    if (e.type === 'SupplierCostDriftEvent')
      return `- ${e.supplierNameEn} ${e.componentCategory} cost ${e.costDeltaPct > 0 ? '+' : ''}${e.costDeltaPct}% (${e.reasonCode})`;
    if (e.type === 'CompetitorPricingEvent')
      return `- ${e.competitorNameEn} ${e.modelNameEn} price ${e.priceChangePct}% → incentive implication +${e.estimatedIncentiveImplicationPct}pp`;
    if (e.type === 'ProgramMilestoneEvent')
      return `- Milestone "${e.milestoneNameEn}" ${e.slipDays > 0 ? `delayed ${e.slipDays} days` : 'on track'} (+${e.estimatedCostImpactPct}pp cost impact)`;
    if (e.type === 'NevIncentiveUpdatedEvent')
      return `- ${e.modelNameEn} incentive changed ${e.oldIncentiveLevelPct}% → ${e.newIncentiveLevelPct}% (${e.reasonCode})`;
    return '';
  }).join('\n');

  const prompt = `You are a senior VW Group China cost-competitiveness advisor. Your role is to generate specific, actionable recommendations to close the cost-parity gap on VW China EV programs.

PROGRAM: ${snapshot.programNameEn}
CMP TARGET: ${snapshot.targetCostReductionPct}% cost reduction vs European baseline
CURRENT: ${snapshot.currentCostReductionPct}% achieved — ${snapshot.gapPct}pp gap remaining
STATUS: ${snapshot.status}
MARGIN AT RISK (90 DAYS): ${snapshot.marginAtRisk90Days}pp

COST DRIVER BREAKDOWN:
${driverLines}

RECENT EVENTS:
${recentEventSummary}

VW CHINA CONTEXT:
- Key local suppliers: Gotion High-Tech (battery), Horizon Robotics (ADAS/SoC), XPENG (CEA architecture)
- VCTC Hefei: VW's local China technical center for faster development and validation
- BYD, XPENG, NIO applying continuous price pressure requiring VW incentive responses
- Each pp of cost reduction = roughly €20M in annual cost savings at current volumes

Generate exactly 4 recommended actions ranked by (impact_pct / lead_time_weeks) ratio — highest ROI first.

For each action provide a JSON object with these fields:
- actionId: string (act-gem-1, act-gem-2, etc.)
- titleEn: string (concise action title in English, max 60 chars)
- titleZh: string (concise action title in Chinese, max 30 chars)
- descriptionEn: string (2-3 sentences explaining what to do and why, specific to this program's data)
- descriptionZh: string (2-3 sentences in Chinese)
- impactPct: number (percentage points of gap this closes, be realistic)
- leadTimeWeeks: number (integer)
- dependencies: string[] (2-3 specific prerequisites)
- dependenciesZh: string[] (same in Chinese)
- riskFlags: string[] (1-3 risk identifiers like "supply-chain-risk", "volume-commitment-risk", "regulatory-risk", "technical-risk", "relationship-risk")
- riskFlagsZh: string[] (Chinese equivalents)
- marginAtRiskIfSkipped: number (pp of margin at risk over 90 days if this action is not taken)
- status: "pending"

IMPORTANT: Output ONLY a valid JSON array. No markdown, no explanation, no code blocks. Start with [ and end with ].`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 2000 },
      }),
    });

    if (!res.ok) {
      throw new Error(`Gemini API error: ${res.status}`);
    }

    const data = await res.json() as { candidates: { content: { parts: { text: string }[] } }[] };
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';

    // Strip any accidental markdown fences
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const actions = JSON.parse(cleaned) as RecommendedAction[];

    return NextResponse.json({ actions });
  } catch (err) {
    console.error('China CMP actions error:', err);
    return NextResponse.json({ error: 'Failed to generate recommendations' }, { status: 500 });
  }
}
