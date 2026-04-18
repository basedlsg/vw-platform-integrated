import { NextRequest, NextResponse } from 'next/server';
import type { ChinaCmpProgramSnapshot, RecommendedAction } from '@/lib/china-cmp/types';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export async function POST(req: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
  }

  const body = await req.json() as {
    actionId: string;
    action: RecommendedAction;
    snapshot: ChinaCmpProgramSnapshot;
    lang: 'en' | 'zh';
  };

  const { action, snapshot, lang } = body;

  const prompt = `You are a senior VW Group China cost-competitiveness advisor. Provide a DEEP RESEARCH analysis of this specific recommended action.

PROGRAM: ${snapshot.programNameEn}
STATUS: ${snapshot.status} — ${snapshot.currentCostReductionPct}% achieved vs ${snapshot.targetCostReductionPct}% target
SOP: ${snapshot.sopDate}

ACTION UNDER ANALYSIS:
- Title: ${action.titleEn}
- Description: ${action.descriptionEn}
- Impact: ${action.impactPct}pp (€${action.impactEurM}M/yr)
- Lead time: ${action.leadTimeWeeks} weeks
- Dependencies: ${action.dependencies.join('; ')}
- Risk flags: ${action.riskFlags.join(', ')}
- Margin at risk if skipped: ${action.marginAtRiskIfSkipped}pp

COST DRIVER CONTEXT:
- Battery: ${snapshot.costDriverBreakdown.battery.achieved}pp/${snapshot.costDriverBreakdown.battery.needed}pp (${snapshot.costDriverBreakdown.battery.status})
- CEA: ${snapshot.costDriverBreakdown.cea.achieved}pp/${snapshot.costDriverBreakdown.cea.needed}pp (${snapshot.costDriverBreakdown.cea.status})
- ADAS: ${snapshot.costDriverBreakdown.adas_soc.achieved}pp/${snapshot.costDriverBreakdown.adas_soc.needed}pp (${snapshot.costDriverBreakdown.adas_soc.status})

Provide analysis in this exact JSON format. Output ONLY valid JSON, no markdown:
{
  "executionSteps": ["step1", "step2", "step3", "step4", "step5"],
  "executionStepsZh": ["步骤1", "步骤2", "步骤3", "步骤4", "步骤5"],
  "keyRisks": ["risk1", "risk2", "risk3"],
  "keyRisksZh": ["风险1", "风险2", "风险3"],
  "alternativeApproaches": ["alt1", "alt2"],
  "alternativeApproachesZh": ["替代1", "替代2"],
  "negotiationInsight": "specific negotiation advice",
  "negotiationInsightZh": "具体谈判建议",
  "timelineDetail": "week-by-week execution plan",
  "timelineDetailZh": "逐周执行计划",
  "confidenceLevel": "HIGH/MEDIUM/LOW",
  "confidenceReason": "why this confidence level",
  "confidenceReasonZh": "置信度原因"
}`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 2000 },
      }),
    });

    if (!res.ok) throw new Error(`Gemini error: ${res.status}`);

    const data = await res.json() as { candidates: { content: { parts: { text: string }[] } }[] };
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const research = JSON.parse(cleaned);

    return NextResponse.json({ research });
  } catch {
    return NextResponse.json({ error: 'Failed to generate research' }, { status: 500 });
  }
}
