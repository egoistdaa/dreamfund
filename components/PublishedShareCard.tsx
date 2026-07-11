"use client";

import Link from "next/link";
import { useState } from "react";

type PublishedShareCardProps = {
  submissionId: string;
  title: string;
};

export function PublishedShareCard({
  submissionId,
  title,
}: PublishedShareCardProps) {
  const [copied, setCopied] = useState(false);

  const projectSlug = `p-${submissionId.replaceAll("-", "").slice(0, 8)}`;
  const projectHref = `/projects/${projectSlug}`;

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

  return (
    <section className="mt-6 overflow-hidden rounded-2xl bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-5 ring-1 ring-sky-200">
      <div className="text-center">
        <div className="text-3xl">📣</div>

        <h2 className="mt-2 text-lg font-black tracking-tight text-slate-900">
          応援を集めましょう！
        </h2>

        <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-500">
          夢をシェアして、友達や最初の応援者へ届けましょう。
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <button
          type="button"
          onClick={shareToX}
          className="flex items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-[13.5px] font-bold text-white transition hover:bg-slate-700"
        >
          Xでシェア
        </button>

        <button
          type="button"
          onClick={shareToLine}
          className="flex items-center justify-center rounded-xl bg-[#06C755] px-4 py-3 text-[13.5px] font-bold text-white transition hover:opacity-90"
        >
          LINEでシェア
        </button>

        <button
          type="button"
          onClick={copyPublicUrl}
          className="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13.5px] font-bold text-slate-700 transition hover:bg-slate-50"
        >
          {copied ? "コピーしました！" : "URLをコピー"}
        </button>

        <Link
          href={projectHref}
          className="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13.5px] font-bold text-slate-700 transition hover:bg-slate-50"
        >
          公開ページを見る
        </Link>
      </div>
    </section>
  );
}