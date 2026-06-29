import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ProjectImage } from "@/components/ui/ProjectImage";
import { ReturnCard } from "@/components/project/ReturnCard";
import { CommentList } from "@/components/project/CommentList";
import { StickySupport } from "@/components/project/StickySupport";
import { ProjectCard } from "@/components/project/ProjectCard";
import {
  getProjectBySlug, getAllProjectSlugs, getComments, getRelatedProjects,
} from "@/lib/data/projects";
import {
  achievementRate, isAchieved, isEndingSoon, daysLeft, formatYen, formatManYen,
} from "@/lib/format";

// 全プロジェクトを静的生成（SEO・表示速度）
// revalidate: 実DB接続時、60秒ごとに最新へ更新（再デプロイ不要）。
export const revalidate = 60;

export async function generateStaticParams() {
  const slugs = await getAllProjectSlugs();
  return slugs.map((slug) => ({ slug }));
}

// プロジェクトごとのSEO（title/description/OGP）
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const p = await getProjectBySlug(params.slug);
  if (!p) return { title: "プロジェクトが見つかりません" };
  const desc = (p.story ?? "").slice(0, 100);
  return {
    title: p.title,
    description: desc,
    alternates: { canonical: `/projects/${p.slug}` },
    openGraph: {
      title: p.title,
      description: desc,
      type: "article",
      images: p.thumbnailUrl ? [{ url: p.thumbnailUrl }] : undefined,
    },
    twitter: { card: "summary_large_image", title: p.title, description: desc },
  };
}

export default async function ProjectDetailPage({ params }: { params: { slug: string } }) {
  const project = await getProjectBySlug(params.slug);
  if (!project) notFound();

  const [comments, related] = await Promise.all([
    getComments(project.id),
    getRelatedProjects(project),
  ]);

  const rate = achievementRate(project);
  const achieved = isAchieved(project);
  const days = daysLeft(project.endAt);
  const endingSoon = isEndingSoon(project.endAt);

  // 構造化データ（プロジェクト + パンくず）
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Project",
        name: project.title,
        description: project.story ?? "",
        url: `/projects/${project.slug}`,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "ホーム", item: "/" },
          { "@type": "ListItem", position: 2, name: "プロジェクト", item: "/projects" },
          { "@type": "ListItem", position: 3, name: project.title, item: `/projects/${project.slug}` },
        ],
      },
    ],
  };

  const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
    <section id={id} className="px-[18px] py-6">
      <h2 className="mb-3 text-base font-black tracking-tight">{title}</h2>
      {children}
    </section>
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* パンくず */}
      <nav className="px-[18px] pt-3 text-[11px] font-bold text-ink-sub" aria-label="パンくず">
        <Link href="/" className="hover:text-primary">ホーム</Link>
        <span className="mx-1.5">›</span>
        <Link href="/projects" className="hover:text-primary">プロジェクト</Link>
        <span className="mx-1.5">›</span>
        <Link href={`/projects?category=${encodeURIComponent(project.category)}`} className="hover:text-primary">{project.category}</Link>
      </nav>

      {/* メイン画像 */}
      <div className="relative mx-[18px] mt-3 h-[240px] overflow-hidden rounded-card-lg">
        <ProjectImage url={project.thumbnailUrl} seed={project.category} className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-x-3 top-3 flex gap-1.5">
          {endingSoon && <Badge kind="soon">⏰ 残り{days}日</Badge>}
          {achieved && <Badge kind="success">🎉 達成</Badge>}
          <Badge kind="cat" className="ml-auto">{project.category}</Badge>
        </div>
      </div>

      {/* タイトル + 起案者 */}
      <div className="px-[18px] pt-4">
        <h1 className="text-[21px] font-black leading-snug tracking-tight">{project.title}</h1>
        <div className="mt-2 flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-135 text-[10px] font-black text-white">
            {project.owner?.displayName?.[0] ?? "?"}
          </span>
          <span className="text-[12.5px] font-bold text-ink-sub">{project.owner?.displayName}</span>
        </div>
      </div>

      {/* 達成率・金額・人数・残り日数 */}
      <div className="px-[18px] pt-4">
        <ProgressBar rate={rate} achieved={achieved} />
        <div className="mt-3 flex items-end justify-between">
          <div>
            <div className={`text-3xl font-black tracking-tight ${achieved ? "text-brand-success" : "text-brand"}`}>{rate}%</div>
            <div className="text-[11px] font-bold text-ink-sub">達成</div>
          </div>
          <div className="text-right">
            <div className="text-xl font-black">{formatYen(project.currentAmount)}</div>
            <div className="text-[11px] font-bold text-ink-sub">目標 {formatManYen(project.goalAmount)}</div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-card bg-sub p-3 text-center">
            <div className="text-lg font-black">{project.supportersCount}<span className="text-xs font-bold text-ink-sub">人</span></div>
            <div className="text-[11px] font-bold text-ink-sub">支援者</div>
          </div>
          <div className="rounded-card bg-sub p-3 text-center">
            <div className={`text-lg font-black ${endingSoon ? "text-hot" : ""}`}>{days}<span className="text-xs font-bold text-ink-sub">日</span></div>
            <div className="text-[11px] font-bold text-ink-sub">残り</div>
          </div>
        </div>
        {project.fundingType === "all_or_nothing" && (
          <p className="mt-3 rounded-lg bg-warning/10 px-3 py-2 text-[11.5px] font-bold text-warning">
            ⚠ All or Nothing方式: 目標未達の場合は全額返金されます。
          </p>
        )}
      </div>

      {/* ストーリー */}
      <Section id="story" title="ストーリー">
        <p className="whitespace-pre-wrap text-[14px] leading-[1.9]">{project.story}</p>
      </Section>

      {/* リターン */}
      <Section id="returns" title="リターン">
        {project.returns && project.returns.length > 0 ? (
          <div className="flex flex-col gap-3">
            {project.returns.map((r) => <ReturnCard key={r.id} ret={r} slug={project.slug} />)}
          </div>
        ) : (
          <p className="rounded-card bg-sub px-4 py-8 text-center text-[13px] text-ink-sub">リターンは準備中です。</p>
        )}
      </Section>

      {/* 活動報告 */}
      <Section id="updates" title="活動報告">
        {project.updates && project.updates.length > 0 ? (
          <div className="flex flex-col gap-3">
            {project.updates.map((u) => (
              <div key={u.id} className="rounded-card border border-line p-4">
                <div className="mb-1 text-[13.5px] font-extrabold">{u.title}</div>
                {u.body && <p className="text-[12.5px] leading-relaxed text-ink-sub">{u.body}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-card bg-sub px-4 py-8 text-center text-[13px] text-ink-sub">まだ活動報告はありません。</p>
        )}
      </Section>

      {/* コメント */}
      <Section id="comments" title={`応援コメント (${comments.length})`}>
        <CommentList comments={comments} />
      </Section>

      {/* 関連プロジェクト */}
      {related.length > 0 && (
        <section className="py-6">
          <h2 className="mb-3 px-[18px] text-base font-black tracking-tight">関連するプロジェクト</h2>
          <div className="no-scrollbar flex gap-3.5 overflow-x-auto px-[18px] pb-2">
            {related.map((p) => <ProjectCard key={p.id} project={p} />)}
          </div>
        </section>
      )}

      <div className="h-2" />

      {/* 常時表示の支援ボタン */}
      <StickySupport project={project} />
    </>
  );
}
