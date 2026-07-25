import Stripe from "stripe";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type { PledgeStatusDB } from "@/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PROJECTS_PER_RUN = 20;

type AdminSupabase = ReturnType<typeof createAdminSupabase>;
type PaymentIntentStatus = Stripe.PaymentIntent["status"];

type PendingPledge = {
    id: string;
    status: PledgeStatusDB;
    stripe_payment_intent_id: string | null;
};

type PledgeSyncResult = {
    pledgeId: string;
    paymentIntentId: string | null;
    stripeStatus: PaymentIntentStatus | "missing";
    result:
    | "paid"
    | "failed"
    | "canceled"
    | "waiting"
    | "error";
    message?: string;
};

const CANCELLABLE_PAYMENT_INTENT_STATUSES =
    new Set<PaymentIntentStatus>([
        "requires_payment_method",
        "requires_confirmation",
        "requires_action",
        "requires_capture",
    ]);

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return "不明なエラー";
}

async function updatePendingPledgeStatus(
    adminSupabase: AdminSupabase,
    pledgeId: string,
    paymentIntentId: string,
    status: "paid" | "failed"
) {
    const { error } = await adminSupabase
        .from("pledges")
        .update({
            status,
            updated_at: new Date().toISOString(),
        })
        .eq("id", pledgeId)
        .eq("stripe_payment_intent_id", paymentIntentId)
        .in("status", ["pending", "failed"]);

    if (error) {
        throw error;
    }
}

async function syncPendingPledge(
    adminSupabase: AdminSupabase,
    pledge: PendingPledge
): Promise<PledgeSyncResult> {
    const paymentIntentId =
        pledge.stripe_payment_intent_id;

    if (!paymentIntentId) {
        if (pledge.status === "failed") {
            return {
                pledgeId: pledge.id,
                paymentIntentId: null,
                stripeStatus: "missing",
                result: "failed",
                message:
                    "失敗確定済みでPaymentIntent IDはありません",
            };
        }

        return {
            pledgeId: pledge.id,
            paymentIntentId: null,
            stripeStatus: "missing",
            result: "waiting",
            message:
                "pending支援にPaymentIntent IDが保存されていません",
        };
    }

    let paymentIntent: Stripe.PaymentIntent;

    try {
        paymentIntent =
            await stripe.paymentIntents.retrieve(
                paymentIntentId
            );
    } catch (error) {
        return {
            pledgeId: pledge.id,
            paymentIntentId,
            stripeStatus: "missing",
            result: "error",
            message: `PaymentIntent取得失敗: ${getErrorMessage(
                error
            )}`,
        };
    }

    if (paymentIntent.status === "succeeded") {
        try {
            await updatePendingPledgeStatus(
                adminSupabase,
                pledge.id,
                paymentIntent.id,
                "paid"
            );

            return {
                pledgeId: pledge.id,
                paymentIntentId: paymentIntent.id,
                stripeStatus: paymentIntent.status,
                result: "paid",
            };
        } catch (error) {
            return {
                pledgeId: pledge.id,
                paymentIntentId: paymentIntent.id,
                stripeStatus: paymentIntent.status,
                result: "error",
                message: `paid同期失敗: ${getErrorMessage(error)}`,
            };
        }
    }

    if (paymentIntent.status === "canceled") {
        try {
            await updatePendingPledgeStatus(
                adminSupabase,
                pledge.id,
                paymentIntent.id,
                "failed"
            );

            return {
                pledgeId: pledge.id,
                paymentIntentId: paymentIntent.id,
                stripeStatus: paymentIntent.status,
                result: "failed",
            };
        } catch (error) {
            return {
                pledgeId: pledge.id,
                paymentIntentId: paymentIntent.id,
                stripeStatus: paymentIntent.status,
                result: "error",
                message: `failed同期失敗: ${getErrorMessage(error)}`,
            };
        }
    }

    if (
        CANCELLABLE_PAYMENT_INTENT_STATUSES.has(
            paymentIntent.status
        )
    ) {
        try {
            const canceledPaymentIntent =
                await stripe.paymentIntents.cancel(
                    paymentIntent.id,
                    {},
                    {
                        idempotencyKey:
                            `dreamfund-cancel-${pledge.id}`,
                    }
                );

            await updatePendingPledgeStatus(
                adminSupabase,
                pledge.id,
                canceledPaymentIntent.id,
                "failed"
            );

            return {
                pledgeId: pledge.id,
                paymentIntentId: canceledPaymentIntent.id,
                stripeStatus: canceledPaymentIntent.status,
                result: "canceled",
            };
        } catch (error) {
            return {
                pledgeId: pledge.id,
                paymentIntentId: paymentIntent.id,
                stripeStatus: paymentIntent.status,
                result: "error",
                message: `PaymentIntentキャンセル失敗: ${getErrorMessage(
                    error
                )}`,
            };
        }
    }

    return {
        pledgeId: pledge.id,
        paymentIntentId: paymentIntent.id,
        stripeStatus: paymentIntent.status,
        result: "waiting",
        message:
            "Stripe側の決済処理が完了していないため再確認します",
    };
}

export async function GET(request: Request) {
    const cronSecret = process.env.CRON_SECRET;
    const authorization =
        request.headers.get("authorization");

    if (
        !cronSecret ||
        authorization !== `Bearer ${cronSecret}`
    ) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    const adminSupabase = createAdminSupabase();
    const cutoff = new Date(
        Date.now() - 30 * 60 * 1000
    ).toISOString();

    try {
        const { data: endedProjects, error: projectError } =
            await adminSupabase
                .from("projects")
                .select("id, slug, status, end_at, current_amount")
                .in("status", ["live", "failed", "succeeded"])
                .lte("end_at", cutoff)
                .order("end_at", { ascending: true })
                .limit(MAX_PROJECTS_PER_RUN);

        if (projectError) {
            throw projectError;
        }

        if (!endedProjects?.length) {
            return NextResponse.json({
                success: true,
                processedProjectCount: 0,
                results: [],
            });
        }

        const projectIds = endedProjects.map(
            (project) => project.id
        );

        const {
            data: existingSettlements,
            error: settlementError,
        } = await adminSupabase
            .from("project_settlements")
            .select("project_id, status, settlement_locked_at")
            .in("project_id", projectIds);

        if (settlementError) {
            throw settlementError;
        }

        const blockedProjectIds = new Set(
  (existingSettlements ?? [])
    .filter(
      (settlement) =>
        settlement.settlement_locked_at !== null ||
        settlement.status === "manual_review"
    )
    .map((settlement) => settlement.project_id)
);

const candidateProjects = endedProjects.filter(
  (project) => !blockedProjectIds.has(project.id)
);

        const results = [];

        for (const project of candidateProjects) {
            const {
                data: pendingPledges,
                error: pledgeError,
            } = await adminSupabase
                .from("pledges")
                .select("id, status, stripe_payment_intent_id")
                .eq("project_id", project.id)
                .in("status", ["pending", "failed"])
                .order("created_at", { ascending: true });

            if (pledgeError) {
                results.push({
                    projectId: project.id,
                    slug: project.slug,
                    success: false,
                    error: pledgeError.message,
                });

                continue;
            }

            const pledgeResults: PledgeSyncResult[] = [];

            for (const pledge of pendingPledges ?? []) {
                const pledgeResult = await syncPendingPledge(
                    adminSupabase,
                    pledge
                );

                pledgeResults.push(pledgeResult);
            }

            const unresolvedResults = pledgeResults.filter(
                (result) =>
                    result.result === "waiting" ||
                    result.result === "error"
            );

            if (unresolvedResults.length > 0) {
                const now = new Date();
                const nextCheckAt = new Date(
                    now.getTime() + 15 * 60 * 1000
                );

                const lastError = unresolvedResults
                    .map(
                        (result) =>
                            `${result.pledgeId}: ${result.message ?? result.result
                            }`
                    )
                    .join(" | ");

                const { error: waitingError } =
                    await adminSupabase
                        .from("project_settlements")
                        .upsert(
                            {
                                project_id: project.id,
                                status: "waiting_for_payments",
                                unresolved_payment_count:
                                    unresolvedResults.length,
                                last_checked_at: now.toISOString(),
                                next_check_at:
                                    nextCheckAt.toISOString(),
                                last_error: lastError,
                                updated_at: now.toISOString(),
                            },
                            {
                                onConflict: "project_id",
                            }
                        );

                if (waitingError) {
                    results.push({
                        projectId: project.id,
                        slug: project.slug,
                        success: false,
                        pledgeResults,
                        error: waitingError.message,
                    });

                    continue;
                }

                results.push({
                    projectId: project.id,
                    slug: project.slug,
                    success: true,
                    waitingForPayments: true,
                    pledgeResults,
                    lockResult: null,
                });

                continue;
            }
                  const {
        data: latestProject,
        error: latestProjectError,
      } = await adminSupabase
        .from("projects")
        .select("current_amount")
        .eq("id", project.id)
        .single();

      if (latestProjectError) {
        results.push({
          projectId: project.id,
          slug: project.slug,
          success: false,
          pledgeResults,
          error: latestProjectError.message,
        });

        continue;
      }
      const {
        data: paidPledges,
        error: paidPledgeError,
      } = await adminSupabase
        .from("pledges")
        .select("amount")
        .eq("project_id", project.id)
        .eq("status", "paid");

      if (paidPledgeError) {
        results.push({
          projectId: project.id,
          slug: project.slug,
          success: false,
          pledgeResults,
          error: paidPledgeError.message,
        });

        continue;
      }

      const paidAmount = (paidPledges ?? []).reduce(
        (total, pledge) => total + pledge.amount,
        0
      );

      if (paidAmount !== latestProject.current_amount) {
        const now = new Date();
        const mismatchMessage =
          `表示金額とpaid支援合計が一致しません: ` +
          `current_amount=${latestProject.current_amount}, ` +
          `paid_amount=${paidAmount}`;

        const { error: manualReviewError } =
          await adminSupabase
            .from("project_settlements")
            .upsert(
              {
                project_id: project.id,
                status: "manual_review",
                unresolved_payment_count: 0,
                last_checked_at: now.toISOString(),
                next_check_at: null,
                last_error: mismatchMessage,
                updated_at: now.toISOString(),
              },
              {
                onConflict: "project_id",
              }
            );

        if (manualReviewError) {
          results.push({
            projectId: project.id,
            slug: project.slug,
            success: false,
            pledgeResults,
            error: manualReviewError.message,
          });

          continue;
        }

        results.push({
          projectId: project.id,
          slug: project.slug,
          success: true,
          manualReviewRequired: true,
          pledgeResults,
          currentAmount: latestProject.current_amount,
          paidAmount,
          lockResult: null,
        });

        continue;
      }

            const { data: lockData, error: lockError } =
                await adminSupabase.rpc(
                    "lock_project_settlement",
                    {
                        p_project_id: project.id,
                    }
                );

            if (lockError) {
                results.push({
                    projectId: project.id,
                    slug: project.slug,
                    success: false,
                    pledgeResults,
                    error: lockError.message,
                });

                continue;
            }

            const lockResult = lockData?.[0] ?? null;

            results.push({
                projectId: project.id,
                slug: project.slug,
                success: true,
                pledgeResults,
                lockResult,
            });
        }

        return NextResponse.json({
            success: true,
            processedProjectCount: results.length,
            results,
        });
    } catch (error) {
        console.error(
            "DreamFund settlement processing failed:",
            error
        );

        return NextResponse.json(
            {
                success: false,
                error: "プロジェクトの精算処理に失敗しました",
            },
            { status: 500 }
        );
    }
}
