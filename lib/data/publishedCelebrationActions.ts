"use server";

import { createServerSupabase } from "@/lib/supabase/server-auth";

export type CelebrationActionResult =
  | { ok: true }
  | { ok: false; error: string };

type RpcResult = {
  error: { message?: string } | null;
};

export async function markPublishedCelebrationSeen(
  submissionId: string
): Promise<CelebrationActionResult> {
  const supabase = createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: "ログイン情報を確認できませんでした。",
    };
  }

  const rpc = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<RpcResult>;

  const { error } = await rpc("mark_published_submission_seen", {
    p_submission_id: submissionId,
  });

  if (error) {
    return {
      ok: false,
      error: "確認済みの保存に失敗しました。もう一度お試しください。",
    };
  }

  return { ok: true };
}