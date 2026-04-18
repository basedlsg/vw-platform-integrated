import { NextRequest, NextResponse } from 'next/server';
import type { SupplierSnapshot, SCRecommendedAction } from '@/lib/supply-chain/types';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export async function POST(req: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
  }

  const body = await req.json() as { supplier: SupplierSnapshot; lang: 'en' | 'zh' };
  const { supplier } = body;

  const riskLines = supplier.activeRisks.map((r) =>
    `- [${r.level}] ${r.titleEn}: ${r.descriptionEn} (programs: ${r.programs.join(', ')})`
  ).join('\n') || '- No active risks';

  const actionLines = supplier.correctiveActions.map((ca) =>
    `- [${ca.status}] ${ca.titleEn} (due: ${ca.dueDate}, blocks award: ${ca.blocksAward})`
  ).join('\n') || '- No open corrective actions';

  const certLines = supplier.certifications.map((c) =>
    `- ${c.name}: ${c.status}${c.validUntil ? ` (expires ${c.validUntil})` : ''}`
  ).join('\n');

  const passportSummary = supplier.batteryPassport
    ? `Battery Passport: ${supplier.batteryPassport.completenessPercent}% complete. EU Passport Ready: ${supplier.batteryPassport.euPassportReady}. Recycled content evidenced: ${supplier.batteryPassport.recycledContentEvidenced}. Upstream coverage: ${supplier.batteryPassport.upstreamCoveragePercent}%.`
    : 'Battery Passport: Not applicable for this supplier.';

  const prompt = `You are a senior VW Group supply chain sustainability advisor. Your task is to generate specific, evidence-backed recommendations for this supplier to close their sustainability gaps and achieve VW award readiness.

SUPPLIER: ${supplier.nameEn} (${supplier.nameZh})
TIER: ${supplier.tier}
COMPONENT: ${supplier.component}
PROGRAMS: ${supplier.programs.join(', ')}
AWARD STATUS: ${supplier.awardStatus}
S-RATING: ${supplier.sRating}
COUNTRY: ${supplier.country}

CERTIFICATIONS:
${certLines}

EMISSIONS (Latest: ${supplier.latestEmissionQ}):
- Scope 1: ${supplier.latestScope1} tCO2e
- Scope 2: ${supplier.latestScope2} tCO2e
- Trend: ${supplier.emissionTrend}

${passportSummary}

ACTIVE RISKS:
${riskLines}

OPEN CORRECTIVE ACTIONS:
${actionLines}

VW CONTEXT:
- S-Rating (sustainability gate): A = excellent, B = acceptable, C/D = at risk, Not Assessed = blocks award
- EU Battery Regulation requires battery passport data including upstream chain coverage, carbon footprint, recycled content, and SoH protocols
- CSDDD (EU Corporate Sustainability Due Diligence Directive) requires human-rights and environmental due diligence in supply chain
- VW reported 83% of procurement volume from suppliers with positive S-Rating in 2024 — this is a KPI

Generate exactly 3 recommended actions answering: What is the issue? Why does it matter? What is the best next action?

Answer each of the three questions for each action. Each action must be answerable and grounded in the data above.

Return a valid JSON array. Each object must have:
- actionId: "sc-gem-1", "sc-gem-2", "sc-gem-3"
- titleEn: string (max 60 chars, specific to this supplier)
- titleZh: string (max 30 chars)
- issueEn: string (1-2 sentences describing the specific gap or risk)
- issueZh: string (Chinese)
- whyMattersEn: string (1-2 sentences on business/compliance/legal consequence if not addressed)
- whyMattersZh: string (Chinese)
- nextActionEn: string (2-3 sentences: specific step, who does it, what outcome to expect, by when)
- nextActionZh: string (Chinese)
- priority: "Critical" | "High" | "Medium"
- supplierId: "${supplier.supplierId}"
- blocksAward: boolean
- daysToResolve: number (realistic)
- status: "pending"

IMPORTANT: Output ONLY a valid JSON array. No markdown, no explanation. Start with [ and end with ].`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.25, maxOutputTokens: 2000 },
      }),
    });

    if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);

    const data = await res.json() as { candidates: { content: { parts: { text: string }[] } }[] };
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const actions = JSON.parse(cleaned) as SCRecommendedAction[];

    return NextResponse.json({ actions });
  } catch (err) {
    console.error('Supply chain actions error:', err);
    return NextResponse.json({ error: 'Failed to generate recommendations' }, { status: 500 });
  }
}
