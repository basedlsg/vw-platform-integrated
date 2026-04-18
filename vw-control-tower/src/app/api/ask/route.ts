import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/ask
 * Sends a question + context to Gemini and returns an analytical answer with citations.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { question, context } = (await req.json()) as { question: string; context: string };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        answer: 'AI assistant is not configured. Set GEMINI_API_KEY in .env.local to enable this feature.',
      });
    }

    const prompt = `You are a senior VW Group financial analyst. You have deep expertise in automotive industry economics, margin analysis, EV transition costs, and geopolitical trade impacts.

Based ONLY on the data provided below, answer the user's question. Your answer MUST:
1. Reference specific numbers and dates from the data (e.g., "margin fell from 8.5% in Apr 22 to 3.8% in Apr 24")
2. Draw correlations between data points (e.g., "the drop coincided with VW's Q3 2024 profit warning and €3.6B restructuring charge")
3. Cite the source report for each claim (e.g., "per the VW Group H1 2024 Half-Year Report")
4. Identify the likely business drivers (pricing pressure, EV transition costs, tariff exposure, raw materials, restructuring charges, incentive spending, China competition)
5. Be direct and analytical — write like a finance professional, not a chatbot

Format: 3-5 sentences. Every factual claim must reference its source. If correlating with known VW events (tariffs, China competition, restructuring), explain the connection.

Known VW context:
- VW announced €3.6B restructuring provisions in Q3 2024
- US tariff risk: potential 25% on imports, ~€2.9B exposure
- China: BYD overtook VW in Q1 2023, Chinese brands control 35%+ of EV market
- VW's 5-year plan targets 6%+ operating margin by FY2026
- €10B cost-reduction program announced late 2024
- XPENG partnership for China-specific EVs

Data:
${context}

Question: ${question}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 500, temperature: 0.2 },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error('Gemini API error:', err);
      return NextResponse.json({ answer: 'Unable to generate an answer right now.' });
    }

    const data = await res.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No answer generated.';
    return NextResponse.json({ answer });
  } catch (err) {
    console.error('Ask API error:', err);
    return NextResponse.json({ answer: 'Something went wrong. Try again.' });
  }
}
