import Link from "next/link";
import type { Project, BadgeKind } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ProjectImage } from "@/components/ui/ProjectImage";
import { FavoriteButton } from "@/components/project/FavoriteButton";
import {
  achievementRate,
  isAchieved,
  daysLeft,
  isEndingSoon,
  formatYen,
  formatManYen,
} from "@/lib/format";

export function ProjectCard({
  project,
  topBadge,
  width = "wide",
}: {
  project: Project;
  topBadge?: {
    kind: BadgeKind;
    label: string;
  };
  width?: "wide" | "full";
}) {
  const rate = achievementRate(project);
  const achieved = isAchieved(project);
  const days = daysLeft(project.endAt);
  const endingSoon = isEndingSoon(project.endAt);

  const widthCls = width === "wide" ? "w-[300px] shrink-0" : "w-full";

  return (
    <div
      className={`group relative overflow-hidden rounded-card-lg bg-white shadow-[0_12px_34px_-16px_rgba(15,23,42,.3)] transition hover:-translate-y-1 ${widthCls}`}
    >
      <div className="absolute right-3 top-3 z-[3]">
        <FavoriteButton projectId={project.id} slug={project.slug} variant="overlay" />
      </div>

      <Link href={`/projects/${project.slug}`} className="block">
        <div className="relative h-[220px]">
          <ProjectImage
            url={project.thumbnailUrl}
            seed={project.category}
            className="absolute inset-0 h-full w-full"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/15 to-transparent" />

          <div className="absolute inset-x-3 top-3 z-[2] flex flex-wrap items-start gap-1.5 pr-11">
            {topBadge && <Badge kind={topBadge.kind}>{topBadge.label}</Badge>}
            {!topBadge && endingSoon && <Badge kind="soon">⏰ 残り{days}日</Badge>}
            <Badge kind="cat">{project.category}</Badge>
          </div>

          <div className="absolute inset-x-4 bottom-3 z-[2]">
            <h3 className="line-clamp-2 text-[16.5px] font-extrabold leading-snug text-white drop-shadow">
              {project.title}
            </h3>
          </div>
        </div>

        <div className="px-4 pb-4 pt-3.5">
          <ProgressBar rate={rate} achieved={achieved} />

          <div className="mt-2.5 flex items-baseline justify-between">
            <span
              className={`text-2xl font-black tracking-tight ${
                achieved ? "text-brand-success" : "text-brand"
              }`}
            >
              {rate}%
            </span>

            <span className="text-sm font-extrabold">
              {formatYen(project.currentAmount)}{" "}
              <span className="text-[10.5px] font-semibold text-ink-sub">
                / {formatManYen(project.goalAmount)}
              </span>
            </span>
          </div>

          <div className="mt-2.5 flex items-center gap-3.5 border-t border-line pt-2.5">
            <span className="flex items-center gap-1.5 text-[12.5px] font-extrabold">
              <svg
                className="h-[15px] w-[15px] text-ink-sub"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8" />
              </svg>
              {project.supportersCount}人が応援
            </span>

            <span
              className={`ml-auto flex items-center gap-1.5 text-[12.5px] font-extrabold ${
                endingSoon ? "text-hot" : "text-ink-sub"
              }`}
            >
              <svg
                className="h-[15px] w-[15px]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
              残り{days}日
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}