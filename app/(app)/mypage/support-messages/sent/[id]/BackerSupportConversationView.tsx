"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import type { SupportMessageTypeDB } from "@/types/database";

type Message = {
  id: string;
  senderId: string;
  messageType: SupportMessageTypeDB;
  body: string;
  createdAt: string;
};

type BackerSupportConversationViewProps = {
  conversationId: string;
  projectTitle: string;
  projectSlug: string;
  creatorName: string;
  creatorAvatarUrl: string | null;
  messages: Message[];
};

function formatMessageTime(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function BackerSupportConversationView({
  conversationId,
  projectTitle,
  projectSlug,
  creatorName,
  creatorAvatarUrl,
  messages,
}: BackerSupportConversationViewProps) {
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages.length]);

  useEffect(() => {
    const supabase = createBrowserSupabase();

    void supabase
      .rpc("mark_backer_support_conversation_read", {
  p_conversation_id: conversationId,
})
      .then(({ error }) => {
        if (error) {
          console.error("DreamFund mark conversation read failed", {
            code: error.code,
            message: error.message,
          });
        }
      });
  }, [conversationId]);

  function handleBack() {
    router.push("/mypage/support-messages?view=sent");
    router.refresh();
  }

  return (
    <div className="flex min-h-[calc(100dvh-64px)] flex-col bg-[#f6f7f9]">
      <header className="sticky top-0 z-20 border-b border-line bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            aria-label="送った応援一覧へ戻る"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition active:bg-sub"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          {creatorAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={creatorAvatarUrl}
              alt=""
              className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-line"
            />
          ) : (
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-135 text-sm font-black text-white">
              {creatorName[0] ?? "?"}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-black">
              {creatorName}
            </div>

            <Link
              href={`/projects/${projectSlug}`}
              className="block truncate text-[10.5px] font-bold text-primary"
            >
              {projectTitle}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-5 px-4 py-6">
        <div className="px-5 text-center">
          <p className="text-[11px] font-medium leading-relaxed text-ink-sub">
            あなたが送った応援メッセージと
            <br />
            プロジェクト投稿者からの返信を確認できます。
          </p>
        </div>

        {messages.map((message) => {
          const isBackerMessage = message.messageType === "support";

          return (
            <div
              key={message.id}
              className={`flex ${
                isBackerMessage ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`flex max-w-[82%] items-end gap-2 ${
                  isBackerMessage ? "flex-row-reverse" : "flex-row"
                }`}
              >
                {!isBackerMessage &&
                  (creatorAvatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={creatorAvatarUrl}
                      alt=""
                      className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-line"
                    />
                  ) : (
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-135 text-[10px] font-black text-white">
                      {creatorName[0] ?? "?"}
                    </div>
                  ))}

                <div>
                  <div
                    className={`whitespace-pre-wrap break-words px-4 py-3 text-[13px] font-medium leading-relaxed shadow-sm ${
                      isBackerMessage
                        ? "rounded-[20px] rounded-br-[5px] bg-primary text-white"
                        : "rounded-[20px] rounded-bl-[5px] border border-line bg-white text-ink"
                    }`}
                  >
                    {message.body}
                  </div>

                  <div
                    className={`mt-1 text-[9.5px] font-medium text-ink-sub ${
                      isBackerMessage ? "text-right" : "text-left"
                    }`}
                  >
                    {formatMessageTime(message.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </main>
    </div>
  );
}