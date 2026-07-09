import { createServerSupabase } from "@/lib/supabase/server-auth";

/**
 * 管理者用：審査待ち（pending_review）の投稿申請を取得（サーバー）。
 *
 * - 全員分の行が返るのは、DB側に「管理者は閲覧可」RLSポリシーがあるため。
 * - 一般ユーザーがこの関数を呼んでも、RLSにより0件しか返らない。
 * - service_role は使わない。
 * - 既存の projects / returns には触れない。
 *
 * 投稿者名は public_profiles を別クエリで取得し、アプリ側で user_id と突き合わせる。
 */

export type AdminSubmission = {
  id: string;
  userId: string;
  submitterName: string;
  title: string;
  category: string;
  goalAmount: number;
  coverImageUrl: string | null;
  status: string;
  createdAt: string;
};

type Row = {
  id: string;
  user_id: string;
  title: string;
  category: string;
  goal_amount: number;
  cover_image_url: string | null;
  status: string;
  created_at: string;
};

type PublicProfileRow = {
  id: string;
  display_name: string | null;
};

/** 審査待ちの申請を新しい順に取得 */
export async function getPendingSubmissions(): Promise<AdminSubmission[]> {
  const supabase = createServerSupabase();

  const { data, error } = await supabase
    .from("project_submissions")
    .select(
      "id, user_id, title, category, goal_amount, cover_image_url, status, created_at"
    )
    .eq("status", "pending_review")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as Row[];

  if (rows.length === 0) {
    return [];
  }

  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));

  const { data: profiles } = await supabase
    .from("public_profiles")
    .select("id, display_name")
    .in("id", userIds);

  const nameById = new Map<string, string>(
    ((profiles ?? []) as PublicProfileRow[]).map((profile) => [
      profile.id,
      profile.display_name || "名称未設定",
    ])
  );

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    submitterName: nameById.get(row.user_id) ?? "名称未設定",
    title: row.title,
    category: row.category,
    goalAmount: row.goal_amount,
    coverImageUrl: row.cover_image_url,
    status: row.status,
    createdAt: row.created_at,
  }));
}

/**
 * 管理用の status ラベル。
 * 将来ステータスが増えても、ここに case を足せば対応できる。
 */
export function adminStatusLabel(status: string): {
  text: string;
  className: string;
} {
  switch (status) {
    case "pending_review":
      return { text: "審査中", className: "bg-amber-100 text-amber-700" };
    case "approved":
      return { text: "公開済み", className: "bg-emerald-100 text-emerald-700" };
    case "rejected":
      return { text: "見送り", className: "bg-rose-100 text-rose-700" };
    default:
      return { text: "状態不明", className: "bg-slate-100 text-slate-600" };
  }
}

/** ISO日時 → 「2026年7月5日 14:30」形式 */
export function formatJaDateTime(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${date.getFullYear()}年${
    date.getMonth() + 1
  }月${date.getDate()}日 ${hours}:${minutes}`;
}