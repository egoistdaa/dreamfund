"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createServerSupabase } from "@/lib/supabase/server-auth";

export type PublishResult =
  | { ok: true; projectSlug: string }
  | { ok: false; error: string };

function makeProjectSlugFromSubmissionId(id: string) {
  return `p-${id.replaceAll("-", "").slice(0, 8)}`;
}

type RpcResult = {
  data: string | null;
  error: { message?: string } | null;
};

export async function publishSubmission(id: string): Promise<PublishResult> {
  await requireAdmin();

  const supabase = createServerSupabase();

  const rpc = supabase.rpc.bind(supabase) as unknown as (
  fn: string,
  args: Record<string, unknown>
) => Promise<RpcResult>;

  const { error } = await rpc("publish_submission", {
    p_submission_id: id,
  });

  if (error) {
    return {
      ok: false,
      error:
        error.message ||
        "公開に失敗しました。状態を確認してからもう一度お試しください。",
    };
  }

  const projectSlug = makeProjectSlugFromSubmissionId(id);

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectSlug}`);
  revalidatePath("/admin/submissions");
  revalidatePath(`/admin/submissions/${id}`);
  revalidatePath("/mypage/submissions");
  revalidatePath(`/mypage/submissions/${id}`);

  return { ok: true, projectSlug };
}