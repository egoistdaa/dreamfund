"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import type { PledgeStatusDB } from "@/types/database";

type DisplayStatus =
  | PledgeStatusDB
  | "checking"
  | "unavailable";

export function SupportMessagePrompt({
  pledgeId,
  projectSlug,
}: {
  pledgeId: string;
  projectSlug: string;
}) {
  const supabase = useMemo(
    () => createBrowserSupabase(),
    []
  );

  const [status, setStatus] =
    useState<DisplayStatus>("checking");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isSending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    async function checkPledgeStatus() {
      const { data, error: pledgeError } = await supabase
        .from("pledges")
        .select("status")
        .eq("id", pledgeId)
        .maybeSingle();

      if (cancelled) return;

      if (pledgeError || !data) {
        setStatus("unavailable");
        return;
      }

      setStatus(data.status);

      if (data.status === "pending" && attempts < 12) {
        attempts += 1;
        timer = setTimeout(checkPledgeStatus, 1500);
      }
    }

    void checkPledgeStatus();

    return () => {
      cancelled = true;

      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [pledgeId, supabase]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedBody = body.trim();

    if (
      status !== "paid" ||
      isSending ||
      trimmedBody.length < 1
    ) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const { data, error: sendError } = await supabase.rpc(
        "send_support_message",
        {
          p_project_slug: projectSlug,
          p_body: trimmedBody,
        }
      );

      if (sendError) {
        setError(
          sendError.message ??
            "応援メッセージを送信できませんでした。"
        );
        return;
      }

      if (!data?.[0]) {
        setError("応援メッセージを送信できませんでした。");
        return;
      }

      setBody("");
      setSent(true);
    });
  }

  if (sent) {
    return (
      <div className="mb-6 rounded-card border border-green-200 bg-green-50 p-5 text-left">
        <div className="mb-1 text-[15px] font-black text-green-700">
          応援メッセージを送りました！
        </div>

        <p className="text-[12px] font-medium leading-relaxed text-green-700">
          プロジェクト投稿者から返信が届くまで、
          楽しみにお待ちください。
        </p>
      </div>
    );
  }

  if (status === "checking" || status === "pending") {
    return (
      <div className="mb-6 rounded-card border border-line bg-white p-5 text-left">
        <div className="mb-1 text-[14px] font-black">
          決済結果を確認しています
        </div>

        <p className="text-[12px] font-medium leading-relaxed text-ink-sub">
          支援の確定後、応援メッセージを送れるようになります。
          このまま少しお待ちください。
        </p>
      </div>
    );
  }

  if (status !== "paid") {
    return null;
  }

  return (
    <div className="mb-6 rounded-card border border-line bg-white p-5 text-left">
      <div className="mb-1 text-[15px] font-black">
        ❤️ 支援ありがとうございました！
      </div>

      <p className="mb-4 text-[12px] font-medium leading-relaxed text-ink-sub">
        プロジェクト投稿者へ応援メッセージを送りませんか？
      </p>

      <form onSubmit={handleSubmit}>
        <label
          htmlFor="support-message"
          className="mb-2 block text-[12px] font-bold"
        >
          応援メッセージ
        </label>

        <textarea
          id="support-message"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={1000}
          rows={5}
          placeholder="応援しています！夢の実現を楽しみにしています。"
          className="w-full resize-none rounded-[12px] border border-line px-3 py-3 text-[13px] font-medium leading-relaxed outline-none focus:border-primary"
        />

        <div className="mt-1 text-right text-[10px] font-medium text-ink-sub">
          {body.length} / 1000
        </div>

        {error && (
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2.5 text-[12px] font-bold text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSending || body.trim().length < 1}
          className="mt-4 flex min-h-tap w-full items-center justify-center rounded-[14px] bg-brand-135 text-[15px] font-extrabold text-white disabled:opacity-60"
        >
          {isSending
            ? "送信しています..."
            : "応援メッセージを送る"}
        </button>
      </form>
    </div>
  );
}