import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth/requireAuth";
import {
  formatJaDate,
  getMySubmissionById,
  statusLabel,
} from "@/lib/data/mySubmissions";
import { formatYen } from "@/lib/format";

/**
 * 投稿申請の詳細（ログイン必須・本人のみ）。
 * id と user_id で取得し、無ければ notFound()。
 * 存在しないIDも他人のIDも一律404。
 * 既存の projects/returns には触れない。
 * 編集・削除・承認は未実装。
 */

export const metadata = {
  title: "投稿の詳細",
  robots: { index: false },
};

export default async function SubmissionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireAuth(`/mypage/submissions/${params.id}`);
  const submission = await getMySubmissionById(user.id, params.id);

  if (!submission) {
    notFound();
  }

  const badge = statusLabel(submission.status);

  return (
    <div className="px-[18px] py-6">
      <Link
        href="/mypage/submissions"
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
        投稿一覧に戻る
      </Link>

      <div className="relative mb-4 h-[210px] overflow-hidden rounded-card-lg bg-sub">
        {submission.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={submission.coverImageUrl}
            alt={submission.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink-sub">
            <svg
              className="h-10 w-10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
        )}

        <span
          className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${badge.className}`}
        >
          {badge.text}
        </span>
      </div>

      <div className="mb-1 text-[11px] font-bold text-primary">
        {submission.category}
      </div>

      <h1 className="mb-3 text-[20px] font-black leading-snug tracking-tight">
        {submission.title}
      </h1>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-card bg-sub p-3">
          <div className="text-[11px] font-bold text-ink-sub">目標金額</div>
          <div className="text-lg font-black text-brand">
            {formatYen(submission.goalAmount)}
          </div>
        </div>

        <div className="rounded-card bg-sub p-3">
          <div className="text-[11px] font-bold text-ink-sub">投稿日</div>
          <div className="text-[15px] font-black">
            {formatJaDate(submission.createdAt)}
          </div>
        </div>
      </div>

      <section className="mb-6">
        <h2 className="mb-2 text-base font-black tracking-tight">概要</h2>
        <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed">
          {submission.summary}
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-base font-black tracking-tight">
          本文・ストーリー
        </h2>
        <p className="whitespace-pre-wrap text-[13.5px] leading-[1.9]">
          {submission.story}
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-base font-black tracking-tight">
          リターン（{submission.returns.length}件）
        </h2>

        {submission.returns.length === 0 ? (
          <p className="rounded-card bg-sub px-4 py-8 text-center text-[13px] text-ink-sub">
            リターンは登録されていません。
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {submission.returns.map((returnItem, index) => (
              <div key={index} className="rounded-card border border-line p-4">
                <div className="mb-1 text-lg font-black text-brand">
                  {formatYen(returnItem.price)}
                </div>

                <div className="text-[14px] font-extrabold">
                  {returnItem.title}
                </div>

                {returnItem.description && (
                  <p className="mt-1 text-[12.5px] leading-relaxed text-ink-sub">
                    {returnItem.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="rounded-lg bg-sub px-4 py-3 text-center text-[12px] font-bold text-ink-sub">
        現在のステータス：
        <span className="font-black">{badge.text}</span>
      </div>

      <p className="mt-4 text-center text-[11px] text-ink-sub">
        編集・取り下げ機能は今後のフェーズで実装予定です。
      </p>
    </div>
  );
}