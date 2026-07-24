"use server";

import { createServerSupabase } from "@/lib/supabase/server-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/server";

type CreatePendingPledgeResult =
  | {
      ok: true;
      pledgeId: string;
      amount: number;
      clientSecret: string;
    }
  | {
      ok: false;
      error: string;
    };

type RpcResult = {
  data:
    | Array<{
        pledge_id: string;
        amount: number | string;
      }>
    | null;
  error: {
    message?: string;
  } | null;
};

export async function createPendingPledge(
  projectSlug: string,
  returnId: string
): Promise<CreatePendingPledgeResult> {
  const supabase = createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: "ログインが必要です。",
    };
  }

  const rpc = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<RpcResult>;

  const { data, error } = await rpc("create_pending_pledge", {
    p_project_slug: projectSlug,
    p_return_id: returnId,
  });

  if (error) {
    return {
      ok: false,
      error: error.message ?? "支援データを作成できませんでした。",
    };
  }

  const pledge = data?.[0];

  if (!pledge) {
    return {
      ok: false,
      error: "支援データを作成できませんでした。",
    };
  }

  const pledgeId = pledge.pledge_id;
  const amount = Number(pledge.amount);
  const adminSupabase = createAdminSupabase();

  let paymentIntentId: string | null = null;

  try {
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount,
        currency: "jpy",
        payment_method_types: ["card"],
        description: `DreamFund支援：${projectSlug}`,
        metadata: {
          pledge_id: pledgeId,
          project_slug: projectSlug,
          backer_id: user.id,
        },
      },
      {
        idempotencyKey: `dreamfund-pledge-${pledgeId}`,
      }
    );

    paymentIntentId = paymentIntent.id;

    if (!paymentIntent.client_secret) {
      throw new Error("Stripeの決済情報を取得できませんでした");
    }

    const { error: updateError } = await adminSupabase
      .from("pledges")
      .update({
        stripe_payment_intent_id: paymentIntent.id,
      })
      .eq("id", pledgeId)
      .eq("backer_id", user.id)
      .eq("status", "pending");

    if (updateError) {
      throw updateError;
    }

    return {
      ok: true,
      pledgeId,
      amount,
      clientSecret: paymentIntent.client_secret,
    };
  } catch (stripeError) {
    console.error("Stripe PaymentIntent creation failed:", stripeError);

    if (paymentIntentId) {
      await stripe.paymentIntents.cancel(paymentIntentId).catch(() => undefined);
    }

    await adminSupabase
      .from("pledges")
      .update({
        status: "failed",
      })
      .eq("id", pledgeId)
      .eq("status", "pending");

    return {
      ok: false,
      error:
        "Stripeの決済準備に失敗しました。時間を置いてもう一度お試しください。",
    };
  }
}