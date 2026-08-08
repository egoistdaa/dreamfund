"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createAdminSupabase } from "@/lib/supabase/admin";

export type SettlementRecheckActionResult =
  | {
      ok: true;
      status: string;
    }
  | {
      ok: false;
      error: string;
    };

export async function requestSettlementRecheck(
  settlementId: string,
  reason: string
): Promise<SettlementRecheckActionResult> {
  const admin = await requireAdmin();

  const normalizedSettlementId =
    settlementId.trim();

  const normalizedReason = reason.trim();

  if (!normalizedSettlementId) {
    return {
      ok: false,
      error: "精算IDが指定されていません。",
    };
  }

  if (normalizedReason.length < 5) {
    return {
      ok: false,
      error: "再確認理由を5文字以上で入力してください。",
    };
  }

  if (normalizedReason.length > 500) {
    return {
      ok: false,
      error: "再確認理由は500文字以内で入力してください。",
    };
  }

  const adminSupabase = createAdminSupabase();

  const { data, error } = await adminSupabase.rpc(
    "admin_request_settlement_recheck",
    {
      p_settlement_id: normalizedSettlementId,
      p_actor_user_id: admin.id,
      p_reason: normalizedReason,
    }
  );

  if (error) {
    console.error(
      "Settlement recheck request failed:",
      error
    );

    return {
      ok: false,
      error:
        "再確認の依頼に失敗しました。精算状態を確認してから再度お試しください。",
    };
  }

  const result = data?.[0];

  if (!result?.requested) {
    return {
      ok: false,
      error:
        "再確認を開始できませんでした。精算状態を確認してください。",
    };
  }

  revalidatePath(
    `/admin/settlements/${normalizedSettlementId}`
  );
  revalidatePath("/admin/settlements");
  revalidatePath("/admin");

  return {
    ok: true,
    status: result.settlement_status,
  };
}