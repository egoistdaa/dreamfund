import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth/requireAuth";
import { SupportMessagePrompt } from "@/components/support/SupportMessagePrompt";
import { getBackedProjectByPledgeId } from "@/lib/data/backedProjects";
import type { PledgeStatusDB } from "@/types/database";

export const metadata = {
  title: "支援内容の詳細",
  robots: { index: false },
};

type BackedProjectDetailPageProps = {
  params: {
    pledgeId: string;
  };
};

function formatYen(value: number): string {
  return `${new Intl.NumberFormat("ja-JP").format(value)}円`;
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

export default async function BackedProjectDetailPage({
  params,
}: BackedProjectDetailPageProps) {
  const user = await requireAuth(
    `/mypage/backed-projects/${params.pledgeId}`
  );

  const detail = await getBackedProjectByPledgeId(
    user.id,
    params.pledgeId
  );

  if (!detail) {
    notFound();
  }

  const progress =
    detail.goalAmount > 0
      ? Math.min(
          100,
          Math.round(
            (detail.currentAmount / detail.goalAmount) * 100
          )
        )
      : 0;

  return (
    <div className="px-[18px] py-6">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/mypage/backed-projects"
          aria-label="支援したプロジェクトへ戻る"
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
            支援内容の詳細
          </h1>
          <p className="mt-0.5 text-[12px] text-ink-sub">
            決済状況と選んだリターン
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-card border border-line bg-white">
        <div className="relative aspect-[16/9] overflow-hidden bg-sub">
          {detail.projectThumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={detail.projectThumbnailUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full place-items-center text-4xl">
              🌟
            </div>
          )}

          <span
            className={`absolute right-3 top-3 rounded-full px-3 py-1.5 text-[11px] font-black ${getPledgeStatusClassName(
              detail.pledgeStatus
            )}`}
          >
            {getPledgeStatusLabel(detail.pledgeStatus)}
          </span>
        </div>

        <div className="p-5">
          <h2 className="text-[17px] font-black leading-snug">
            {detail.projectTitle}
          </h2>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-sub p-3">
              <div className="text-[10px] font-bold text-ink-sub">
                支援金額
              </div>
              <div className="mt-1 text-lg font-black text-primary">
                {formatYen(detail.amount)}
              </div>
            </div>

            <div className="rounded-xl bg-sub p-3">
              <div className="text-[10px] font-bold text-ink-sub">
                支援日時
              </div>
              <div className="mt-1 text-[12px] font-black leading-relaxed">
                {formatDateTime(detail.backedAt)}
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold">
              <span>{progress}%達成</span>
              <span className="text-ink-sub">
                {formatYen(detail.currentAmount)} /{" "}
                {formatYen(detail.goalAmount)}
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
      </section>

      <section className="mt-4 rounded-card border border-line bg-white p-5">
        <h2 className="text-[15px] font-black">
          選んだリターン
        </h2>

        <div className="mt-4 rounded-xl bg-sub p-4">
          <div className="text-[14px] font-black">
            {detail.returnTitle ?? "リターンなし"}
          </div>

          {detail.returnDescription && (
            <p className="mt-2 whitespace-pre-wrap text-[12px] font-medium leading-relaxed text-ink-sub">
              {detail.returnDescription}
            </p>
          )}

          {detail.returnPrice !== null && (
            <div className="mt-3 text-[12px] font-bold">
              リターン価格：{formatYen(detail.returnPrice)}
            </div>
          )}

          {detail.estimatedDelivery && (
            <div className="mt-2 text-[12px] font-bold text-ink-sub">
              お届け予定：{detail.estimatedDelivery}
            </div>
          )}
        </div>
      </section>

      <section className="mt-4 rounded-card border border-line bg-white p-5">
        <h2 className="text-[15px] font-black">
          決済情報
        </h2>

        <dl className="mt-4 space-y-3 text-[12px]">
          <div className="flex items-center justify-between gap-4">
            <dt className="font-bold text-ink-sub">
              決済状態
            </dt>
            <dd className="font-black">
              {getPledgeStatusLabel(detail.pledgeStatus)}
            </dd>
          </div>

          <div className="flex items-center justify-between gap-4">
            <dt className="font-bold text-ink-sub">
              支援ID
            </dt>
            <dd className="max-w-[190px] truncate font-mono text-[10px] font-bold">
              {detail.pledgeId}
            </dd>
          </div>
        </dl>
      </section>

      <div className="mt-4">
        {detail.conversationId ? (
          <Link
            href={`/mypage/support-messages/sent/${detail.conversationId}`}
            className="flex min-h-tap w-full items-center justify-center rounded-[14px] bg-brand-135 px-4 text-[14px] font-extrabold text-white"
          >
            応援メッセージを確認する
          </Link>
        ) : (
          <SupportMessagePrompt
            pledgeId={detail.pledgeId}
            projectSlug={detail.projectSlug}
          />
        )}
      </div>

      <Link
        href={`/projects/${detail.projectSlug}`}
        className="mt-3 flex min-h-tap w-full items-center justify-center rounded-[14px] border border-line bg-white px-4 text-[14px] font-extrabold"
      >
        プロジェクトを見る
      </Link>
    </div>
  );
}