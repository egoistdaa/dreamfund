import "server-only";

import { createAdminSupabase } from "@/lib/supabase/admin";
import type { Database, Json } from "@/types/database";

type AuditLogRow =
  Database["public"]["Tables"]["admin_audit_logs"]["Row"];

type AuditDetails = {
  [key: string]: Json | undefined;
};

export type AdminAuditLog = {
  id: string;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string | null;
  details: Json;
  createdAt: string;
};

export type CreateAdminAuditLogInput = {
  actorUserId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  details?: AuditDetails;
};

function mapAuditLog(row: AuditLogRow): AdminAuditLog {
  return {
    id: row.id,
    actorUserId: row.actor_user_id,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    details: row.details,
    createdAt: row.created_at,
  };
}

export async function createAdminAuditLog(
  input: CreateAdminAuditLogInput
): Promise<AdminAuditLog> {
  const adminSupabase = createAdminSupabase();

  const { data, error } = await adminSupabase
    .from("admin_audit_logs")
    .insert({
      actor_user_id: input.actorUserId,
      action: input.action,
      target_type: input.targetType,
      target_id: input.targetId ?? null,
      details: input.details ?? {},
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapAuditLog(data);
}

export async function getAdminAuditLogsForTarget(
  targetType: string,
  targetId: string,
  limit = 50
): Promise<AdminAuditLog[]> {
  const adminSupabase = createAdminSupabase();

  const safeLimit = Math.max(1, Math.min(limit, 200));

  const { data, error } = await adminSupabase
    .from("admin_audit_logs")
    .select("*")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .order("created_at", {
      ascending: false,
    })
    .limit(safeLimit);

  if (error) {
    throw error;
  }

  return ((data ?? []) as AuditLogRow[]).map(mapAuditLog);
}