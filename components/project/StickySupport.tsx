import Link from "next/link";
import type { Project } from "@/types";
import {
  achievementRate,
  daysLeft,
  formatYen,
} from "@/lib/format";

/**
 * 詳細ページ下部の「支援する」バー。
 * 固定されたTabBarと重ならないよう、
 * TabBarの高さ分だけ上へ配置する。
 */
export function StickySupport({
  project,
}: {
  project: Project;
}) {
  const rate = achievementRate(project);
  const days = daysLeft(project.endAt);

  return (
    <div className="sticky bottom-[calc(64px+env(safe-area-inset-bottom))] z-40 border-t border-line bg-white/95 px-4 pb-3 pt-3 backdrop-blur-xl">
      <div className="mb-2 flex items-center justify-between text-[11px] font-bold text-ink-sub">
        <span>
          <span className="text-brand text-sm font-black">
            {rate}%
          </span>{" "}
          達成
        </span>

        <span>
          {formatYen(project.currentAmount)} 集まっています
        </span>

        <span className={days <= 3 ? "text-hot" : ""}>
          残り{days}日
        </span>
      </div>

      <Link
        href={`/support/${project.slug}`}
        className="flex min-h-tap items-center justify-center gap-2 rounded-[14px] bg-brand-135 text-base font-extrabold text-white shadow-[0_12px_26px_-8px_rgba(37,99,235,.6)] active:scale-[.99]"
      >
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="M12 21C5.5 16.5 2 12.5 2 8.5 2 5.4 4.4 3 7.5 3 9.3 3 11 3.9 12 5.3 13 3.9 14.7 3 16.5 3 19.6 3 22 5.4 22 8.5c0 4-3.5 8-10 12.5z" />
        </svg>

        このプロジェクトを応援する
      </Link>
    </div>
  );
}