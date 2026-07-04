"use client";

import { createBrowserSupabase } from "@/lib/supabase/browser";
import type { Database } from "@/types/database";

/**
 * お気に入り操作（クライアント）。RLSにより本人の行だけ操作できる。
 * - 重複登録は複合主キー (user_id, project_id) がDB側で防ぐ。
 */

/** 自分がこのプロジェクトをお気に入り登録済みか */
export async function isFavorited(projectId: string): Promise<boolean> {
  const supabase = createBrowserSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data, error } = await supabase
    .from("favorites")
    .select("project_id")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return false;

  return !!data;
}

/** お気に入り登録。既に登録済みでも主キー制約で安全（重複エラーは無視）。 */
export async function addFavorite(projectId: string): Promise<boolean> {
  const supabase = createBrowserSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const payload: Database["public"]["Tables"]["favorites"]["Insert"] = {
    user_id: user.id,
    project_id: projectId,
  };

  const { error } = await supabase.from("favorites").insert(payload);

  // 23505 = 一意制約違反（既に登録済み）→ 成功扱い
  if (error && (error as { code?: string }).code !== "23505") return false;

  return true;
}

/** お気に入り解除 */
export async function removeFavorite(projectId: string): Promise<boolean> {
  const supabase = createBrowserSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", user.id);

  return !error;
}