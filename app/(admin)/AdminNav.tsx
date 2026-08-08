"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    href: "/admin/submissions",
    label: "投稿審査",
  },
  {
    href: "/admin/refunds",
    label: "返金管理",
  },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="ml-6 flex items-center gap-1 text-[13px] font-bold">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href ||
          pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-lg px-3 py-2 transition ${
              isActive
                ? "bg-slate-900 text-white"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
