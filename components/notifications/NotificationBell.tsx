"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthGate } from "@/components/auth/AuthGate";
import { createBrowserSupabase } from "@/lib/supabase/browser";

export function NotificationBell() {
  const { user, loadingUser } = useAuthGate();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const supabase = createBrowserSupabase();

    const { count, error } = await supabase
      .from("notifications")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("user_id", user.id)
      .is("read_at", null);

    if (error) {
      console.error(
        "通知の未読件数を取得できませんでした",
        error
      );
      return;
    }

    setUnreadCount(count ?? 0);
  }, [user]);

  useEffect(() => {
    if (loadingUser) {
      return;
    }

    void refreshUnreadCount();
  }, [
    loadingUser,
    pathname,
    refreshUnreadCount,
  ]);

  useEffect(() => {
    if (loadingUser || !user) {
      return;
    }

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshUnreadCount();
      }
    };

    const refreshWhenFocused = () => {
      void refreshUnreadCount();
    };

    document.addEventListener(
      "visibilitychange",
      refreshWhenVisible
    );
    window.addEventListener("focus", refreshWhenFocused);

    return () => {
      document.removeEventListener(
        "visibilitychange",
        refreshWhenVisible
      );
      window.removeEventListener(
        "focus",
        refreshWhenFocused
      );
    };
  }, [loadingUser, user, refreshUnreadCount]);

  return (
    <Link
      href="/mypage/notifications"
      className="relative grid h-10 w-10 place-items-center rounded-xl bg-sub text-ink-sub"
      aria-label={
        unreadCount > 0
          ? `通知（未読${unreadCount}件）`
          : "通知"
      }
    >
      {unreadCount > 0 && (
        <span className="absolute right-0.5 top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-white bg-hot px-1 text-[9px] font-black leading-none text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}

      <svg
        className="h-[19px] w-[19px]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
      </svg>
    </Link>
  );
}