import Link from "next/link";
import type { Project, BadgeKind } from "@/types";
import { ProjectCard } from "./ProjectCard";

/**
 * 横スクロールの行（Netflix風）。タイトル＋ピル＋カード群。
 * トップページが複数の行を並べて回遊を作る。
 */
export function ProjectRow({
  title,
  pill,
  projects,
  href = "/projects",
  cardBadge,
}: {
  title: string;
  pill?: { kind: "hot" | "new" | "soon" | "no1"; label: string };
  projects: Project[];
  href?: string;
  // 行の文脈で各カードに同種バッジを付ける（例: 急上昇 → 全部hot）
  cardBadge?: (p: Project, index: number) => { kind: BadgeKind; label: string } | undefined;
}) {
  const pillCls: Record<string, string> = {
    hot: "bg-hot",
    new: "bg-primary",
    soon: "bg-warning",
    no1: "bg-gradient-to-br from-warning to-hot",
  };
  return (
    <section className="pt-6">
      <div className="mb-3 flex items-center justify-between px-[18px]">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-black tracking-tight">{title}</h2>
          {pill && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold text-white ${pillCls[pill.kind]}`}>
              {pill.label}
            </span>
          )}
        </div>
        <Link href={href} className="flex items-center gap-0.5 text-xs font-bold text-ink-sub">
          すべて
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M9 6l6 6-6 6" />
          </svg>
        </Link>
      </div>
      <div className="no-scrollbar flex gap-3.5 overflow-x-auto px-[18px] pb-2">
        {projects.map((p, i) => (
          <ProjectCard key={p.id} project={p} topBadge={cardBadge?.(p, i)} />
        ))}
      </div>
    </section>
  );
}
