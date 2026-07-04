import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/supabase/server-auth";

/**
 * ページ保護の共通関数（サーバー用）。
 * ログイン必須ページ冒頭で `const user = await requireAuth("/mypage")` と呼ぶ。
 * 未ログインなら /login?redirect=... へ。redirectにはクエリ文字列も含められる。
 */
export async function requireAuth(redirectTo: string) {
  const user = await getAuthUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(redirectTo)}`);
  }

  return user;
}