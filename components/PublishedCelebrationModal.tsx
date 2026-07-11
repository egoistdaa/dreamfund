"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markPublishedCelebrationSeen } from "@/lib/data/publishedCelebrationActions";

type PublishedCelebrationModalProps = {
  submissionId: string;
  title: string;
  projectSlug: string;
};

export function PublishedCelebrationModal({
  submissionId,
  title,
  projectSlug,
}: PublishedCelebrationModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const projectHref = `/projects/${projectSlug}`;

  if (!open) return null;

  function getPublicUrl() {
    return `${window.location.origin}${projectHref}`;
  }

  function shareToX() {
    const url = getPublicUrl();
    const text = `「${title}」がDreamFundで公開されました！\n夢への第一歩を応援してください。`;

    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        text
      )}&url=${encodeURIComponent(url)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function shareToLine() {
    const url = getPublicUrl();

    window.open(
      `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(
        url
      )}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function copyPublicUrl() {
    const url = getPublicUrl();

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("このURLをコピーしてください", url);
    }
  }

  async function finish(destination?: string) {
    setError(null);

    const result = await markPublishedCelebrationSeen(submissionId);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setOpen(false);

    if (destination) {
      startTransition(() => {
        router.push(destination);
        router.refresh();
      });
    } else {
      router.refresh();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="published-celebration-title"
    >
      <div className="relative w-full max-w-[350px] overflow-hidden rounded-[28px] bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={() => finish()}
          disabled={pending}
          aria-label="閉じる"
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-lg font-bold text-slate-500 transition hover:bg-slate-200 disabled:opacity-50"
        >
          ×
        </button>

        <div className="pt-4 text-center">
          <div className="text-5xl">🎉</div>

          <h2
            id="published-celebration-title"
            className="mt-4 text-[22px] font-black tracking-tight text-slate-900"
          >
            公開おめでとうございます！
          </h2>

          <p className="mt-3 text-[13.5px] leading-relaxed text-slate-600">
            「{title}」が公開されました。
            <br />
            DreamFundは、あなたの夢への第一歩を応援します。
          </p>
        </div>

        <div className="my-5 border-t border-slate-100" />

        <div className="text-center">
          <div className="text-2xl">📣</div>

          <h3 className="mt-1.5 text-[15px] font-black text-slate-900">
            応援を集めましょう！
          </h3>

          <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
            夢をシェアして、友達や最初の応援者へ届けましょう。
          </p>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-rose-50 px-3 py-2.5 text-center text-[12px] font-bold text-rose-700 ring-1 ring-rose-200">
            {error}
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <button
            type="button"
            onClick={shareToX}
            className="rounded-xl bg-slate-900 px-4 py-3 text-[13.5px] font-bold text-white transition hover:bg-slate-700"
          >
            Xでシェア
          </button>

          <button
            type="button"
            onClick={shareToLine}
            className="rounded-xl bg-[#06C755] px-4 py-3 text-[13.5px] font-bold text-white transition hover:opacity-90"
          >
            LINEでシェア
          </button>

          <button
            type="button"
            onClick={copyPublicUrl}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13.5px] font-bold text-slate-700 transition hover:bg-slate-50"
          >
            {copied ? "コピーしました！" : "URLをコピー"}
          </button>

          <button
            type="button"
            onClick={() => finish(projectHref)}
            disabled={pending}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13.5px] font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            {pending ? "処理中…" : "公開ページを見る"}
          </button>
        </div>

        <button
          type="button"
          onClick={() => finish()}
          disabled={pending}
          className="mt-4 w-full text-center text-[11.5px] font-bold text-slate-400 hover:text-slate-600 disabled:opacity-50"
        >
          あとでシェアする
        </button>

        <p className="mt-2 text-center text-[10.5px] text-slate-400">
          このお知らせは一度だけ表示されます。
        </p>
      </div>
    </div>
  );
}