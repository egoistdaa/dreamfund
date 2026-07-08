import { createServerSupabase } from "@/lib/supabase/server-auth";

/**
 * 自分の投稿申請一覧を取得（サーバー）。
 * RLS "申請は本人が閲覧" により select は本人の行だけに絞られる。
 * 念のため user_id でも明示的に絞る（二重の安全）。service_role は使わない。
 * 既存の projects/returns には触れない。
 */

export type MySubmission = {
  id: string;
  title: string;
  category: string;
  goalAmount: number;
  coverImageUrl: string | null;
  status: string;
  createdAt: string;
};

type Row = {
  id: string;
  title: string;
  category: string;
  goal_amount: number;
  cover_image_url: string | null;
  status: string;
  created_at: string;
};

export async function getMySubmissions(
  userId: string
): Promise<MySubmission[]> {
  const supabase = createServerSupabase();

  const { data, error } = await supabase
    .from("project_submissions")
    .select(
      "id, title, category, goal_amount, cover_image_url, status, created_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as Row[]).map((r) => ({
    id: r.id,
    title: r.title,
    category: r.category,
    goalAmount: r.goal_amount,
    coverImageUrl: r.cover_image_url,
    status: r.status,
    createdAt: r.created_at,
  }));
}

/** status を日本語ラベル＋色に変換。未知の値でも落ちないようフォールバックを持つ。 */
export function statusLabel(status: string): {
  text: string;
  className: string;
} {
  switch (status) {
    case "pending_review":
      return { text: "審査中", className: "bg-warning/15 text-warning" };
    case "approved":
      return { text: "公開済み", className: "bg-success/15 text-success" };
    case "rejected":
      return { text: "見送り", className: "bg-error/15 text-error" };
    default:
      return { text: "状態不明", className: "bg-sub text-ink-sub" };
  }
}

/** ISO日時 → 「2026年7月5日」形式の日本語表記 */
export function formatJaDate(iso: string): string {
  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) {
    return "";
  }

  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}