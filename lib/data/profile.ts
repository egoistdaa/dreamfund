"use client";

import { createBrowserSupabase } from "@/lib/supabase/browser";
import type { Database } from "@/types/database";

/**
 * プロフィール更新（クライアント）。
 * public_profiles の RLS により、自分の行だけ更新できる。
 * service_role は使わない。
 */
export type ProfileUpdateInput = {
  displayName: string;
  bio: string | null;
  avatarUrl?: string | null;
};

export type ProfileUpdateResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updateProfile(
  input: ProfileUpdateInput
): Promise<ProfileUpdateResult> {
  const name = input.displayName.trim();

  if (name.length === 0) {
    return { ok: false, error: "表示名を入力してください。" };
  }

  if (name.length > 30) {
    return { ok: false, error: "表示名は30文字以内で入力してください。" };
  }

  if (input.bio && input.bio.length > 200) {
    return { ok: false, error: "自己紹介は200文字以内で入力してください。" };
  }

  const supabase = createBrowserSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "ログインが必要です。" };
  }

  const patch: Database["public"]["Tables"]["public_profiles"]["Update"] = {
    display_name: name,
    bio: input.bio && input.bio.trim().length > 0 ? input.bio.trim() : null,
  };

  if (input.avatarUrl !== undefined) {
    patch.avatar_url = input.avatarUrl;
  }

  const { error } = await supabase
    .from("public_profiles")
    .update(patch)
    .eq("id", user.id);

  if (error) {
    return {
      ok: false,
      error: "保存に失敗しました。時間をおいて再度お試しください。",
    };
  }

  return { ok: true };
}