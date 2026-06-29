import type { Project, Return, ProjectUpdate, Comment, PublicProfile } from "@/types";
import type { Database } from "@/types/database";

/**
 * DB行(snake_case) → ドメイン型(camelCase) への変換。
 * ★ここが「画面はデータ取得元を知らない」を支える境界。
 *   DBのカラム名が変わっても、ここだけ直せば画面は無傷。
 */

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type ReturnRow = Database["public"]["Tables"]["returns"]["Row"];
type UpdateRow = Database["public"]["Tables"]["project_updates"]["Row"];
type CommentRow = Database["public"]["Tables"]["comments"]["Row"];
type ProfileRow = Database["public"]["Tables"]["public_profiles"]["Row"];

export function mapProfile(r: Partial<ProfileRow> | null | undefined): PublicProfile | undefined {
  if (!r || !r.id) return undefined;
  return {
    id: r.id,
    displayName: r.display_name ?? "名称未設定",
    avatarUrl: r.avatar_url ?? null,
    bio: r.bio ?? null,
  };
}

export function mapReturn(r: ReturnRow): Return {
  return {
    id: r.id,
    projectId: r.project_id,
    title: r.title,
    description: r.description,
    price: r.price,
    stockTotal: r.stock_total,
    stockSold: r.stock_sold,
    estimatedDelivery: r.estimated_delivery,
  };
}

export function mapUpdate(r: UpdateRow): ProjectUpdate {
  return { id: r.id, projectId: r.project_id, title: r.title, body: r.body, createdAt: r.created_at };
}

export function mapComment(r: CommentRow & { author?: Partial<ProfileRow> }): Comment {
  return {
    id: r.id,
    projectId: r.project_id,
    author: mapProfile(r.author),
    body: r.body,
    createdAt: r.created_at,
  };
}

// projects に owner(public_profiles) / returns / updates を join した行
type ProjectRowJoined = ProjectRow & {
  owner?: Partial<ProfileRow> | null;
  returns?: ReturnRow[];
  project_updates?: UpdateRow[];
};

export function mapProject(r: ProjectRowJoined): Project {
  return {
    id: r.id,
    ownerId: r.owner_id,
    owner: mapProfile(r.owner),
    title: r.title,
    slug: r.slug,
    category: r.category,
    tags: r.tags ?? [],
    thumbnailUrl: r.thumbnail_url,
    gallery: r.gallery ?? [],
    story: r.story,
    goalAmount: r.goal_amount,
    currentAmount: r.current_amount,
    supportersCount: r.supporters_count,
    fundingType: r.funding_type,
    status: r.status,
    startAt: r.start_at,
    endAt: r.end_at,
    createdAt: r.created_at,
    returns: r.returns ? r.returns.map(mapReturn) : undefined,
    updates: r.project_updates ? r.project_updates.map(mapUpdate) : undefined,
  };
}
