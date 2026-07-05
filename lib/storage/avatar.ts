"use client";

import { createBrowserSupabase } from "@/lib/supabase/browser";

/**
 * アイコン画像アップロード（クライアント）。
 * - 種類は jpeg / png / webp のみ。サイズは 2MB 以下。
 * - 保存パスは users/{user.id}/avatar.{拡張子}。
 * - 公開バケット avatars の公開URLを返す。キャッシュ対策で ?v=timestamp を付ける。
 * - service_role は使わない。
 */

const BUCKET = "avatars";
const MAX_BYTES = 2 * 1024 * 1024; // 2MB

const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type AvatarUploadResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export function validateAvatarFile(file: File): string | null {
  if (!ALLOWED[file.type]) {
    return "画像は JPEG / PNG / WebP のみアップロードできます。";
  }

  if (file.size > MAX_BYTES) {
    return "画像サイズは2MB以下にしてください。";
  }

  return null;
}

export async function uploadAvatar(file: File): Promise<AvatarUploadResult> {
  const validationError = validateAvatarFile(file);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const supabase = createBrowserSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "ログインが必要です。" };
  }

  const ext = ALLOWED[file.type];
  const path = `users/${user.id}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "3600",
    });

  if (uploadError) {
    return {
      ok: false,
      error: "画像のアップロードに失敗しました。時間をおいて再度お試しください。",
    };
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const url = `${pub.publicUrl}?v=${Date.now()}`;

  return { ok: true, url };
}