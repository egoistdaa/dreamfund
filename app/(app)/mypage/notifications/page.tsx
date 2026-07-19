import Link from "next/link";
import { requireAuth } from "@/lib/auth/requireAuth";
import { getNotifications } from "@/lib/data/notifications";
import { NotificationItemLink } from "@/components/notifications/NotificationItemLink";

export const metadata = {
  title: "通知",
  robots: { index: false },
};

function formatNotificationDate(value: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function NotificationsPage() {
  const user = await requireAuth("/mypage/notifications");
  const notifications = await getNotifications(user.id);

  return (
    <div className="px-[18px] py-6">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/mypage"
          aria-label="マイページへ戻る"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sub text-ink-sub"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>

        <div>
          <h1 className="text-xl font-black">通知</h1>
          <p className="mt-0.5 text-[12px] text-ink-sub">
            DreamFundからのお知らせ
          </p>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-card border border-line px-5 py-12 text-center">
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-sub text-ink-sub">
            <svg
              className="h-7 w-7"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
            </svg>
          </span>

          <h2 className="text-[15px] font-black">
            通知はまだありません
          </h2>

          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-sub">
            応援メッセージや返信が届くと、
            <br />
            ここに表示されます。
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {notifications.map((notification) => (
            <NotificationItemLink
  key={notification.id}
  notificationId={notification.id}
  href={notification.href}
  isRead={notification.isRead}
  className={`relative rounded-card border px-4 py-4 transition active:scale-[.99] ${
    notification.isRead
      ? "border-line bg-white"
      : "border-primary/25 bg-primary/[.04]"
  }`}
>
              {!notification.isRead && (
                <span className="absolute right-4 top-4 h-2.5 w-2.5 rounded-full bg-primary" />
              )}

              <div className="pr-6 text-[14px] font-black leading-snug">
                {notification.title}
              </div>

              {notification.projectTitle && (
                <div className="mt-1.5 truncate text-[12.5px] font-bold text-primary">
                  {notification.projectTitle}
                </div>
              )}

              {notification.messagePreview && (
                <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-ink-sub">
                  {notification.messagePreview}
                </p>
              )}

              <div className="mt-3 text-[11px] font-medium text-ink-sub">
                {formatNotificationDate(notification.createdAt)}
              </div>
            </NotificationItemLink>
          ))}
        </div>
      )}
    </div>
  );
}