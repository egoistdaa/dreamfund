import Stripe from "stripe";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_REFUNDS_PER_RUN = 20;
const RETRY_AFTER_SECONDS = 15 * 60;

type AdminSupabase = ReturnType<typeof createAdminSupabase>;

type SupportedRefundStatus =
    | "pending"
    | "requires_action"
    | "succeeded"
    | "failed"
    | "canceled";

type ClaimedRefund = {
    refund_id: string;
    pledge_id: string;
    project_id: string;
    amount: number;
    stripe_payment_intent_id: string;
    idempotency_key: string;
    attempt_count: number;
};

type ReconciliationRefund = {
    id: string;
    project_id: string;
    stripe_refund_id: string | null;
};

const SUPPORTED_REFUND_STATUSES =
    new Set<SupportedRefundStatus>([
        "pending",
        "requires_action",
        "succeeded",
        "failed",
        "canceled",
    ]);

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return "Unknown refund processing error";
}

function normalizeRefundStatus(
    status: string | null
): SupportedRefundStatus {
    if (
        status &&
        SUPPORTED_REFUND_STATUSES.has(
            status as SupportedRefundStatus
        )
    ) {
        return status as SupportedRefundStatus;
    }

    throw new Error(
        `Unsupported Stripe Refund status: ${status ?? "null"}`
    );
}

function calculateRetryAfterSeconds(
    attemptCount: number
): number {
    const exponent = Math.max(
        0,
        Math.min(attemptCount - 1, 4)
    );

    return Math.min(
        60 * 60,
        5 * 60 * 2 ** exponent
    );
}

async function applyStripeRefundStatus(
    adminSupabase: AdminSupabase,
    refundId: string,
    stripeRefund: Stripe.Refund
) {
    const stripeStatus = normalizeRefundStatus(
        stripeRefund.status
    );

    const { data, error } = await adminSupabase.rpc(
        "apply_stripe_refund_status",
        {
            p_refund_id: refundId,
            p_stripe_refund_id: stripeRefund.id,
            p_stripe_status: stripeStatus,
            p_failure_reason:
                stripeRefund.failure_reason ?? null,
        }
    );

    if (error) {
        throw error;
    }

    return data?.[0] ?? null;
}

async function releaseRefundClaim(
    adminSupabase: AdminSupabase,
    claimedRefund: ClaimedRefund,
    errorMessage: string
) {
    const retryAfterSeconds =
        calculateRetryAfterSeconds(
            claimedRefund.attempt_count
        );

    const { data, error } = await adminSupabase.rpc(
        "release_refund_claim",
        {
            p_refund_id: claimedRefund.refund_id,
            p_error: errorMessage,
            p_retry_after_seconds: retryAfterSeconds,
        }
    );

    if (error) {
        throw error;
    }

    return data?.[0] ?? null;
}

async function recordReconciliationError(
    adminSupabase: AdminSupabase,
    refund: ReconciliationRefund,
    errorMessage: string
) {
    if (!refund.stripe_refund_id) {
        throw new Error(
            "Stripe Refund ID is missing during reconciliation"
        );
    }

    const now = new Date();
    const nextRetryAt = new Date(
        now.getTime() +
            RETRY_AFTER_SECONDS * 1000
    );

    const safeErrorMessage = errorMessage.slice(0, 2000);

    const { error: refundError } = await adminSupabase
        .from("refunds")
        .update({
            last_error: safeErrorMessage,
            next_retry_at: nextRetryAt.toISOString(),
        })
        .eq("id", refund.id)
        .eq(
            "stripe_refund_id",
            refund.stripe_refund_id
        )
        .eq("status", "processing");

    if (refundError) {
        throw refundError;
    }

    const { error: settlementError } =
        await adminSupabase
            .from("project_settlements")
            .update({
                last_checked_at: now.toISOString(),
                next_check_at:
                    nextRetryAt.toISOString(),
                last_error: safeErrorMessage,
            })
            .eq("project_id", refund.project_id)
            .eq("status", "refunding");

    if (settlementError) {
        throw settlementError;
    }
}

async function reconcileExistingRefunds(
    adminSupabase: AdminSupabase,
    limit: number
) {
    if (limit <= 0) {
        return [];
    }

    const now = new Date().toISOString();

    const { data, error } = await adminSupabase
        .from("refunds")
        .select(
            "id, project_id, stripe_refund_id"
        )
        .eq("status", "processing")
        .eq("manual_review_required", false)
        .not("stripe_refund_id", "is", null)
        .or(
            `next_retry_at.is.null,next_retry_at.lte.${now}`
        )
        .order("updated_at", {
            ascending: true,
        })
        .limit(limit);

    if (error) {
        throw error;
    }

    const results = [];

    for (const refund of data ?? []) {
        if (!refund.stripe_refund_id) {
            results.push({
                operation: "reconcile",
                refundId: refund.id,
                success: false,
                error:
                    "Stripe Refund ID is missing",
            });

            continue;
        }

        try {
            const stripeRefund =
                await stripe.refunds.retrieve(
                    refund.stripe_refund_id
                );

            const applyResult =
                await applyStripeRefundStatus(
                    adminSupabase,
                    refund.id,
                    stripeRefund
                );

            results.push({
                operation: "reconcile",
                refundId: refund.id,
                stripeRefundId: stripeRefund.id,
                stripeStatus: stripeRefund.status,
                success: true,
                applyResult,
            });
        } catch (reconciliationError) {
            const errorMessage = getErrorMessage(
                reconciliationError
            );

            let recordError: string | null = null;

            try {
                await recordReconciliationError(
                    adminSupabase,
                    refund,
                    errorMessage
                );
            } catch (databaseError) {
                recordError =
                    getErrorMessage(databaseError);
            }

            results.push({
                operation: "reconcile",
                refundId: refund.id,
                stripeRefundId:
                    refund.stripe_refund_id,
                success: false,
                error: errorMessage,
                recordError,
            });
        }
    }

    return results;
}

async function claimNextRefund(
    adminSupabase: AdminSupabase
): Promise<ClaimedRefund | null> {
    const { data, error } = await adminSupabase.rpc(
        "claim_next_refund",
        {}
    );

    if (error) {
        throw error;
    }

    return data?.[0] ?? null;
}

async function processClaimedRefund(
    adminSupabase: AdminSupabase,
    claimedRefund: ClaimedRefund
) {
    let stripeRefund: Stripe.Refund | null = null;

    try {
        stripeRefund = await stripe.refunds.create(
            {
                payment_intent:
                    claimedRefund.stripe_payment_intent_id,
                amount: claimedRefund.amount,
                metadata: {
                    dreamfund_refund_id:
                        claimedRefund.refund_id,
                    dreamfund_pledge_id:
                        claimedRefund.pledge_id,
                    dreamfund_project_id:
                        claimedRefund.project_id,
                },
            },
            {
                idempotencyKey:
                    claimedRefund.idempotency_key,
            }
        );

        const applyResult =
            await applyStripeRefundStatus(
                adminSupabase,
                claimedRefund.refund_id,
                stripeRefund
            );

        return {
            operation: "create",
            refundId: claimedRefund.refund_id,
            pledgeId: claimedRefund.pledge_id,
            projectId: claimedRefund.project_id,
            stripeRefundId: stripeRefund.id,
            stripeStatus: stripeRefund.status,
            attemptCount:
                claimedRefund.attempt_count,
            success: true,
            applyResult,
        };
    } catch (processingError) {
        const errorMessage = getErrorMessage(
            processingError
        );

        let releaseResult = null;
        let releaseError: string | null = null;

        try {
            releaseResult =
                await releaseRefundClaim(
                    adminSupabase,
                    claimedRefund,
                    errorMessage
                );
        } catch (databaseError) {
            releaseError =
                getErrorMessage(databaseError);
        }

        return {
            operation: "create",
            refundId: claimedRefund.refund_id,
            pledgeId: claimedRefund.pledge_id,
            projectId: claimedRefund.project_id,
            stripeRefundId:
                stripeRefund?.id ?? null,
            stripeStatus:
                stripeRefund?.status ?? null,
            attemptCount:
                claimedRefund.attempt_count,
            success: false,
            error: errorMessage,
            releaseResult,
            releaseError,
        };
    }
}

async function createNewRefunds(
    adminSupabase: AdminSupabase,
    limit: number
) {
    const results = [];

    for (
        let index = 0;
        index < limit;
        index += 1
    ) {
        const claimedRefund =
            await claimNextRefund(adminSupabase);

        if (!claimedRefund) {
            break;
        }

        const result =
            await processClaimedRefund(
                adminSupabase,
                claimedRefund
            );

        results.push(result);
    }

    return results;
}

export async function POST(request: Request) {
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

    const adminSupabase =
        createAdminSupabase();

    try {
        const reconciliationResults =
            await reconcileExistingRefunds(
                adminSupabase,
                MAX_REFUNDS_PER_RUN
            );

        const remainingCapacity = Math.max(
            0,
            MAX_REFUNDS_PER_RUN -
                reconciliationResults.length
        );

        const creationResults =
            await createNewRefunds(
                adminSupabase,
                remainingCapacity
            );

        const results = [
            ...reconciliationResults,
            ...creationResults,
        ];

        return NextResponse.json({
            success: true,
            processedRefundCount: results.length,
            reconciledRefundCount:
                reconciliationResults.length,
            createdRefundCount:
                creationResults.length,
            results,
        });
    } catch (error) {
        console.error(
            "DreamFund refund processing failed:",
            error
        );

        return NextResponse.json(
            {
                success: false,
                error:
                    "返金処理中にエラーが発生しました",
            },
            { status: 500 }
        );
    }
}