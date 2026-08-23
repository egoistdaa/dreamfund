import "server-only";

import { createAdminSupabase } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type RefundRow =
  Database["public"]["Tables"]["refunds"]["Row"];

type PledgeRow =
  Database["public"]["Tables"]["pledges"]["Row"];

type ProjectRow =
  Database["public"]["Tables"]["projects"]["Row"];

type SettlementRow =
  Database["public"]["Tables"]["project_settlements"]["Row"];

export type AdminRefund = {
  id: string;
  pledgeId: string;
  projectId: string;

  amount: number;
  reason: string | null;

  refundStatus: RefundRow["status"];
  stripeRefundId: string | null;
  stripeStatus: string | null;

  attemptCount: number;
  lastError: string | null;
  nextRetryAt: string | null;

  manualReviewRequired: boolean;
  manualReviewReason: string | null;
  adminRetryRequestedAt: string | null;

  approvedAt: string | null;
  processingStartedAt: string | null;
  succeededAt: string | null;
  createdAt: string;
  updatedAt: string;

  pledgeStatus: PledgeRow["status"] | null;
  backerId: string | null;
  stripePaymentIntentId: string | null;

  projectTitle: string;
  projectSlug: string | null;
  projectStatus: ProjectRow["status"] | null;
  fundingType: ProjectRow["funding_type"] | null;

  settlementStatus: SettlementRow["status"] | null;
  settlementFinalStatus:
    | SettlementRow["final_status"]
    | null;
  settlementLastError: string | null;
};

export type AdminRefundSummary = {
  totalCount: number;
  approvedCount: number;
  processingCount: number;
  completedCount: number;
  rejectedCount: number;
  manualReviewCount: number;
  totalAmount: number;
  completedAmount: number;
};

export type AdminRefundData = {
  refunds: AdminRefund[];
  summary: AdminRefundSummary;
};

function createEmptySummary(): AdminRefundSummary {
  return {
    totalCount: 0,
    approvedCount: 0,
    processingCount: 0,
    completedCount: 0,
    rejectedCount: 0,
    manualReviewCount: 0,
    totalAmount: 0,
    completedAmount: 0,
  };
}

export async function getAdminRefunds(
  limit = 100
): Promise<AdminRefundData> {
  const adminSupabase = createAdminSupabase();

  const safeLimit = Math.max(
    1,
    Math.min(limit, 500)
  );

  const { data: refundData, error: refundError } =
    await adminSupabase
      .from("refunds")
      .select("*")
      .order("created_at", {
        ascending: false,
      })
      .limit(safeLimit);

  if (refundError) {
    throw refundError;
  }

  const refundRows =
    (refundData ?? []) as RefundRow[];

  if (refundRows.length === 0) {
    return {
      refunds: [],
      summary: createEmptySummary(),
    };
  }

  const pledgeIds = Array.from(
    new Set(
      refundRows.map((refund) => refund.pledge_id)
    )
  );

  const projectIds = Array.from(
    new Set(
      refundRows.map((refund) => refund.project_id)
    )
  );

  const [
    pledgeResult,
    projectResult,
    settlementResult,
  ] = await Promise.all([
    adminSupabase
      .from("pledges")
      .select(
        "id, backer_id, status, stripe_payment_intent_id"
      )
      .in("id", pledgeIds),

    adminSupabase
      .from("projects")
      .select(
        "id, title, slug, status, funding_type"
      )
      .in("id", projectIds),

    adminSupabase
      .from("project_settlements")
      .select(
        "project_id, status, final_status, last_error"
      )
      .in("project_id", projectIds),
  ]);

  if (pledgeResult.error) {
    throw pledgeResult.error;
  }

  if (projectResult.error) {
    throw projectResult.error;
  }

  if (settlementResult.error) {
    throw settlementResult.error;
  }

  const pledges = (pledgeResult.data ??
    []) as Pick<
    PledgeRow,
    | "id"
    | "backer_id"
    | "status"
    | "stripe_payment_intent_id"
  >[];

  const projects = (projectResult.data ??
    []) as Pick<
    ProjectRow,
    | "id"
    | "title"
    | "slug"
    | "status"
    | "funding_type"
  >[];

  const settlements = (settlementResult.data ??
    []) as Pick<
    SettlementRow,
    | "project_id"
    | "status"
    | "final_status"
    | "last_error"
  >[];

  const pledgeById = new Map(
    pledges.map((pledge) => [
      pledge.id,
      pledge,
    ])
  );

  const projectById = new Map(
    projects.map((project) => [
      project.id,
      project,
    ])
  );

  const settlementByProjectId = new Map(
    settlements.map((settlement) => [
      settlement.project_id,
      settlement,
    ])
  );

  const refunds: AdminRefund[] = refundRows.map(
    (refund) => {
      const pledge = pledgeById.get(
        refund.pledge_id
      );

      const project = projectById.get(
        refund.project_id
      );

      const settlement =
        settlementByProjectId.get(
          refund.project_id
        );

      return {
        id: refund.id,
        pledgeId: refund.pledge_id,
        projectId: refund.project_id,

        amount: refund.amount,
        reason: refund.reason,

        refundStatus: refund.status,
        stripeRefundId:
          refund.stripe_refund_id,
        stripeStatus: refund.stripe_status,

        attemptCount: refund.attempt_count,
        lastError: refund.last_error,
        nextRetryAt: refund.next_retry_at,

        manualReviewRequired:
          refund.manual_review_required,
        manualReviewReason:
          refund.manual_review_reason,
        adminRetryRequestedAt:
          refund.admin_retry_requested_at,

        approvedAt: refund.approved_at,
        processingStartedAt:
          refund.processing_started_at,
        succeededAt: refund.succeeded_at,
        createdAt: refund.created_at,
        updatedAt: refund.updated_at,

        pledgeStatus: pledge?.status ?? null,
        backerId: pledge?.backer_id ?? null,
        stripePaymentIntentId:
          pledge?.stripe_payment_intent_id ??
          null,

        projectTitle:
          project?.title ??
          "削除済みまたは不明なプロジェクト",
        projectSlug: project?.slug ?? null,
        projectStatus:
          project?.status ?? null,
        fundingType:
          project?.funding_type ?? null,

        settlementStatus:
          settlement?.status ?? null,
        settlementFinalStatus:
          settlement?.final_status ?? null,
        settlementLastError:
          settlement?.last_error ?? null,
      };
    }
  );

  const summary = refunds.reduce<AdminRefundSummary>(
    (current, refund) => {
      current.totalCount += 1;
      current.totalAmount += refund.amount;

      if (refund.refundStatus === "approved") {
        current.approvedCount += 1;
      }

      if (refund.refundStatus === "processing") {
        current.processingCount += 1;
      }

      if (refund.refundStatus === "done") {
        current.completedCount += 1;
        current.completedAmount += refund.amount;
      }

      if (refund.refundStatus === "rejected") {
        current.rejectedCount += 1;
      }

      if (refund.manualReviewRequired) {
        current.manualReviewCount += 1;
      }

      return current;
    },
    createEmptySummary()
  );

  return {
    refunds,
    summary,
  };
}
