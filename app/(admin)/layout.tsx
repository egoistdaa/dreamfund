import Link from "next/link";
import type { ReactNode } from "react";

/**
 * 管理画面共通レイアウト。
 * 一般ユーザー向けのスマホ枠・TabBar は使わず、PC幅で作業しやすい構成にする。
 * 将来 /admin/submissions/[id]（承認・見送り・審査メモ）が増える前提の土台。
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3.5">
          <Link
            href="/admin/submissions"
            className="flex items-center gap-2 text-[15px] font-black tracking-tight"
          >
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-900 text-white">
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
              >
                <path d="M12 2l7 4v6c0 5-3 8-7 10-4-2-7-5-7-10V6z" />
              </svg>
            </span>
            DreamFund 管理
          </Link>

          <nav className="ml-6 flex items-center gap-1 text-[13px] font-bold">
            <Link
              href="/admin/submissions"
              className="rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100"
            >
              投稿審査
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/"
              className="text-[12.5px] font-bold text-slate-500 hover:text-slate-800"
            >
              サイトを表示
            </Link>

            <Link
              href="/auth/signout"
              className="rounded-lg border border-slate-200 px-3 py-2 text-[12.5px] font-bold text-slate-600 hover:bg-slate-50"
            >
              ログアウト
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}