import Link from "next/link";
import { requireAuth } from "@/lib/auth/requireAuth";
import {
  getBackedProjects,
  type BackedProjectItem,
} from "@/lib/data/backedProjects";
import type { PledgeStatusDB } from "@/types/database";

export const metadata = {
  title: "支援したプロジェクト",
  robots: { index: false },
};

function formatYen(value: number): string {
  return `${new Intl.NumberFormat("ja-JP").format(value)}円`;
}

function formatBackedDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(date);
}

function getPledgeStatusLabel(
  status: PledgeStatusDB
): string {
  if (status === "paid") {
    return "支援完了";
  }

  if (status === "pending") {
    return "決済確認中";
  }

  if (status === "refunded") {
    return "返金済み";
  }

  return "決済失敗";
}

function getPledgeStatusClassName(
  status: PledgeStatusDB
): string {
  if (status === "paid") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "pending") {
    return "bg-amber-50 text-amber-700";
  }

  if (status === "refunded") {
    return "bg-slate-100 text-slate-600";
  }

  return "bg-red-50 text-red-600";
}

function BackedProjectCard({
  item,
}: {
  item: BackedProjectItem;
}) {
  const progress =
    item.goalAmount > 0
      ? Math.min(
          100,
          Math.round(
            (item.currentAmount / item.goalAmount) * 100
          )
        )
      : 0;

  return (
    <Link
      href={`/projects/${item.projectSlug}`}
      className="overflow-hidden rounded-card border border-line bg-white transition active:scale-[.99]"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-sub">
        {item.projectThumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.projectThumbnailUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full place-items-center text-4xl">
            🌟
          </div>
        )}

        <span
          className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-black ${getPledgeStatusClassName(
            item.pledgeStatus
          )}`}
        >
          {getPledgeStatusLabel(item.pledgeStatus)}
        </span>
      </div>

      <div className="p-4">
        <h2 className="line-clamp-2 text-[15px] font-black leading-snug">
          {item.projectTitle}
        </h2>

        {item.returnTitle && (
          <div className="mt-2 rounded-xl bg-sub px-3 py-2 text-[12px] font-bold text-ink-sub">
            リターン：{item.returnTitle}
          </div>
        )}

        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold text-ink-sub">
              支援金額
            </div>
            <div className="mt-0.5 text-lg font-black text-primary">
              {formatYen(item.amount)}
            </div>
          </div>

          <div className="text-right text-[11px] text-ink-sub">
            {formatBackedDate(item.backedAt)}
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold">
            <span>{progress}%達成</span>
            <span className="text-ink-sub">
              {formatYen(item.currentAmount)} /{" "}
              {formatYen(item.goalAmount)}
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-sub">
            <div
              className="h-full rounded-full bg-brand-135"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

export default async function BackedProjectsPage() {
  const user = await requireAuth(
    "/mypage/backed-projects"
  );

  const backedProjects = await getBackedProjects(user.id);

  return (
    <div className="px-[18px] py-6">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/mypage"
          aria-label="マイページへ戻る"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sub text-ink-sub"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>

        <div>
          <h1 className="text-xl font-black">
            支援したプロジェクト
          </h1>
          <p className="mt-0.5 text-[12px] text-ink-sub">
            支援履歴と選んだリターン
          </p>
        </div>
      </div>

      {backedProjects.length === 0 ? (
        <div className="rounded-card border border-line px-5 py-12 text-center">
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-sub text-2xl">
            🤝
          </span>

          <h2 className="text-[15px] font-black">
            支援履歴はまだありません
          </h2>

          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-sub">
            応援したいプロジェクトを見つけて、
            <br />
            夢の実現を一緒に支えましょう。
          </p>

          <Link
            href="/"
            className="mt-5 inline-flex min-h-tap items-center justify-center rounded-[14px] bg-brand-135 px-5 text-[13px] font-extrabold text-white"
          >
            プロジェクトを探す
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {backedProjects.map((item) => (
            <BackedProjectCard
              key={item.pledgeId}
              item={item}
            />
          ))}
        </div>
      )}
    </div>
  );
}