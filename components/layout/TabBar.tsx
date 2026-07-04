"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

function Item({
  href,
  label,
  children,
  active,
  center = false,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
  active: boolean;
  center?: boolean;
}) {
  if (center) {
    return (
      <Link href={href} className="flex w-16 flex-col items-center justify-center gap-1">
        <div className="grid h-14 w-14 -translate-y-3 place-items-center rounded-[20px] bg-brand-135 text-white shadow-[0_14px_30px_-10px_rgba(37,99,235,.8)]">
          {children}
        </div>
        <span className="-mt-3 text-[10.5px] font-extrabold text-primary">{label}</span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={`flex w-16 flex-col items-center justify-center gap-1 text-[10.5px] font-extrabold ${
        active ? "text-primary" : "text-ink-sub"
      }`}
    >
      {children}
      <span>{label}</span>
    </Link>
  );
}

export function TabBar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  }

  const nav = (
    <nav className="fixed inset-x-0 bottom-0 z-[100] mx-auto flex w-full max-w-[390px] items-end justify-around border-t border-line bg-white/90 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
      <Item href="/" label="ホーム" active={isActive("/")}>
        <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />
        </svg>
      </Item>

      <Item href="/projects" label="さがす" active={isActive("/projects")}>
        <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </Item>

      <Item href="/submit" label="夢を投稿" active={isActive("/submit")} center>
        <svg className="h-[25px] w-[25px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      </Item>

      <Item href="/mypage" label="マイページ" active={isActive("/mypage")}>
        <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
      </Item>

      <Item href="/favorites" label="お気に入り" active={isActive("/favorites")}>
        <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M12 21C5.5 16.5 2 12.5 2 8.5 2 5.4 4.4 3 7.5 3 9.3 3 11 3.9 12 5.3 13 3.9 14.7 3 16.5 3 19.6 3 22 5.4 22 8.5c0 4-3.5 8-10 12.5z" />
        </svg>
      </Item>
    </nav>
  );

  if (!mounted) return null;

  return createPortal(nav, document.body);
}