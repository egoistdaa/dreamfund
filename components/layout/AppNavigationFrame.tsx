"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { TabBar } from "@/components/layout/TabBar";

type AppNavigationFrameProps = {
  children: ReactNode;
};

export function AppNavigationFrame({
  children,
}: AppNavigationFrameProps) {
  const pathname = usePathname();

  const isSupportMessageDetail =
    /^\/mypage\/support-messages\/[^/]+\/?$/.test(pathname);

  return (
    <>
      <main
        className={
          isSupportMessageDetail
            ? "flex-1"
            : "flex-1 pb-[calc(72px+env(safe-area-inset-bottom))]"
        }
      >
        {children}
      </main>

      {!isSupportMessageDetail ? <TabBar /> : null}
    </>
  );
}