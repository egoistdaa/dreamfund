import { createServerSupabase } from "@/lib/supabase/server-auth";
import type { Json } from "@/types/database";

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  projectTitle: string | null;
  messagePreview: string | null;
  href: string;
  createdAt: string;
  isRead: boolean;
};

type NotificationRow = {
  id: string;
  type: string;
  payload: Json | null;
  read_at: string | null;
  created_at: string;
};

function isJsonObject(
  value: Json | null
): value is { [key: string]: Json | undefined } {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function getPayloadString(
  payload: Json | null,
  key: string
): string | null {
  if (!isJsonObject(payload)) {
    return null;
  }

  const value = payload[key];

  return typeof value === "string" ? value : null;
}

function getNotificationTitle(type: string): string {
  if (type === "support_message_received") {
    return "新しい応援メッセージが届きました";
  }

  if (type === "support_message_replied") {
    return "プロジェクト投稿者から返信が届きました";
  }

  return "新しい通知があります";
}

export async function getNotifications(
  userId: string
): Promise<NotificationItem[]> {
  const supabase = createServerSupabase();

  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, payload, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as NotificationRow[];

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    title: getNotificationTitle(row.type),
    projectTitle: getPayloadString(
      row.payload,
      "project_title"
    ),
    messagePreview: getPayloadString(
      row.payload,
      "message_preview"
    ),
    href:
      getPayloadString(row.payload, "href") ??
      "/mypage",
    createdAt: row.created_at,
    isRead: row.read_at !== null,
  }));
}

export async function getUnreadNotificationCount(
  userId: string
): Promise<number> {
  const supabase = createServerSupabase();

  const { count, error } = await supabase
    .from("notifications")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) {
    throw error;
  }

  return count ?? 0;
}