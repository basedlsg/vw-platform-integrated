import { NextRequest, NextResponse } from 'next/server';
import type { ChinaCmpProgramSnapshot, ChatMessage } from '@/lib/china-cmp/types';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export async function POST(req: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ reply: 'Gemini API key not configured. Please add GEMINI_API_KEY to .env.local' }, { status: 200 });
  }

  const body = await req.json() as {
    message: string;
    context: string | null;
    snapshot: ChinaCmpProgramSnapshot;
    lang: 'en' | 'zh';
    history: ChatMessage[];
  };

  const { message, context, snapshot, lang, history } = body;

  const historyText = history
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');

  const prompt = `You are a VW Group China cost-competitiveness advisor embedded in the CMP Operating System. Answer concisely and actionably.

PROGRAM: ${snapshot.programNameEn} (${snapshot.programNameZh})
STATUS: ${snapshot.status} — ${snapshot.currentCostReductionPct}% achieved vs ${snapshot.targetCostReductionPct}% target (${snapshot.gapPct}pp gap = €${snapshot.gapEurM}M/yr)
SOP TARGET: ${snapshot.sopDate}
MARGIN AT RISK (90 days): ${snapshot.marginAtRisk90Days}pp (€${snapshot.marginAtRiskEurM}M)
BIGGEST LEVER: ${snapshot.biggestLeverEn}

COST DRIVERS:
- Battery: ${snapshot.costDriverBreakdown.battery.achieved}pp achieved vs ${snapshot.costDriverBreakdown.battery.needed}pp needed (${snapshot.costDriverBreakdown.battery.status})
- CEA: ${snapshot.costDriverBreakdown.cea.achieved}pp vs ${snapshot.costDriverBreakdown.cea.needed}pp (${snapshot.costDriverBreakdown.cea.status})
- ADAS/SoC: ${snapshot.costDriverBreakdown.adas_soc.achieved}pp vs ${snapshot.costDriverBreakdown.adas_soc.needed}pp (${snapshot.costDriverBreakdown.adas_soc.status})
- Local Modules: ${snapshot.costDriverBreakdown.localModules.achieved}pp vs ${snapshot.costDriverBreakdown.localModules.needed}pp (${snapshot.costDriverBreakdown.localModules.status})
- Incentive headwind: +${snapshot.costDriverBreakdown.incentiveHeadwind}pp
- Timing headwind: +${snapshot.costDriverBreakdown.timingHeadwind}pp

${context ? `USER IS ASKING ABOUT: ${context}` : ''}

CONVERSATION HISTORY:
${historyText || '(none)'}

USER: ${message}

Respond in ${lang === 'zh' ? 'Chinese' : 'English'}. Be specific — reference actual numbers, supplier names, and deadlines. Keep response under 150 words.`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 500 },
      }),
    });

    if (!res.ok) throw new Error(`Gemini error: ${res.status}`);

    const data = await res.json() as { candidates: { content: { parts: { text: string }[] } }[] };
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text ?? (lang === 'zh' ? '无法生成回答。' : 'Could not generate a response.');

    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json({
      reply: lang === 'zh' ? '暂时无法连接AI服务，请稍后再试。' : 'Could not reach AI service. Please try again.',
    });
  }
}
