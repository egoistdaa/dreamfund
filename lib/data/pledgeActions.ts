"use server";

import { createServerSupabase } from "@/lib/supabase/server-auth";

type CreatePendingPledgeResult =
  | {
      ok: true;
      pledgeId: string;
      amount: number;
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

  return {
    ok: true,
    pledgeId: pledge.pledge_id,
    amount: Number(pledge.amount),
  };
}