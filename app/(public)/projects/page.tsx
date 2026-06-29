import type { Metadata } from "next";
import { ListFilters } from "@/components/project/ListFilters";
import { ProjectCard } from "@/components/project/ProjectCard";
import { listProjects } from "@/lib/data/projects";
import type { SortKey } from "@/types";

export const metadata: Metadata = {
  title: "プロジェクトを探す",
  description: "急上昇・人気・新着・達成間近のプロジェクトから、応援したい夢を見つけよう。カテゴリやキーワードで検索できます。",
  alternates: { canonical: "/projects" },
};

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string; sort?: string };
}) {
  const q = searchParams.q ?? "";
  const category = searchParams.category ?? "";
  const sort = (searchParams.sort ?? "") as SortKey | "";

  const projects = await listProjects({ query: q, category, sort: (sort || undefined) as SortKey });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: projects.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: p.title,
      url: `/projects/${p.slug}`,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <ListFilters q={q} category={category} sort={sort} />

      <div className="px-[18px] pb-8 pt-4">
        <p className="mb-4 text-[13px] font-bold text-ink-sub">
          {q && <span className="text-ink">「{q}」</span>}
          {category && <span className="text-ink">{category} </span>}
          <span>{projects.length}件のプロジェクト</span>
        </p>

        {projects.length === 0 ? (
          <div className="rounded-card bg-sub px-6 py-16 text-center">
            <div className="mb-2 text-3xl">🔍</div>
            <p className="text-sm font-bold">条件に合うプロジェクトが見つかりませんでした</p>
            <p className="mt-1 text-xs text-ink-sub">キーワードやカテゴリを変えてお試しください。</p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} width="full" />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
