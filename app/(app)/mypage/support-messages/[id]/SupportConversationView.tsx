"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import type { SupportMessageTypeDB } from "@/types/database";

type Message = {
  id: string;
  senderId: string;
  messageType: SupportMessageTypeDB;
  body: string;
  createdAt: string;
};

type SupportConversationViewProps = {
  conversationId: string;
  projectTitle: string;
  projectSlug: string;
  backerName: string;
  backerAvatarUrl: string | null;
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

export default function SupportConversationView({
  conversationId,
  projectTitle,
  projectSlug,
  backerName,
  backerAvatarUrl,
  messages,
}: SupportConversationViewProps) {
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);

  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages.length]);
  useEffect(() => {
  const supabase = createBrowserSupabase();

  void supabase
    .rpc("mark_support_conversation_read", {
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedBody = body.trim();

    if (!trimmedBody || isSending) {
      return;
    }

    setIsSending(true);
    setErrorMessage("");

    const supabase = createBrowserSupabase();

    const { error } = await supabase.rpc("reply_to_support_message", {
      p_conversation_id: conversationId,
      p_body: trimmedBody,
    });

    if (error) {
      console.error("DreamFund support reply failed", {
        code: error.code,
        message: error.message,
      });

      setErrorMessage(
        "返信を送信できませんでした。時間をおいてもう一度お試しください。"
      );
      setIsSending(false);
      return;
    }

    setBody("");
    setIsSending(false);
    router.refresh();
  }

  return (
    <div className="flex min-h-[calc(100dvh-64px)] flex-col bg-[#f6f7f9]">
      <header className="sticky top-0 z-20 border-b border-line bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link
            href="/mypage/support-messages"
            aria-label="応援メッセージ一覧へ戻る"
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
          </Link>

          {backerAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={backerAvatarUrl}
              alt=""
              className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-line"
            />
          ) : (
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-135 text-sm font-black text-white">
              {backerName[0] ?? "?"}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-black">
              {backerName}
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
            支援者から届いた応援メッセージです。
            <br />
            この会話は支援者と投稿者だけが確認できます。
          </p>
        </div>

        {messages.map((message) => {
          const isCreatorReply =
            message.messageType === "creator_reply";

          return (
            <div
              key={message.id}
              className={`flex ${
                isCreatorReply
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div
                className={`flex max-w-[82%] items-end gap-2 ${
                  isCreatorReply
                    ? "flex-row-reverse"
                    : "flex-row"
                }`}
              >
                {!isCreatorReply &&
                  (backerAvatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={backerAvatarUrl}
                      alt=""
                      className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-line"
                    />
                  ) : (
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-135 text-[10px] font-black text-white">
                      {backerName[0] ?? "?"}
                    </div>
                  ))}

                <div>
                  <div
                    className={`whitespace-pre-wrap break-words px-4 py-3 text-[13px] font-medium leading-relaxed shadow-sm ${
                      isCreatorReply
                        ? "rounded-[20px] rounded-br-[5px] bg-primary text-white"
                        : "rounded-[20px] rounded-bl-[5px] border border-line bg-white text-ink"
                    }`}
                  >
                    {message.body}
                  </div>

                  <div
                    className={`mt-1 text-[9.5px] font-medium text-ink-sub ${
                      isCreatorReply
                        ? "text-right"
                        : "text-left"
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

      <div className="sticky bottom-0 z-20 border-t border-line bg-white px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
        {errorMessage ? (
          <p className="mb-2 px-2 text-[11px] font-bold text-red-600">
            {errorMessage}
          </p>
        ) : null}

        <form
          onSubmit={handleSubmit}
          className="flex items-end gap-2"
        >
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={1000}
            rows={1}
            placeholder="返信を入力…"
            aria-label="返信内容"
            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-[22px] border border-line bg-sub px-4 py-3 text-[13px] font-medium outline-none transition placeholder:text-ink-sub focus:border-primary focus:bg-white"
          />

          <button
            type="submit"
            disabled={!body.trim() || isSending}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="返信を送信"
          >
            {isSending ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 2L11 13" />
                <path d="M22 2L15 22L11 13L2 9L22 2Z" />
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}