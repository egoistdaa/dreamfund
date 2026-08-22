"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createAdminSupabase } from "@/lib/supabase/admin";

export type RefundRetryActionResult =
  | {
      ok: true;
      status: string;
    }
  | {
      ok: false;
      error: string;
    };

export async function requestRefundRetry(
  refundId: string,
  reason: string
): Promise<RefundRetryActionResult> {
  const admin = await requireAdmin();

  const normalizedRefundId = refundId.trim();
  const normalizedReason = reason.trim();

  if (!normalizedRefundId) {
    return {
      ok: false,
      error: "返金IDが指定されていません。",
    };
  }

  if (normalizedReason.length < 5) {
    return {
      ok: false,
      error: "再試行理由を5文字以上で入力してください。",
    };
  }

  if (normalizedReason.length > 500) {
    return {
      ok: false,
      error: "再試行理由は500文字以内で入力してください。",
    };
  }

  const adminSupabase = createAdminSupabase();

  const { data, error } = await adminSupabase.rpc(
    "admin_request_refund_retry",
    {
      p_refund_id: normalizedRefundId,
      p_actor_user_id: admin.id,
      p_reason: normalizedReason,
    }
  );

  if (error) {
    return {
      ok: false,
      error:
        "返金の再試行依頼に失敗しました。返金状態を確認してから再度お試しください。",
    };
  }

  const result = data?.[0];

  if (!result?.requested) {
    return {
      ok: false,
      error:
        "返金の再試行を開始できませんでした。返金状態を確認してください。",
    };
  }

  revalidatePath("/admin/refunds");
  revalidatePath("/admin");

  return {
    ok: true,
    status: "requested",
  };
}
