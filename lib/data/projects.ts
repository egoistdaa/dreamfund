import type { Project, SortKey, Comment } from "@/types";
import { achievementRate, daysLeft } from "@/lib/format";
import { isSupabaseConfigured, createServerClient } from "@/lib/supabase/server";
import { mapProject, mapComment } from "./mappers";

// ダミーへのフォールバック（Supabase未設定時も開発を止めない）
import { DUMMY_PROJECTS } from "./dummy";
import { DUMMY_RETURNS, DUMMY_UPDATES, DUMMY_COMMENTS } from "./dummy-detail";

/**
 * ★データ取得層（唯一の窓口）。
 * 画面・コンポーネントはこの関数群だけを呼ぶ。
 * Supabaseが設定済みなら実DB、未設定ならダミーを返す。
 * どちらでも戻り値は同じ Project[] / Project なので画面は無修正。
 *
 * 設計メモ:
 *  - 一覧の status=live 絞り込みやカテゴリ/検索はSQL(PostgREST)で実行。
 *  - 達成率やそれに依存する並び(急上昇/達成間近)は、live集合を取得して
 *    JS側で計算・ソートする（DBに達成率カラムが無いため。将来は
 *    生成カラムやビューを追加すればSQLソートに移行できる）。
 */

const PROJECT_SELECT =
  "*, owner:public_profiles!projects_owner_id_fkey(id, display_name, avatar_url, bio)";
// 公開中の全プロジェクト（実DB or ダミー）
async function fetchLiveProjects(): Promise<Project[]> {
  if (!isSupabaseConfigured) {
    return DUMMY_PROJECTS.filter((p) => p.status === "live");
  }
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_SELECT)
    .eq("status", "live");
  if (error) throw error;
  return (data ?? []).map((r) => mapProject(r as any));
}

export async function getTrendingProjects(limit = 6): Promise<Project[]> {
  const items = await fetchLiveProjects();
  return [...items].sort((a, b) => achievementRate(b) - achievementRate(a)).slice(0, limit);
}

export async function getPopularProjects(limit = 6): Promise<Project[]> {
  const items = await fetchLiveProjects();
  return [...items].sort((a, b) => b.supportersCount - a.supportersCount).slice(0, limit);
}

export async function getNewProjects(limit = 6): Promise<Project[]> {
  const items = await fetchLiveProjects();
  return [...items].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, limit);
}

export async function getAlmostFundedProjects(limit = 6): Promise<Project[]> {
  const items = await fetchLiveProjects();
  return [...items]
    .filter((p) => { const r = achievementRate(p); return r >= 70 && r < 100; })
    .sort((a, b) => achievementRate(b) - achievementRate(a))
    .slice(0, limit);
}

export async function getRecommendedProjects(limit = 6): Promise<Project[]> {
  return getTrendingProjects(limit);
}

export async function listProjects(opts: {
  query?: string;
  category?: string;
  sort?: SortKey;
} = {}): Promise<Project[]> {
  let items = await fetchLiveProjects();

  if (opts.query) {
    const q = opts.query.toLowerCase();
    items = items.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q)) ||
        p.category.toLowerCase().includes(q)
    );
  }
  if (opts.category && opts.category !== "すべて") {
    items = items.filter((p) => p.category === opts.category);
  }

  switch (opts.sort) {
    case "popular":
      items = [...items].sort((a, b) => b.supportersCount - a.supportersCount); break;
    case "new":
      items = [...items].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)); break;
    case "ending":
      items = [...items].sort((a, b) => daysLeft(a.endAt) - daysLeft(b.endAt)); break;
    case "almost":
    case "trending":
    case "recommended":
    default:
      items = [...items].sort((a, b) => achievementRate(b) - achievementRate(a));
  }
  return items;
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  if (!isSupabaseConfigured) {
    const project = DUMMY_PROJECTS.find((p) => p.slug === slug);
    if (!project) return null;
    return {
      ...project,
      returns: DUMMY_RETURNS[project.id] ?? [],
      updates: DUMMY_UPDATES[project.id] ?? [],
    };
  }
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("projects")
    .select(`${PROJECT_SELECT}, returns(*), project_updates(*)`)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapProject(data as any);
}

export async function getComments(projectId: string): Promise<Comment[]> {
  if (!isSupabaseConfigured) {
    return DUMMY_COMMENTS[projectId] ?? [];
  }
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("comments")
    .select("*, author:public_profiles(id, display_name, avatar_url, bio)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => mapComment(r as any));
}

export async function getRelatedProjects(project: Project, limit = 4): Promise<Project[]> {
  const items = await fetchLiveProjects();
  return items
    .filter((p) => p.category === project.category && p.id !== project.id)
    .slice(0, limit);
}

export async function getAllProjectSlugs(): Promise<string[]> {
  if (!isSupabaseConfigured) {
    return DUMMY_PROJECTS.map((p) => p.slug);
  }
  const supabase = createServerClient();
  const { data, error } = await supabase.from("projects").select("slug").eq("status", "live");
  if (error) throw error;
  return ((data ?? []) as { slug: string }[]).map((r) => r.slug);
}

export const CATEGORIES = [
  { name: "地域活性", emoji: "🏘️" },
  { name: "飲食", emoji: "🍜" },
  { name: "スポーツ", emoji: "⚽" },
  { name: "学生", emoji: "🎓" },
  { name: "社会貢献", emoji: "🤝" },
  { name: "音楽", emoji: "🎵" },
  { name: "アート", emoji: "🎨" },
  { name: "教育", emoji: "📚" },
  { name: "動物", emoji: "🐾" },
  { name: "災害支援", emoji: "🆘" },
] as const;
