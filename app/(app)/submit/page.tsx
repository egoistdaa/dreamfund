import Link from "next/link";
import { requireAuth } from "@/lib/auth/requireAuth";

export const metadata = {
  title: "夢を投稿",
  robots: {
    index: false,
  },
};

export default async function SubmitPage() {
  const user = await requireAuth("/submit");

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="text-4xl">🚧</div>

      <h1 className="text-lg font-black">プロジェクト投稿は準備中です</h1>

      <p className="text-[13px] leading-relaxed text-ink-sub">
        投稿フォームは次のフェーズで公開予定です。
        <br />
        ログインは完了しています（{user.email}）。
      </p>

      <Link
        href="/"
        className="mt-2 rounded-xl bg-primary/10 px-5 py-3 text-sm font-extrabold text-primary ring-1 ring-primary/30"
      >
        トップへ戻る
      </Link>
    </div>
  );
}