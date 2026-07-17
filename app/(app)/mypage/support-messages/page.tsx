import Link from "next/link";
import { requireAuth } from "@/lib/auth/requireAuth";
import { getCreatorSupportConversations } from "@/lib/data/supportMessages";

export const metadata = {
  title: "応援メッセージ",
  robots: { index: false },
};

function formatConversationTime(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const startOfMessageDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  const differenceInDays = Math.round(
    (startOfToday.getTime() - startOfMessageDate.getTime()) /
      (1000 * 60 * 60 * 24)
  );

  if (differenceInDays === 0) {
    return new Intl.DateTimeFormat("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  if (differenceInDays === 1) {
    return "昨日";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
  }).format(date);
}

export default async function SupportMessagesPage() {
  const user = await requireAuth("/mypage/support-messages");

  const conversations =
    await getCreatorSupportConversations(user.id);

  return (
    <div className="min-h-full bg-white">
      <div className="border-b border-line px-[18px] pb-4 pt-6">
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
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>

          マイページに戻る
        </Link>

        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-black tracking-tight text-ink">
              応援メッセージ
            </h1>

            <p className="mt-1 text-[11.5px] font-medium text-ink-sub">
              支援者から届いた応援を確認できます
            </p>
          </div>

          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
            </svg>
          </div>
        </div>
      </div>

      {conversations.length === 0 ? (
        <div className="px-6 py-20 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-sub text-primary">
            <svg
              className="h-7 w-7"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
            </svg>
          </div>

          <p className="mt-4 text-[14px] font-black text-ink">
            まだメッセージはありません
          </p>

          <p className="mx-auto mt-2 max-w-[250px] text-[12px] font-medium leading-relaxed text-ink-sub">
            支援者から応援メッセージが届くと、ここに会話が表示されます。
          </p>
        </div>
      ) : (
        <div>
          {conversations.map((conversation) => {
            const latestMessage =
              conversation.latestMessageBody ??
              "メッセージを確認する";

            const messagePreview =
              conversation.latestMessageType === "creator_reply"
                ? `あなた: ${latestMessage}`
                : latestMessage;

            return (
              <Link
                key={conversation.id}
                href={`/mypage/support-messages/${conversation.id}`}
                className="group flex items-center gap-3 border-b border-line/70 px-[18px] py-4 transition active:bg-sub"
              >
                <div className="relative shrink-0">
                  {conversation.backerAvatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={conversation.backerAvatarUrl}
                      alt=""
                      className="h-[54px] w-[54px] rounded-full object-cover ring-1 ring-line"
                    />
                  ) : (
                    <div className="grid h-[54px] w-[54px] place-items-center rounded-full bg-brand-135 text-[18px] font-black text-white">
                      {conversation.backerName[0] ?? "?"}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-[14px] font-black text-ink">
                      {conversation.backerName}
                    </p>

                    <time className="shrink-0 text-[10.5px] font-medium text-ink-sub">
                      {formatConversationTime(
                        conversation.lastMessageAt
                      )}
                    </time>
                  </div>

                  <p className="mt-0.5 truncate text-[12.5px] font-medium text-ink-sub">
                    {messagePreview}
                  </p>

                  <p className="mt-1 truncate text-[10.5px] font-bold text-primary">
                    {conversation.projectTitle}
                  </p>
                </div>

                {conversation.isUnread ? (
  <span
    aria-label="未読"
    className="h-3 w-3 shrink-0 rounded-full bg-primary"
  />
) : (
  <svg
    className="h-4 w-4 shrink-0 text-ink-sub/60 transition group-active:translate-x-0.5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.4}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 6l6 6-6 6" />
  </svg>
)}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}