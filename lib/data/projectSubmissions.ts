"use client";

import { createBrowserSupabase } from "@/lib/supabase/browser";
import type { Database, SubmissionReturn } from "@/types/database";

/**
 * 投稿申請の保存（クライアント）。
 * 既存の公開 projects テーブルには触れず、申請用の project_submissions に保存。
 * RLS により user_id = auth.uid() の行だけ作成できる。service_role は使わない。
 */

export type SubmissionInput = {
  title: string;
  category: string;
  goalAmount: number;
  summary: string;
  story: string;
  returns: SubmissionReturn[];
  coverImageUrl?: string | null;
};

export type SubmissionResult =
  | { ok: true }
  | { ok: false; error: string };

// 保存前の最終検証（日本語エラー）。フォーム側でも検証するが二重で守る。
function validate(input: SubmissionInput): string | null {
  const title = input.title.trim();
  if (title.length === 0) return "夢のタイトルを入力してください。";
  if (title.length > 60) return "タイトルは60文字以内で入力してください。";

  if (!input.category) return "カテゴリを選択してください。";

  if (!Number.isFinite(input.goalAmount) || input.goalAmount < 1000) {
    return "目標金額は1,000円以上で入力してください。";
  }

  const summary = input.summary.trim();
  if (summary.length === 0) return "概要文を入力してください。";
  if (summary.length > 120) return "概要文は120文字以内で入力してください。";

  const story = input.story.trim();
  if (story.length < 100) return "本文は100文字以上で入力してください。";
  if (story.length > 2000) return "本文は2,000文字以内で入力してください。";

  if (input.returns.length < 1) return "リターンを1つ以上入力してください。";
  if (input.returns.length > 5) return "リターンは最大5つまでです。";

  for (let i = 0; i < input.returns.length; i++) {
    const r = input.returns[i];

    if (!r.title.trim()) {
      return `リターン${i + 1}のリターン名を入力してください。`;
    }

    if (!Number.isFinite(r.price) || r.price < 500) {
      return `リターン${i + 1}の金額は500円以上で入力してください。`;
    }
  }

  return null;
}

export async function submitProject(
  input: SubmissionInput
): Promise<SubmissionResult> {
  const validationError = validate(input);
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

  const cleanedReturns: SubmissionReturn[] = input.returns.map((r) => ({
    title: r.title.trim(),
    price: Math.round(r.price),
    description:
      r.description && r.description.trim().length > 0
        ? r.description.trim()
        : null,
  }));

  const payload: Database["public"]["Tables"]["project_submissions"]["Insert"] =
    {
      user_id: user.id,
      title: input.title.trim(),
      category: input.category,
      goal_amount: Math.round(input.goalAmount),
      summary: input.summary.trim(),
      story: input.story.trim(),
      returns: cleanedReturns,
      cover_image_url: input.coverImageUrl ?? null,
      status: "pending_review",
    };

  const { error } = await supabase.from("project_submissions").insert(payload);

  if (error) {
    return {
      ok: false,
      error: "保存に失敗しました。時間をおいて再度お試しください。",
    };
  }

  return { ok: true };
}