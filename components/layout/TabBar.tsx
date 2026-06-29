import Link from "next/link";

/**
 * 下部タブバー。親指で届く位置に主要動線。
 * 中央は「夢を投稿」ラベル付きFAB（投稿の意味を明示）。
 * MVPでは支援/投稿/マイページはダミー画面へ。
 */
export function TabBar() {
  const Item = ({ href, label, active, children }: {
    href: string; label: string; active?: boolean; children: React.ReactNode;
  }) => (
    <Link href={href} className={`flex flex-1 flex-col items-center gap-0.5 py-1 text-[10px] font-bold ${active ? "text-primary" : "text-ink-sub"}`}>
      {children}
      {label}
    </Link>
  );
  return (
    <nav className="sticky bottom-0 z-50 flex items-end justify-around border-t border-line bg-white/90 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
      <Item href="/" label="ホーム" active>
        <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 11l9-8 9 8M5 10v10h14V10" /></svg>
      </Item>
      <Item href="/projects" label="さがす">
        <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
      </Item>
      {/* 投稿FAB */}
      <Link href="/submit" className="flex flex-1 flex-col items-center">
        <span className="-mt-5 grid h-[50px] w-[50px] place-items-center rounded-[17px] bg-brand-135 text-white shadow-[0_10px_22px_-6px_rgba(37,99,235,.6)]">
          <svg className="h-[21px] w-[21px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 5v14M5 12h14" /></svg>
        </span>
        <span className="mt-1.5 text-[10px] font-extrabold text-accent">夢を投稿</span>
      </Link>
      <Item href="/mypage" label="マイページ">
        <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8" /></svg>
      </Item>
      <Item href="/mypage" label="お気に入り">
        <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M19 14c1.5-1.5 2-3 2-5a7 7 0 1 0-7 7c2 0 3.5-.5 5-2z" /></svg>
      </Item>
    </nav>
  );
}
