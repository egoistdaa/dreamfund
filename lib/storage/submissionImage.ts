"use client";

import { createBrowserSupabase } from "@/lib/supabase/browser";

/**
 * 投稿メイン画像（カバー画像）のアップロード（クライアント）。
 * - 種類は jpeg / png / webp のみ。サイズは 5MB 以下。
 * - 保存パスは users/{user.id}/submissions/{タイムスタンプ}.{拡張子}。
 * - service_role は使わない（anonキー＋ユーザーセッション＋RLS）。
 */

const BUCKET = "submissions";
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type ImageUploadResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/** クライアント側の事前検証（日本語エラー） */
export function validateSubmissionImage(file: File): string | null {
  if (!ALLOWED[file.type]) {
    return "画像は JPEG / PNG / WebP のみアップロードできます。";
  }

  if (file.size > MAX_BYTES) {
    return "画像サイズは5MB以下にしてください。";
  }

  return null;
}

export async function uploadSubmissionCover(
  file: File
): Promise<ImageUploadResult> {
  const validationError = validateSubmissionImage(file);
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
  const path = `users/${user.id}/submissions/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      upsert: false,
      contentType: file.type,
      cacheControl: "3600",
    });

  if (uploadError) {
    return {
      ok: false,
      error:
        "画像のアップロードに失敗しました。時間をおいて再度お試しください。",
    };
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return { ok: true, url: data.publicUrl };
}