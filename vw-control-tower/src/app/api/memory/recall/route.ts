import { NextRequest, NextResponse } from 'next/server';
import {
  formatRecallForPrompt,
  readSignalContext,
  recallRelevantDecisions,
  type StrategyPillar,
} from '@/lib/memory/recall';

/**
 * POST /api/memory/recall
 *
 * Body: one of
 *   { proposalId: string, limit?, lang? }                    // recall against a specific signal
 *   { touches: StrategyPillar[], affects?: string[], ... }   // recall against an arbitrary query
 *
 * Returns:
 *   {
 *     recalls: RecalledDecision[],
 *     promptText: string  // pre-formatted block ready for an LLM prompt
 *   }
 *
 * Used by the Briefing, Workspace, and Discuss components so the
 * AI narration layer reasons against past decisions instead of
 * just the current snapshot.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as {
      proposalId?: string;
      touches?: StrategyPillar[];
      affects?: string[];
      limit?: number;
      lang?: 'en' | 'zh';
    };

    let touches: StrategyPillar[] = body.touches ?? [];
    let affects: string[] = body.affects ?? [];
    let excludeProposalId: string | undefined = undefined;

    if (body.proposalId) {
      const ctx = await readSignalContext(body.proposalId);
      if (ctx) {
        touches = ctx.touches;
        affects = ctx.affects;
      }
      excludeProposalId = body.proposalId;
    }

    // No query inputs at all — every comparison would be 0, so just
    // bail out early rather than scan the whole event stream for nothing.
    if (touches.length === 0 && affects.length === 0) {
      return NextResponse.json({ recalls: [], promptText: '' });
    }

    const recalls = await recallRelevantDecisions({
      touches,
      affects,
      excludeProposalId,
      limit: body.limit ?? 5,
    });

    const promptText = formatRecallForPrompt(recalls, body.lang ?? 'en');
    return NextResponse.json({ recalls, promptText });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
