import Stripe from "stripe";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature) {
    return NextResponse.json(
      { error: "Stripe署名がありません" },
      { status: 400 }
    );
  }

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET が設定されていません");

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
    console.error("Stripe Webhook signature error:", error);

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

        const pledgeId = paymentIntent.metadata.pledge_id;

        if (!pledgeId) {
          console.warn(
            "pledge_idがないPaymentIntentを受信しました:",
            paymentIntent.id
          );
          break;
        }

        const { error } = await adminSupabase
          .from("pledges")
          .update({
            status: "paid",
            updated_at: updatedAt,
          })
          .eq("id", pledgeId)
          .eq(
            "stripe_payment_intent_id",
            paymentIntent.id
          )
          .in("status", ["pending", "failed"]);

        if (error) {
          throw error;
        }

        break;
      }

      case "payment_intent.payment_failed":
      case "payment_intent.canceled": {
        const paymentIntent =
          event.data.object as Stripe.PaymentIntent;

        const pledgeId = paymentIntent.metadata.pledge_id;

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

      default:
        break;
    }

    return NextResponse.json({
      received: true,
    });
  } catch (error) {
    console.error("Stripe Webhook processing error:", error);

    return NextResponse.json(
      { error: "Webhook処理に失敗しました" },
      { status: 500 }
    );
  }
}