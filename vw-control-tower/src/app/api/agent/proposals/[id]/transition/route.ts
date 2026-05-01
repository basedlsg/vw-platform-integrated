import { NextRequest, NextResponse } from 'next/server';
import { appendEvent, getNextSequence, fetchAllEventsForEntity } from '@/lib/esaa/event-store';
import type { BaseEvent } from '@/lib/esaa/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

type Cascade = {
  type: 'PROPOSAL_APPROVED' | 'KPI_TARGET_ADJUSTED' | 'RISK_THRESHOLD_SET';
  entityId: string;
  detail: string;
};

type ProposalStatus =
  | 'PENDING'
  | 'WATCHING'
  | 'IN_DISCUSSION'
  | 'AWAITING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'DISMISSED';

const VALID: ProposalStatus[] = [
  'PENDING',
  'WATCHING',
  'IN_DISCUSSION',
  'AWAITING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'DISMISSED',
];

type KpiChange = { target?: number };
type RiskChange = { threshold?: number; impact?: 'LOW' | 'MEDIUM' | 'HIGH' };
type ProposedStateChange = {
  kpis?: Record<string, KpiChange>;
  risks?: Record<string, RiskChange>;
};

/**
 * POST /api/agent/proposals/[id]/transition
 *
 * Body: { newStatus: ProposalStatus, actor?: string, note?: string }
 *
 * The unified Decision-Board workflow endpoint. Always records a
 * ProposalStatusChangedEvent. Only when the new status is `APPROVED`
 * does it ALSO commit the cascading KPI / risk events declared in the
 * original proposal's `proposedStateChange`. That is the manager-
 * approval gate: a scenario can move PENDING → WATCHING →
 * IN_DISCUSSION → AWAITING_APPROVAL all day without touching planning
 * numbers; only the final APPROVE click writes the ripple.
 */
export async function POST(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { id: proposalId } = await context.params;
    const body = (await req.json().catch(() => ({}))) as {
      newStatus?: ProposalStatus;
      actor?: string;
      note?: string;
    };

    const newStatus = body.newStatus;
    if (!newStatus || !VALID.includes(newStatus)) {
      return NextResponse.json(
        { error: `Invalid newStatus. Expected one of: ${VALID.join(', ')}` },
        { status: 400 }
      );
    }

    const proposalEvents = await fetchAllEventsForEntity(proposalId);
    const created = proposalEvents.find((e) => e.type === 'AgentProposalCreatedEvent');
    const createdPayload = created?.payload as
      | { title?: string; proposedStateChange?: ProposedStateChange }
      | undefined;

    const title = createdPayload?.title ?? proposalId;
    const proposed = createdPayload?.proposedStateChange ?? {};

    const cascades: Cascade[] = [];

    // 1. Always record the status-change event.
    const seqProposal = await getNextSequence(proposalId);
    const statusEvent: BaseEvent = {
      id: crypto.randomUUID(),
      entityId: proposalId,
      entityType: 'PROPOSAL',
      type: 'ProposalStatusChangedEvent',
      sequence: seqProposal,
      timestamp: new Date().toISOString(),
      payload: {
        proposalId,
        newStatus,
        reviewerNote: body.note,
        actor: body.actor,
      },
    };
    await appendEvent(statusEvent);

    if (newStatus === 'APPROVED') {
      cascades.push({
        type: 'PROPOSAL_APPROVED',
        entityId: proposalId,
        detail: title,
      });

      // 2. Cascade KPI target adjustments.
      if (proposed.kpis) {
        for (const [kpiId, change] of Object.entries(proposed.kpis)) {
          if (typeof change?.target === 'number') {
            const seq = await getNextSequence(kpiId);
            const ev: BaseEvent = {
              id: crypto.randomUUID(),
              entityId: kpiId,
              entityType: 'KPI',
              type: 'KpiValueUpdatedEvent',
              sequence: seq,
              timestamp: new Date().toISOString(),
              payload: {
                kpiId,
                newValue: change.target,
                reason: `Policy adjustment via approval of ${proposalId} (${title})`,
              },
            };
            await appendEvent(ev);
            cascades.push({
              type: 'KPI_TARGET_ADJUSTED',
              entityId: kpiId,
              detail: `Target set to ${change.target}`,
            });
          }
        }
      }

      // 3. Cascade risk threshold / impact resets.
      if (proposed.risks) {
        for (const [riskId, change] of Object.entries(proposed.risks)) {
          if (
            typeof change?.threshold === 'number' &&
            (change?.impact === 'LOW' || change?.impact === 'MEDIUM' || change?.impact === 'HIGH')
          ) {
            const seq = await getNextSequence(riskId);
            const ev: BaseEvent = {
              id: crypto.randomUUID(),
              entityId: riskId,
              entityType: 'RISK',
              type: 'RiskThresholdSetEvent',
              sequence: seq,
              timestamp: new Date().toISOString(),
              payload: {
                riskId,
                newThreshold: change.threshold,
                impactLevel: change.impact,
              },
            };
            await appendEvent(ev);
            cascades.push({
              type: 'RISK_THRESHOLD_SET',
              entityId: riskId,
              detail: `Threshold ${change.threshold} · ${change.impact}`,
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      proposalId,
      newStatus,
      title,
      cascades,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
