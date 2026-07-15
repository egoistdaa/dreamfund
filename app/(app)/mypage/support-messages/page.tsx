import Link from "next/link";
import { requireAuth } from "@/lib/auth/requireAuth";
import { getCreatorSupportConversations } from "@/lib/data/supportMessages";

export const metadata = {
  title: "応援メッセージ",
  robots: { index: false },
};

function formatJaDateTime(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function SupportMessagesPage() {
  const user = await requireAuth("/mypage/support-messages");

  const conversations =
    await getCreatorSupportConversations(user.id);

  return (
    <div className="px-[18px] py-6">
      <Link
        href="/mypage"
        className="mb-4 inline-flex items-center gap-1 text-[12.5px] font-bold text-ink-sub"
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
        マイページに戻る
      </Link>

      <div className="mb-5">
        <h1 className="text-xl font-black tracking-tight">
          💌 応援メッセージ
        </h1>

        <p className="mt-1 text-[12px] font-medium leading-relaxed text-ink-sub">
          あなたのプロジェクトへ届いた応援を確認できます。
        </p>
      </div>

      {conversations.length === 0 ? (
        <div className="rounded-card bg-sub px-6 py-16 text-center">
          <div className="mb-2 text-3xl">💌</div>

          <p className="text-sm font-bold">
            まだ応援メッセージはありません
          </p>

          <p className="mt-1 text-xs leading-relaxed text-ink-sub">
            支援者からメッセージが届くと、
            ここに表示されます。
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {conversations.map((conversation) => (
            <Link
              key={conversation.id}
              href={`/mypage/support-messages/${conversation.id}`}
              className="rounded-card border border-line bg-white p-4 transition active:scale-[.99]"
            >
              <div className="mb-3 flex items-center gap-3">
                {conversation.backerAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={conversation.backerAvatarUrl}
                    alt=""
                    className="h-11 w-11 rounded-full object-cover ring-1 ring-line"
                  />
                ) : (
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-135 text-[16px] font-black text-white">
                    {conversation.backerName[0] ?? "?"}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-black">
                    {conversation.backerName}
                  </div>

                  <div className="truncate text-[11px] font-bold text-primary">
                    {conversation.projectTitle}
                  </div>
                </div>

                <svg
                  className="h-4 w-4 shrink-0 text-ink-sub"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </div>

              <p className="line-clamp-2 text-[12.5px] font-medium leading-relaxed text-ink-sub">
                {conversation.latestMessageBody ??
                  "メッセージを確認する"}
              </p>

              <div className="mt-3 text-right text-[10.5px] font-medium text-ink-sub">
                {formatJaDateTime(conversation.lastMessageAt)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}