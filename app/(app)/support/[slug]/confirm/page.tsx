import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/lib/auth/requireAuth";
import { getProjectBySlug } from "@/lib/data/projects";
import { formatYen, formatManYen, achievementRate } from "@/lib/format";
import { ConfirmSupportButton } from "@/components/support/ConfirmSupportButton";

export const metadata = {
  title: "支援内容の確認",
  robots: {
    index: false,
  },
};

export default async function SupportConfirmPage({
  params,
  searchParams,
}: {
  params: {
    slug: string;
  };
  searchParams: {
    return?: string;
  };
}) {
  const selfPath = searchParams.return
    ? `/support/${params.slug}/confirm?return=${searchParams.return}`
    : `/support/${params.slug}/confirm`;

  await requireAuth(selfPath);

  const project = await getProjectBySlug(params.slug);

  if (!project) {
    notFound();
  }

  const selectedReturn = project.returns?.find(
  (r) => r.id === searchParams.return
);

const rate = achievementRate(project);
const now = Date.now();

const startTime = project.startAt
  ? new Date(project.startAt).getTime()
  : null;

const endTime = project.endAt
  ? new Date(project.endAt).getTime()
  : null;

const isBeforeStart =
  startTime !== null &&
  !Number.isNaN(startTime) &&
  startTime > now;

const isAfterEnd =
  endTime !== null &&
  !Number.isNaN(endTime) &&
  endTime <= now;

const canSupport =
  project.status === "live" &&
  !isBeforeStart &&
  !isAfterEnd;

const soldOut =
  selectedReturn?.stockTotal != null &&
  selectedReturn.stockSold >= selectedReturn.stockTotal;

  return (
    <div className="px-[18px] py-6">
      <Link
        href={`/projects/${project.slug}`}
        className="mb-4 inline-flex items-center gap-1 text-[12.5px] font-bold text-ink-sub"
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
        プロジェクトに戻る
      </Link>

      <h1 className="mb-1 text-xl font-black tracking-tight">支援内容の確認</h1>

      <p className="mb-5 text-[12.5px] font-medium text-ink-sub">
        内容をご確認ください。この画面では決済は行われません。
      </p>

      <div className="mb-4 rounded-card border border-line p-4">
        <div className="mb-1 text-[11px] font-bold text-primary">{project.category}</div>
        <div className="mb-2 text-[15px] font-extrabold leading-snug">{project.title}</div>
        <div className="text-[12px] font-bold text-ink-sub">
          現在 {rate}% 達成 ・ {formatYen(project.currentAmount)} /{" "}
          {formatManYen(project.goalAmount)}
        </div>
      </div>

      <div className="mb-4 rounded-card border border-line p-4">
        <div className="mb-2 text-[12px] font-bold text-ink-sub">選択中のリターン</div>

        {selectedReturn ? (
          <>
            <div className="mb-1 text-lg font-black text-brand">
              {formatYen(selectedReturn.price)}
            </div>

            <div className="text-[14px] font-extrabold">{selectedReturn.title}</div>

            {selectedReturn.description && (
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-sub">
                {selectedReturn.description}
              </p>
            )}

            {selectedReturn.estimatedDelivery && (
              <div className="mt-2 text-[11px] font-bold text-ink-sub">
                お届け予定: {selectedReturn.estimatedDelivery}
              </div>
            )}
          </>
        ) : (
          <div className="text-[13px] text-ink-sub">
            リターンが選択されていません。
            <Link
              href={`/projects/${project.slug}#returns`}
              className="ml-1 font-bold text-primary"
            >
              リターンを選ぶ
            </Link>
          </div>
        )}
      </div>

        {selectedReturn && !canSupport && (
  <div className="mb-5 rounded-lg bg-slate-100 px-3 py-3 text-center text-[13px] font-bold text-slate-600">
    {isBeforeStart
      ? "このプロジェクトはまだ募集開始前です。"
      : "このプロジェクトの募集は終了しました。"}
  </div>
)}

{selectedReturn && canSupport && soldOut && (
  <div className="mb-5 rounded-lg bg-slate-100 px-3 py-3 text-center text-[13px] font-bold text-slate-600">
    このリターンは売り切れています。
  </div>
)}

{selectedReturn && canSupport && !soldOut && (
  <ConfirmSupportButton
    projectSlug={project.slug}
    returnId={selectedReturn.id}
  />
)}
    </div>
  );
}