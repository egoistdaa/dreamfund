import Link from "next/link";
import { requireAuth } from "@/lib/auth/requireAuth";
import {
  formatJaDate,
  getMySubmissions,
  statusLabel,
} from "@/lib/data/mySubmissions";
import { formatYen } from "@/lib/format";

/**
 * 投稿したプロジェクト一覧（ログイン必須）。
 * 自分の project_submissions を新しい順に表示。RLSで本人の行のみ。
 * 詳細ページは未実装だが、将来のため「詳細を見る」を /mypage/submissions/[id] へ。
 */

export const metadata = {
  title: "投稿したプロジェクト",
  robots: { index: false },
};

export default async function MySubmissionsPage() {
  const user = await requireAuth("/mypage/submissions");
  const submissions = await getMySubmissions(user.id);

  return (
    <div className="px-[18px] py-6">
      <Link
        href="/mypage"
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
        マイページに戻る
      </Link>

      <h1 className="mb-4 text-xl font-black tracking-tight">
        投稿したプロジェクト
      </h1>

      {submissions.length === 0 ? (
        <div className="rounded-card bg-sub px-6 py-16 text-center">
          <div className="mb-2 text-3xl">📝</div>

          <p className="text-sm font-bold">まだ投稿がありません</p>

          <p className="mt-1 text-xs text-ink-sub">
            あなたの夢を投稿して、応援を集めましょう。
          </p>

          <Link
            href="/submit"
            className="mt-4 inline-block rounded-xl bg-primary/10 px-5 py-3 text-sm font-extrabold text-primary ring-1 ring-primary/30"
          >
            夢を投稿する
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {submissions.map((submission) => {
            const badge = statusLabel(submission.status);

            return (
              <div
                key={submission.id}
                className="overflow-hidden rounded-card-lg border border-line bg-white"
              >
                <div className="relative h-[150px] bg-sub">
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

                <div className="p-4">
                  <div className="mb-1 text-[11px] font-bold text-primary">
                    {submission.category}
                  </div>

                  <h2 className="mb-2 line-clamp-2 text-[15px] font-extrabold leading-snug">
                    {submission.title}
                  </h2>

                  <div className="mb-3 flex items-center justify-between text-[12px] font-bold text-ink-sub">
                    <span>目標 {formatYen(submission.goalAmount)}</span>
                    <span>{formatJaDate(submission.createdAt)}</span>
                  </div>

                  <Link
                    href={`/mypage/submissions/${submission.id}`}
                    className="flex min-h-[44px] items-center justify-center rounded-xl border border-line text-[13px] font-extrabold text-ink-sub active:scale-[.99]"
                  >
                    詳細を見る
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}