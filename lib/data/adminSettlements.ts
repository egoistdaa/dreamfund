import "server-only";

import { createAdminSupabase } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type SettlementRow =
  Database["public"]["Tables"]["project_settlements"]["Row"];

type ProjectRow =
  Database["public"]["Tables"]["projects"]["Row"];

export type AdminSettlement = {
  id: string;
  projectId: string;

  settlementStatus: SettlementRow["status"];
  finalStatus: SettlementRow["final_status"];

  unresolvedPaymentCount: number;
  lockedCurrentAmount: number | null;
  lockedSupportersCount: number | null;

  lastCheckedAt: string | null;
  nextCheckAt: string | null;
  settlementLockedAt: string | null;
  refundEligibleAt: string | null;

  attemptCount: number;
  lastError: string | null;

  createdAt: string;
  updatedAt: string;

  projectTitle: string;
  projectSlug: string | null;
  projectStatus: ProjectRow["status"] | null;
  fundingType: ProjectRow["funding_type"] | null;

  goalAmount: number | null;
  currentAmount: number | null;
  supportersCount: number | null;
  endAt: string | null;
};

export type AdminSettlementSummary = {
  totalCount: number;
  checkingCount: number;
  waitingForPaymentsCount: number;
  lockedSucceededCount: number;
  lockedFailedCount: number;
  refundingCount: number;
  completedCount: number;
  manualReviewCount: number;
  unresolvedPaymentCount: number;
};

export type AdminSettlementData = {
  settlements: AdminSettlement[];
  summary: AdminSettlementSummary;
};

function createEmptySummary(): AdminSettlementSummary {
  return {
    totalCount: 0,
    checkingCount: 0,
    waitingForPaymentsCount: 0,
    lockedSucceededCount: 0,
    lockedFailedCount: 0,
    refundingCount: 0,
    completedCount: 0,
    manualReviewCount: 0,
    unresolvedPaymentCount: 0,
  };
}

export async function getAdminSettlements(
  limit = 100
): Promise<AdminSettlementData> {
  const adminSupabase = createAdminSupabase();

  const safeLimit = Math.max(
    1,
    Math.min(limit, 500)
  );

  const { data: settlementData, error: settlementError } =
    await adminSupabase
      .from("project_settlements")
      .select("*")
      .order("updated_at", {
        ascending: false,
      })
      .limit(safeLimit);

  if (settlementError) {
    throw settlementError;
  }

  const settlementRows =
    (settlementData ?? []) as SettlementRow[];

  if (settlementRows.length === 0) {
    return {
      settlements: [],
      summary: createEmptySummary(),
    };
  }

  const projectIds = Array.from(
    new Set(
      settlementRows.map(
        (settlement) => settlement.project_id
      )
    )
  );

  const { data: projectData, error: projectError } =
    await adminSupabase
      .from("projects")
      .select(
        "id, title, slug, status, funding_type, goal_amount, current_amount, supporters_count, end_at"
      )
      .in("id", projectIds);

  if (projectError) {
    throw projectError;
  }

  const projects = (projectData ?? []) as Pick<
    ProjectRow,
    | "id"
    | "title"
    | "slug"
    | "status"
    | "funding_type"
    | "goal_amount"
    | "current_amount"
    | "supporters_count"
    | "end_at"
  >[];

  const projectById = new Map(
    projects.map((project) => [
      project.id,
      project,
    ])
  );

  const settlements: AdminSettlement[] =
    settlementRows.map((settlement) => {
      const project = projectById.get(
        settlement.project_id
      );

      return {
        id: settlement.id,
        projectId: settlement.project_id,

        settlementStatus: settlement.status,
        finalStatus: settlement.final_status,

        unresolvedPaymentCount:
          settlement.unresolved_payment_count,
        lockedCurrentAmount:
          settlement.locked_current_amount,
        lockedSupportersCount:
          settlement.locked_supporters_count,

        lastCheckedAt:
          settlement.last_checked_at,
        nextCheckAt:
          settlement.next_check_at,
        settlementLockedAt:
          settlement.settlement_locked_at,
        refundEligibleAt:
          settlement.refund_eligible_at,

        attemptCount: settlement.attempt_count,
        lastError: settlement.last_error,

        createdAt: settlement.created_at,
        updatedAt: settlement.updated_at,

        projectTitle:
          project?.title ??
          "削除済みまたは不明なプロジェクト",
        projectSlug: project?.slug ?? null,
        projectStatus:
          project?.status ?? null,
        fundingType:
          project?.funding_type ?? null,

        goalAmount:
          project?.goal_amount ?? null,
        currentAmount:
          project?.current_amount ?? null,
        supportersCount:
          project?.supporters_count ?? null,
        endAt:
          project?.end_at ?? null,
      };
    });

  const summary =
    settlements.reduce<AdminSettlementSummary>(
      (current, settlement) => {
        current.totalCount += 1;
        current.unresolvedPaymentCount +=
          settlement.unresolvedPaymentCount;

        switch (settlement.settlementStatus) {
          case "checking":
            current.checkingCount += 1;
            break;

          case "waiting_for_payments":
            current.waitingForPaymentsCount += 1;
            break;

          case "locked_succeeded":
            current.lockedSucceededCount += 1;
            break;

          case "locked_failed":
            current.lockedFailedCount += 1;
            break;

          case "refunding":
            current.refundingCount += 1;
            break;

          case "completed":
            current.completedCount += 1;
            break;

          case "manual_review":
            current.manualReviewCount += 1;
            break;
        }

        return current;
      },
      createEmptySummary()
    );

  return {
    settlements,
    summary,
  };
}
