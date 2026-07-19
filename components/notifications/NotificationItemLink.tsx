"use client";

import type {
  MouseEvent,
  ReactNode,
} from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/browser";

type NotificationItemLinkProps = {
  notificationId: string;
  href: string;
  isRead: boolean;
  className: string;
  children: ReactNode;
};

export function NotificationItemLink({
  notificationId,
  href,
  isRead,
  className,
  children,
}: NotificationItemLinkProps) {
  const router = useRouter();
  const [isOpening, setIsOpening] = useState(false);

  async function handleClick(
    event: MouseEvent<HTMLAnchorElement>
  ) {
    if (
      isRead ||
      isOpening ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    setIsOpening(true);

    const supabase = createBrowserSupabase();

    const { error } = await supabase.rpc(
      "mark_notification_read",
      {
        p_notification_id: notificationId,
      }
    );

    if (error) {
      console.error(
        "DreamFund mark notification read failed",
        {
          code: error.code,
          message: error.message,
        }
      );
    }

    router.push(href);
    router.refresh();
  }

  return (
    <Link
      href={href}
      className={className}
      onClick={handleClick}
      aria-disabled={isOpening}
    >
      {children}
    </Link>
  );
}