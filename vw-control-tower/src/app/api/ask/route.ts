import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/ask
 *
 * Body: { question: string, context: string, maxTokens?: number }
 * Returns: { answer: string, model: string }
 *
 * Calls Meta's official Llama API at api.llama.com/v1/chat/completions
 * (the native endpoint, NOT the OpenAI-compatible /compat/v1 — that
 * one isn't enabled for this key). Default model is Llama-4-Maverick;
 * override via LLAMA_MODEL.
 *
 * Required env:
 *   LLAMA_API_KEY=<your-meta-llama-api-key>
 *
 * Optional:
 *   LLAMA_MODEL=Llama-4-Maverick-17B-128E-Instruct-FP8 (default)
 *   LLAMA_BASE_URL=https://api.llama.com/v1 (default)
 */

interface AskBody {
  question: string;
  context: string;
  maxTokens?: number;
}

const SYSTEM_PROMPT = `You are a senior VW Group financial analyst. Answer ONLY from the data the user provides. Reference specific numbers and dates. Write calmly — no exclamation, no bullets, no headings, no markdown unless the user explicitly asks. Three to five sentences unless the user asks for shorter.`;

const LLAMA_BASE_URL = process.env.LLAMA_BASE_URL || 'https://api.llama.com/v1';
const LLAMA_MODEL =
  process.env.LLAMA_MODEL || 'Llama-4-Maverick-17B-128E-Instruct-FP8';

interface LlamaNativeResponse {
  id?: string;
  completion_message?: {
    role?: string;
    content?: { type?: string; text?: string };
  };
  error?: { message?: string };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: AskBody;
  try {
    body = (await req.json()) as AskBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.question) {
    return NextResponse.json({ error: 'Missing question' }, { status: 400 });
  }

  const apiKey = process.env.LLAMA_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'LLAMA_API_KEY not configured' },
      { status: 503 }
    );
  }

  const userPrompt = `Data:\n${body.context ?? '(none provided)'}\n\nQuestion: ${body.question}`;
  const maxTokens = body.maxTokens ?? 320;

  try {
    const res = await fetch(`${LLAMA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: LLAMA_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        max_completion_tokens: maxTokens,
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error(`Llama API error ${res.status}:`, txt.slice(0, 500));
      return NextResponse.json(
        { error: 'upstream_error', status: res.status, detail: txt.slice(0, 200) },
        { status: 502 }
      );
    }

    const data = (await res.json()) as LlamaNativeResponse;
    const answer = data.completion_message?.content?.text?.trim() ?? '';
    return NextResponse.json({ answer, model: LLAMA_MODEL });
  } catch (err) {
    console.error('Llama API fetch failed:', err);
    return NextResponse.json({ error: 'fetch_failed' }, { status: 502 });
  }
}
