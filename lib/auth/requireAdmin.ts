import { notFound } from "next/navigation";
import { createServerSupabase, getAuthUser } from "@/lib/supabase/server-auth";

/**
 * 管理画面の保護（サーバー用）。
 *
 * 安全性の考え方:
 * - 判定の本丸は DB 側の RLS（is_admin() を使ったポリシー）。
 * - ここはその手前のアプリ側ガード。
 * - 管理者でない場合は 403 ではなく notFound() で 404 にする。
 * - 未ログインも同様に 404。
 * - service_role は使わない。
 */
export async function requireAdmin() {
  const user = await getAuthUser();

  if (!user) {
    notFound();
  }

  const supabase = createServerSupabase();

  const { data, error } = await supabase
    .from("profiles_private")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = (data as { role?: string } | null)?.role;

  if (error || role !== "admin") {
    notFound();
  }

  return user;
}