import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * サーバー用 Supabase クライアント（読み取り中心）。
 * Server Component / Route Handler から使う。anonキー + RLSで保護。
 *
 * なぜ環境変数チェックを入れるか:
 *   未設定のまま動かすと原因不明のエラーになる。早期に分かるようにする。
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Supabaseが設定済みかどうか（未設定ならダミーにフォールバックする判定に使う） */
export const isSupabaseConfigured =
  !!url && !!anonKey && !url.includes("YOUR-PROJECT");

export function createServerClient() {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase未設定です。.env.local に NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を設定してください。"
    );
  }
  return createClient<Database>(url!, anonKey!, {
    auth: { persistSession: false },
  });
}
