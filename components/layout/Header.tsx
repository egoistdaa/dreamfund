import Link from "next/link";
import { NotificationBell } from "@/components/notifications/NotificationBell";

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
      <NotificationBell />
    </header>
  );
}
