import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import {
  getSubmissionByIdForAdmin,
  adminStatusLabel,
  formatJaDateTime,
} from "@/lib/data/adminSubmissions";
import { ReviewActions } from "@/components/admin/ReviewActions";
import { formatYen } from "@/lib/format";

export const metadata = {
  title: "投稿の詳細 | 管理",
  robots: { index: false, follow: false },
};

export default async function AdminSubmissionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireAdmin();

  const s = await getSubmissionByIdForAdmin(params.id);
  if (!s) notFound();

  const badge = adminStatusLabel(s.status);

  return (
    <div>
      <Link
        href="/admin/submissions"
        className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-bold text-slate-500 hover:text-slate-800"
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
        投稿審査一覧に戻る
      </Link>

      <div className="mb-6 flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11.5px] font-bold text-slate-600">
              {s.category}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${badge.className}`}
            >
              {badge.text}
            </span>
          </div>
          <h1 className="text-2xl font-black leading-snug tracking-tight text-slate-900">
            {s.title}
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
            <div className="relative h-[320px] bg-slate-100">
              {s.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={s.coverImageUrl}
                  alt={s.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-300">
                  <svg
                    className="h-12 w-12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                  <span className="text-[12px] font-bold">画像なし</span>
                </div>
              )}
            </div>
          </div>

          <section className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
            <h2 className="mb-3 text-[15px] font-black text-slate-900">
              概要
            </h2>
            <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed text-slate-700">
              {s.summary}
            </p>
          </section>

          <section className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
            <h2 className="mb-3 text-[15px] font-black text-slate-900">
              本文・ストーリー
            </h2>
            <p className="whitespace-pre-wrap break-words text-[14px] leading-[1.9] text-slate-700">
              {s.story}
            </p>
            <p className="mt-4 border-t border-slate-100 pt-3 text-[11.5px] text-slate-400">
              {s.story.length.toLocaleString()} 文字
            </p>
          </section>

          <section className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
            <h2 className="mb-4 text-[15px] font-black text-slate-900">
              リターン{" "}
              <span className="text-slate-400">（{s.returns.length}件）</span>
            </h2>

            {s.returns.length === 0 ? (
              <p className="rounded-xl bg-slate-50 py-10 text-center text-[13px] text-slate-500">
                リターンは登録されていません。
              </p>
            ) : (
              <div className="space-y-3">
                {s.returns.map((r, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 p-4">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-[11px] font-black text-slate-400">
                        #{i + 1}
                      </span>
                      <span className="text-[17px] font-black text-slate-900">
                        {formatYen(r.price)}
                      </span>
                    </div>
                    <div className="text-[14px] font-bold text-slate-800">
                      {r.title}
                    </div>
                    {r.description && (
                      <p className="mt-1.5 break-words text-[13px] leading-relaxed text-slate-500">
                        {r.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
            <h2 className="mb-4 text-[15px] font-black text-slate-900">
              申請情報
            </h2>
            <dl className="space-y-4 text-[13px]">
              <div>
                <dt className="mb-0.5 font-bold text-slate-400">目標金額</dt>
                <dd className="text-xl font-black text-slate-900">
                  {formatYen(s.goalAmount)}
                </dd>
              </div>
              <div>
                <dt className="mb-0.5 font-bold text-slate-400">投稿日時</dt>
                <dd className="font-bold text-slate-700">
                  {formatJaDateTime(s.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="mb-0.5 font-bold text-slate-400">
                  ステータス
                </dt>
                <dd>
                  <span
                    className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-extrabold ${badge.className}`}
                  >
                    {badge.text}
                  </span>
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
            <h2 className="mb-4 text-[15px] font-black text-slate-900">
              投稿者
            </h2>
            <div className="mb-3 flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-900 text-sm font-black text-white">
                {s.submitterName[0] ?? "?"}
              </span>
              <span className="truncate text-[14px] font-bold text-slate-800">
                {s.submitterName}
              </span>
            </div>
            <div>
              <div className="mb-1 text-[11.5px] font-bold text-slate-400">
                user_id
              </div>
              <code className="block break-all rounded-lg bg-slate-50 px-3 py-2 font-mono text-[11px] text-slate-600">
                {s.userId}
              </code>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
            <h2 className="mb-1 text-[15px] font-black text-slate-900">
              審査アクション
            </h2>
            <ReviewActions id={s.id} status={s.status} />
          </section>
        </div>
      </div>
    </div>
  );
}