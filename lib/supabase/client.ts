"use client";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * ブラウザ用 Supabase クライアント。
 * 将来の会員機能（ログイン状態の保持・お気に入り操作など）で使う。
 * 今は土台として用意のみ。
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabaseBrowser = createClient<Database>(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});
