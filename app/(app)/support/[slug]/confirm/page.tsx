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

  const selectedReturn = project.returns?.find((r) => r.id === searchParams.return);
  const rate = achievementRate(project);

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

      {selectedReturn && (
        <div className="mb-5 flex items-center justify-between rounded-card bg-sub p-4">
          <span className="text-[13px] font-bold">支援金額</span>
          <span className="text-xl font-black text-brand">
            {formatYen(selectedReturn.price)}
          </span>
        </div>
      )}

      <div className="mb-5 rounded-lg bg-warning/10 px-3 py-2.5 text-[12px] font-bold text-warning">
        🚧 決済機能は次フェーズで実装します。現在はボタンを押しても課金されません。
      </div>

      {selectedReturn && (
  <ConfirmSupportButton
    projectSlug={project.slug}
    returnId={selectedReturn.id}
  />
)}
    </div>
  );
}