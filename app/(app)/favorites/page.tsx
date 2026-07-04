import Link from "next/link";
import { requireAuth } from "@/lib/auth/requireAuth";
import { createServerSupabase } from "@/lib/supabase/server-auth";
import { ProjectCard } from "@/components/project/ProjectCard";
import { mapProject } from "@/lib/data/mappers";
import type { Project } from "@/types";

export const metadata = {
  title: "お気に入り",
  robots: {
    index: false,
  },
};

const PROJECT_SELECT =
  "*, owner:public_profiles!projects_owner_id_fkey(id, display_name, avatar_url, bio)";

export default async function FavoritesPage() {
  const user = await requireAuth("/favorites");
  const supabase = createServerSupabase();

  const { data } = await supabase
    .from("favorites")
    .select(`project:projects(${PROJECT_SELECT})`)
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: false,
    });

  const projects: Project[] = (data ?? [])
    .map((row: any) => row.project)
    .filter(Boolean)
    .map((project: any) => mapProject(project));

  return (
    <div className="px-[18px] py-6">
      <h1 className="mb-4 text-xl font-black tracking-tight">お気に入り</h1>

      {projects.length === 0 ? (
        <div className="rounded-card bg-sub px-6 py-16 text-center">
          <div className="mb-2 text-3xl">💙</div>

          <p className="text-sm font-bold">まだお気に入りはありません</p>

          <p className="mt-1 text-xs text-ink-sub">
            気になるプロジェクトのハートを押すと、ここに保存されます。
          </p>

          <Link
            href="/projects"
            className="mt-4 inline-block rounded-xl bg-primary/10 px-5 py-3 text-sm font-extrabold text-primary ring-1 ring-primary/30"
          >
            プロジェクトを探す
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} width="full" />
          ))}
        </div>
      )}
    </div>
  );
}
export {};