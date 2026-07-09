import Link from "next/link";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import {
  adminStatusLabel,
  formatJaDateTime,
  getPendingSubmissions,
} from "@/lib/data/adminSubmissions";
import { formatYen } from "@/lib/format";

/**
 * 管理者用：審査待ち投稿一覧。
 * 管理者以外は requireAdmin() により 404。
 * 承認・公開反映処理はまだ実装しない。
 */

export const metadata = {
  title: "投稿審査 | 管理",
  robots: { index: false, follow: false },
};

export default async function AdminSubmissionsPage() {
  await requireAdmin();

  const submissions = await getPendingSubmissions();

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            投稿審査
          </h1>

          <p className="mt-1 text-[13px] text-slate-500">
            審査待ちの投稿申請を確認します。承認・公開反映は次のステップで実装予定です。
          </p>
        </div>

        <div className="rounded-xl bg-white px-4 py-2.5 ring-1 ring-slate-200">
          <span className="text-[12px] font-bold text-slate-500">
            審査待ち
          </span>
          <span className="ml-2 text-xl font-black text-slate-900">
            {submissions.length}
          </span>
          <span className="ml-0.5 text-[12px] font-bold text-slate-500">
            件
          </span>
        </div>
      </div>

      {submissions.length === 0 ? (
        <div className="rounded-2xl bg-white py-20 text-center ring-1 ring-slate-200">
          <div className="mb-2 text-3xl">✅</div>

          <p className="text-sm font-bold text-slate-700">
            審査待ちの投稿はありません
          </p>

          <p className="mt-1 text-xs text-slate-500">
            新しい申請が届くとここに表示されます。
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
          <table className="w-full text-left">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr className="text-[12px] font-bold text-slate-500">
                <th className="px-5 py-3">プロジェクト</th>
                <th className="px-5 py-3">投稿者</th>
                <th className="px-5 py-3">カテゴリ</th>
                <th className="px-5 py-3 text-right">目標金額</th>
                <th className="px-5 py-3">ステータス</th>
                <th className="px-5 py-3">投稿日時</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {submissions.map((submission) => {
                const badge = adminStatusLabel(submission.status);

                return (
                  <tr
                    key={submission.id}
                    className="align-middle hover:bg-slate-50/60"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                          {submission.coverImageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={submission.coverImageUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-slate-300">
                              <svg
                                className="h-5 w-5"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={1.5}
                              >
                                <rect
                                  x="3"
                                  y="3"
                                  width="18"
                                  height="18"
                                  rx="2"
                                />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <path d="M21 15l-5-5L5 21" />
                              </svg>
                            </div>
                          )}
                        </div>

                        <span className="line-clamp-2 max-w-[280px] text-[13.5px] font-bold text-slate-900">
                          {submission.title}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="text-[13px] font-bold text-slate-700">
                        {submission.submitterName}
                      </div>

                      <div className="font-mono text-[10.5px] text-slate-400">
                        {submission.userId.slice(0, 8)}…
                      </div>
                    </td>

                    <td className="px-5 py-4 text-[13px] text-slate-600">
                      {submission.category}
                    </td>

                    <td className="px-5 py-4 text-right text-[13px] font-bold text-slate-900">
                      {formatYen(submission.goalAmount)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${badge.className}`}
                      >
                        {badge.text}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-[12.5px] text-slate-500">
                      {formatJaDateTime(submission.createdAt)}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/submissions/${submission.id}`}
                        className="inline-flex items-center rounded-lg bg-slate-900 px-3.5 py-2 text-[12.5px] font-bold text-white hover:bg-slate-700"
                      >
                        詳細を見る
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}