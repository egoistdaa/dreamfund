"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createServerSupabase } from "@/lib/supabase/server-auth";

export type ActionResult =
  | { ok: true; status: "approved" | "rejected" }
  | { ok: false; error: string };

async function updateStatus(
  id: string,
  next: "approved" | "rejected"
): Promise<ActionResult> {
  await requireAdmin();

  const supabase = createServerSupabase();

  const { data, error } = await supabase
    .from("project_submissions")
    .update({ status: next, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending_review")
    .select("id");

  if (error) {
    return {
      ok: false,
      error: "更新に失敗しました。時間をおいて再度お試しください。",
    };
  }

  if (!data || data.length === 0) {
    return {
      ok: false,
      error: "この申請は既に処理済みか、更新する権限がありません。",
    };
  }

  revalidatePath(`/admin/submissions/${id}`);
  revalidatePath("/admin/submissions");

  return { ok: true, status: next };
}

export async function approveSubmission(id: string): Promise<ActionResult> {
  return updateStatus(id, "approved");
}

export async function rejectSubmission(id: string): Promise<ActionResult> {
  return updateStatus(id, "rejected");
}