import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-line bg-white/85 px-[18px] py-3.5 backdrop-blur-xl backdrop-saturate-150">
      <Link href="/" className="flex items-center gap-2 text-lg font-black tracking-tight">
        <span className="grid h-[27px] w-[27px] place-items-center rounded-[9px] bg-brand-135 shadow-[0_4px_12px_-2px_rgba(37,99,235,.5)]">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
            <path d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5L12 3z" fill="#fff" />
          </svg>
        </span>
        DreamFund
      </Link>
      <Link
  href="/mypage/notifications"
  className="relative grid h-10 w-10 place-items-center rounded-xl bg-sub text-ink-sub"
  aria-label="通知"
>
        <span className="absolute right-2 top-[7px] h-2 w-2 rounded-full border-2 border-white bg-hot" />
        <svg className="h-[19px] w-[19px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
      </Link>
    </header>
  );
}
