"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * ブラウザ用 Supabase クライアント（Cookieベース）。
 * @supabase/ssr を使い、セッションをCookieに保存する。
 * これによりサーバー側(middleware/Server Component)も同じログイン状態を読める。
 * anonキーのみ使用。service_roleは絶対に使わない。
 *
 * 戻り値の型を SupabaseClient<Database> と明示することで、
 * .from("favorites").insert(...) の型が never にならず正しく効く。
 */
export function createBrowserSupabase(): SupabaseClient<Database> {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}