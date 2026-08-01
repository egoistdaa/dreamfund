import Stripe from "stripe";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AdminSupabase = ReturnType<
  typeof createAdminSupabase
>;

type SupportedRefundStatus =
  | "pending"
  | "requires_action"
  | "succeeded"
  | "failed"
  | "canceled";

const SUPPORTED_REFUND_STATUSES =
  new Set<SupportedRefundStatus>([
    "pending",
    "requires_action",
    "succeeded",
    "failed",
    "canceled",
  ]);

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
    `Unsupported Stripe Refund status: ${
      status ?? "null"
    }`
  );
}

async function findDreamFundRefundId(
  adminSupabase: AdminSupabase,
  stripeRefund: Stripe.Refund
): Promise<string | null> {
  const metadataRefundId =
    stripeRefund.metadata?.dreamfund_refund_id;

  if (metadataRefundId) {
    return metadataRefundId;
  }

  const { data, error } = await adminSupabase
    .from("refunds")
    .select("id")
    .eq("stripe_refund_id", stripeRefund.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.id ?? null;
}

async function applyRefundWebhook(
  adminSupabase: AdminSupabase,
  stripeRefund: Stripe.Refund
) {
  const refundId = await findDreamFundRefundId(
    adminSupabase,
    stripeRefund
  );

  if (!refundId) {
    console.warn(
      "DreamFund refund record was not found:",
      stripeRefund.id
    );

    return;
  }

  const stripeStatus = normalizeRefundStatus(
    stripeRefund.status
  );

  const { error } = await adminSupabase.rpc(
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
}

export async function POST(request: Request) {
  const signature = request.headers.get(
    "stripe-signature"
  );
  const webhookSecret =
    process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature) {
    return NextResponse.json(
      { error: "Stripe署名がありません" },
      { status: 400 }
    );
  }

  if (!webhookSecret) {
    console.error(
      "STRIPE_WEBHOOK_SECRETが設定されていません"
    );

    return NextResponse.json(
      { error: "Webhook設定がありません" },
      { status: 500 }
    );
  }

  const rawBody = await request.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret
    );
  } catch (error) {
    console.error(
      "Stripe Webhook signature error:",
      error
    );

    return NextResponse.json(
      { error: "Webhook署名の確認に失敗しました" },
      { status: 400 }
    );
  }

  const adminSupabase = createAdminSupabase();
  const updatedAt = new Date().toISOString();

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent =
          event.data.object as Stripe.PaymentIntent;

        const pledgeId =
          paymentIntent.metadata.pledge_id;

        if (!pledgeId) {
          console.warn(
            "pledge_idがないPaymentIntentを受信しました:",
            paymentIntent.id
          );

          break;
        }

        const { error } = await adminSupabase.rpc(
          "apply_payment_intent_succeeded",
          {
            p_pledge_id: pledgeId,
            p_stripe_payment_intent_id:
              paymentIntent.id,
          }
        );

        if (error) {
          throw error;
        }

        break;
      }

      case "payment_intent.payment_failed":
      case "payment_intent.canceled": {
        const paymentIntent =
          event.data.object as Stripe.PaymentIntent;

        const pledgeId =
          paymentIntent.metadata.pledge_id;

        if (!pledgeId) {
          break;
        }

        const { error } = await adminSupabase
          .from("pledges")
          .update({
            status: "failed",
            updated_at: updatedAt,
          })
          .eq("id", pledgeId)
          .eq(
            "stripe_payment_intent_id",
            paymentIntent.id
          )
          .eq("status", "pending");

        if (error) {
          throw error;
        }

        break;
      }

      case "refund.created":
      case "refund.updated":
      case "refund.failed": {
        const stripeRefund =
          event.data.object as Stripe.Refund;

        await applyRefundWebhook(
          adminSupabase,
          stripeRefund
        );

        break;
      }

      default:
        break;
    }

    return NextResponse.json({
      received: true,
    });
  } catch (error) {
    console.error(
      "Stripe Webhook processing error:",
      error
    );

    return NextResponse.json(
      { error: "Webhook処理に失敗しました" },
      { status: 500 }
    );
  }
}