import Link from "next/link";

// 支援画面（MVPダミー）。決済直前で「準備中」表示。
// 将来: Stripe Payment Element をここに実装。
export default function SupportPage({ params }: { params: { slug: string } }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="text-4xl">🚧</div>
      <h1 className="text-lg font-black">支援機能は準備中です</h1>
      <p className="text-sm leading-relaxed text-ink-sub">
        決済（カード / Apple Pay / Google Pay）は正式版で公開予定です。<br />
        UIはこの画面に実装され、Stripe接続後にすぐ動作します。
      </p>
      <Link href={`/projects/${params.slug}`} className="mt-2 rounded-xl bg-primary/10 px-5 py-3 text-sm font-extrabold text-primary ring-1 ring-primary/30">
        プロジェクトに戻る
      </Link>
    </div>
  );
}
