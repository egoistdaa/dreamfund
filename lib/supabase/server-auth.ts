import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

/**
 * サーバー用 Supabase クライアント（Cookieベース）。
 * Server Component / Route Handler から使い、ログイン状態をCookieで読む。
 * anonキーのみ使用（service_roleは使わない）。
 */
export function createServerSupabase() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component から呼ばれた場合は set 不可（middlewareが更新を担う）。
          }
        },
      },
    }
  );
}

/**
 * 本人確認つきユーザー取得。
 * getSession()ではなくgetUser()でAuthサーバーに確認する。
 */
export async function getAuthUser() {
  const supabase = createServerSupabase();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) return null;

  return data.user;
}