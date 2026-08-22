import Stripe from "stripe";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_REFUNDS_PER_RUN = 20;
const RETRY_AFTER_SECONDS = 15 * 60;
const ADMIN_RETRY_LOOKUP_FAILED_ERROR =
    "管理者返金再試行を停止しました: Stripe Refund一覧を確認できませんでした";
const ADMIN_RETRY_MULTIPLE_MATCHES_ERROR =
    "管理者返金再試行を停止しました: 一致するStripe Refundが複数存在します";
const ADMIN_RETRY_OTHER_REFUND_ERROR =
    "管理者返金再試行を停止しました: PaymentIntentに一致しないStripe Refundが存在します";
const ADMIN_RETRY_DB_UNAVAILABLE_ERROR =
    "管理者返金再試行を停止しました: 作成直前のDB状態を確認できませんでした";
const ADMIN_RETRY_CLAIM_CHANGED_ERROR =
    "管理者返金再試行を停止しました: claim後に返金状態が変更されました";
const ADMIN_RETRY_PREREQUISITE_ERROR =
    "管理者返金再試行を停止しました: 返金前提条件が一致しません";
const ADMIN_RETRY_PROCESSING_ERROR =
    "管理者返金再試行中の安全確認またはStripe処理に失敗しました";
const ADMIN_RETRY_RELEASE_ERROR =
    "管理者返金再試行をmanual reviewへ戻せませんでした";

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
    admin_retry_requested_at: string | null;
};

type ReconciliationRefund = {
    id: string;
    project_id: string;
    stripe_refund_id: string | null;
};

type AdminRetryRefundState = {
    id: string;
    pledge_id: string;
    project_id: string;
    amount: number;
    status: string;
    manual_review_required: boolean;
    admin_retry_requested_at: string | null;
    attempt_count: number;
    stripe_refund_id: string | null;
    stripe_status: string | null;
    succeeded_at: string | null;
};

type AdminRetryDatabaseCheck =
    | "valid"
    | "claim_changed"
    | "prerequisite_mismatch"
    | "unavailable";

class AdminRetrySafetyError extends Error {}

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

function getStripeRefundPaymentIntentId(
    stripeRefund: Stripe.Refund
): string | null {
    const paymentIntent =
        stripeRefund.payment_intent;

    if (typeof paymentIntent === "string") {
        return paymentIntent;
    }

    if (
        paymentIntent &&
        typeof paymentIntent === "object"
    ) {
        return paymentIntent.id;
    }

    return null;
}

function isExactAdminRetryStripeRefund(
    stripeRefund: Stripe.Refund,
    claimedRefund: ClaimedRefund
): boolean {
    const metadata = stripeRefund.metadata;

    return (
        metadata?.dreamfund_refund_id ===
            claimedRefund.refund_id &&
        metadata?.dreamfund_pledge_id ===
            claimedRefund.pledge_id &&
        metadata?.dreamfund_project_id ===
            claimedRefund.project_id &&
        stripeRefund.amount === claimedRefund.amount &&
        getStripeRefundPaymentIntentId(
            stripeRefund
        ) ===
            claimedRefund.stripe_payment_intent_id
    );
}

async function inspectAdminRetryStripeRefunds(
    claimedRefund: ClaimedRefund
) {
    let totalCount = 0;
    const exactMatches: Stripe.Refund[] = [];

    await stripe.refunds
        .list({
            payment_intent:
                claimedRefund.stripe_payment_intent_id,
            limit: 100,
        })
        .autoPagingEach((stripeRefund) => {
            totalCount += 1;

            if (
                isExactAdminRetryStripeRefund(
                    stripeRefund,
                    claimedRefund
                )
            ) {
                exactMatches.push(stripeRefund);
            }
        });

    return {
        totalCount,
        exactMatches,
    };
}

async function readAdminRetryRefundState(
    adminSupabase: AdminSupabase,
    refundId: string
) {
    return adminSupabase
        .from("refunds")
        .select(
            "id, pledge_id, project_id, amount, status, manual_review_required, admin_retry_requested_at, attempt_count, stripe_refund_id, stripe_status, succeeded_at"
        )
        .eq("id", refundId)
        .maybeSingle();
}

function isCurrentAdminRetryClaim(
    refund: AdminRetryRefundState | null,
    claimedRefund: ClaimedRefund
): refund is AdminRetryRefundState {
    return (
        refund?.id === claimedRefund.refund_id &&
        refund.pledge_id === claimedRefund.pledge_id &&
        refund.project_id ===
            claimedRefund.project_id &&
        refund.amount === claimedRefund.amount &&
        refund.status === "processing" &&
        refund.manual_review_required === false &&
        refund.admin_retry_requested_at ===
            claimedRefund.admin_retry_requested_at &&
        refund.attempt_count ===
            claimedRefund.attempt_count &&
        refund.stripe_refund_id === null &&
        refund.stripe_status === null &&
        refund.succeeded_at === null
    );
}

async function revalidateAdminRetryBeforeCreate(
    adminSupabase: AdminSupabase,
    claimedRefund: ClaimedRefund
): Promise<AdminRetryDatabaseCheck> {
    const [
        refundResult,
        pledgeResult,
        settlementResult,
    ] = await Promise.all([
        readAdminRetryRefundState(
            adminSupabase,
            claimedRefund.refund_id
        ),
        adminSupabase
            .from("pledges")
            .select(
                "id, project_id, status, stripe_payment_intent_id, amount"
            )
            .eq("id", claimedRefund.pledge_id)
            .maybeSingle(),
        adminSupabase
            .from("project_settlements")
            .select(
                "project_id, status, final_status, settlement_locked_at, refund_eligible_at"
            )
            .eq(
                "project_id",
                claimedRefund.project_id
            )
            .maybeSingle(),
    ]);

    if (
        refundResult.error ||
        pledgeResult.error ||
        settlementResult.error
    ) {
        return "unavailable";
    }

    if (
        !isCurrentAdminRetryClaim(
            refundResult.data,
            claimedRefund
        )
    ) {
        return "claim_changed";
    }

    const pledge = pledgeResult.data;
    const settlement = settlementResult.data;

    if (
        !pledge ||
        pledge.id !== claimedRefund.pledge_id ||
        pledge.project_id !==
            claimedRefund.project_id ||
        pledge.status !== "paid" ||
        pledge.stripe_payment_intent_id !==
            claimedRefund.stripe_payment_intent_id ||
        pledge.amount !== claimedRefund.amount ||
        pledge.amount !== refundResult.data.amount ||
        !settlement ||
        settlement.project_id !==
            claimedRefund.project_id ||
        settlement.status !== "manual_review" ||
        settlement.final_status !== "failed" ||
        settlement.settlement_locked_at === null ||
        settlement.refund_eligible_at === null
    ) {
        return "prerequisite_mismatch";
    }

    // Read the refund once more after the related records so a
    // webhook or a newer stale claim cannot silently invalidate
    // this worker's claim before the Stripe create call.
    const finalRefundResult =
        await readAdminRetryRefundState(
            adminSupabase,
            claimedRefund.refund_id
        );

    if (finalRefundResult.error) {
        return "unavailable";
    }

    if (
        !isCurrentAdminRetryClaim(
            finalRefundResult.data,
            claimedRefund
        )
    ) {
        return "claim_changed";
    }

    return "valid";
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

async function releaseAdminRefundRetryClaim(
    adminSupabase: AdminSupabase,
    claimedRefund: ClaimedRefund,
    errorMessage: string
) {
    const expectedAdminRetryRequestedAt =
        claimedRefund.admin_retry_requested_at;

    if (expectedAdminRetryRequestedAt === null) {
        throw new Error(
            "Admin retry marker is required for guarded release"
        );
    }

    const { data, error } = await adminSupabase.rpc(
        "release_admin_refund_retry_claim",
        {
            p_refund_id: claimedRefund.refund_id,
            p_expected_admin_retry_requested_at:
                expectedAdminRetryRequestedAt,
            p_expected_attempt_count:
                claimedRefund.attempt_count,
            p_error: errorMessage,
        }
    );

    if (error) {
        throw error;
    }

    const releaseResult = data?.[0] ?? null;

    if (!releaseResult) {
        throw new Error(
            "Guarded admin retry release returned no result"
        );
    }

    return releaseResult;
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
    const isAdminRetry =
        claimedRefund.admin_retry_requested_at !== null;

    try {
        if (isAdminRetry) {
            let inspection;

            try {
                inspection =
                    await inspectAdminRetryStripeRefunds(
                        claimedRefund
                    );
            } catch {
                throw new AdminRetrySafetyError(
                    ADMIN_RETRY_LOOKUP_FAILED_ERROR
                );
            }

            if (inspection.exactMatches.length > 1) {
                throw new AdminRetrySafetyError(
                    ADMIN_RETRY_MULTIPLE_MATCHES_ERROR
                );
            }

            if (
                inspection.totalCount === 1 &&
                inspection.exactMatches.length === 1
            ) {
                stripeRefund =
                    inspection.exactMatches[0];

                const applyResult =
                    await applyStripeRefundStatus(
                        adminSupabase,
                        claimedRefund.refund_id,
                        stripeRefund
                    );

                return {
                    operation:
                        "admin_retry_reconcile",
                    refundId:
                        claimedRefund.refund_id,
                    pledgeId:
                        claimedRefund.pledge_id,
                    projectId:
                        claimedRefund.project_id,
                    stripeRefundId:
                        stripeRefund.id,
                    stripeStatus:
                        stripeRefund.status,
                    attemptCount:
                        claimedRefund.attempt_count,
                    success: true,
                    applyResult,
                };
            }

            if (inspection.totalCount > 0) {
                throw new AdminRetrySafetyError(
                    ADMIN_RETRY_OTHER_REFUND_ERROR
                );
            }

            const databaseCheck =
                await revalidateAdminRetryBeforeCreate(
                    adminSupabase,
                    claimedRefund
                );

            if (databaseCheck !== "valid") {
                const errorMessage =
                    databaseCheck === "unavailable"
                        ? ADMIN_RETRY_DB_UNAVAILABLE_ERROR
                        : databaseCheck ===
                            "claim_changed"
                          ? ADMIN_RETRY_CLAIM_CHANGED_ERROR
                          : ADMIN_RETRY_PREREQUISITE_ERROR;

                return {
                    operation:
                        "admin_retry_preflight",
                    refundId:
                        claimedRefund.refund_id,
                    pledgeId:
                        claimedRefund.pledge_id,
                    projectId:
                        claimedRefund.project_id,
                    stripeRefundId: null,
                    stripeStatus: null,
                    attemptCount:
                        claimedRefund.attempt_count,
                    success: false,
                    error: errorMessage,
                    releaseResult: null,
                    releaseError: null,
                    releaseSkipped: true,
                };
            }
        }

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
        const errorMessage = isAdminRetry
            ? processingError instanceof
              AdminRetrySafetyError
                ? processingError.message
                : ADMIN_RETRY_PROCESSING_ERROR
            : getErrorMessage(processingError);

        let releaseResult = null;
        let releaseError: string | null = null;
        let releaseSkipped = false;

        if (isAdminRetry) {
            try {
                releaseResult =
                    await releaseAdminRefundRetryClaim(
                        adminSupabase,
                        claimedRefund,
                        errorMessage
                    );
                releaseSkipped =
                    releaseResult.released === false;
            } catch {
                releaseError =
                    ADMIN_RETRY_RELEASE_ERROR;
            }
        } else {
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
            ...(isAdminRetry ? { releaseSkipped } : {}),
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
