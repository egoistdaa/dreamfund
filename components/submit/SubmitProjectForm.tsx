"use client";

import { useState } from "react";
import Link from "next/link";
import { submitProject } from "@/lib/data/projectSubmissions";
import { CATEGORIES } from "@/lib/data/projects";

const RETURNS_MAX = 5;

type ReturnRow = {
  title: string;
  price: string;
  description: string;
};

export function SubmitProjectForm() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [goalAmount, setGoalAmount] = useState("");
  const [summary, setSummary] = useState("");
  const [story, setStory] = useState("");

  const [returns, setReturns] = useState<ReturnRow[]>([
    { title: "", price: "", description: "" },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function updateReturn(index: number, patch: Partial<ReturnRow>) {
    setReturns((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  }

  function addReturn() {
    setReturns((prev) =>
      prev.length >= RETURNS_MAX
        ? prev
        : [...prev, { title: "", price: "", description: "" }]
    );
  }

  function removeReturn(index: number) {
    if (index === 0) return;
    setReturns((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (loading) return;

    setError(null);
    setLoading(true);

    try {
      const result = await submitProject({
        title,
        category,
        goalAmount: Number(goalAmount),
        summary,
        story,
        returns: returns.map((item) => ({
          title: item.title,
          price: Number(item.price),
          description: item.description,
        })),
      });

      if (!result.ok) {
        setError(result.error);
        setLoading(false);
        return;
      }

      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("通信エラーが発生しました。接続を確認してください。");
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="px-[18px] py-10 text-center">
        <div className="mb-3 text-5xl">🎉</div>

        <h1 className="mb-2 text-xl font-black">投稿を受け付けました</h1>

        <p className="mb-1 text-[13px] leading-relaxed text-ink-sub">
          ご応募ありがとうございます。
          <br />
          内容を確認のうえ、公開までしばらくお待ちください。
        </p>

        <p className="mb-6 text-[12px] text-ink-sub">
          現在は運営確認の準備中です。公開機能は順次ご案内します。
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/mypage"
            className="flex min-h-tap items-center justify-center rounded-[14px] bg-brand-135 text-[15px] font-extrabold text-white shadow-[0_12px_26px_-8px_rgba(37,99,235,.6)] active:scale-[.99]"
          >
            マイページへ
          </Link>

          <Link
            href="/"
            className="flex min-h-tap items-center justify-center rounded-[14px] border border-line text-[14px] font-extrabold text-ink-sub active:scale-[.99]"
          >
            トップへ戻る
          </Link>
        </div>
      </div>
    );
  }

  const labelCls =
    "mb-1 flex items-center gap-1 text-[12.5px] font-bold text-ink-sub";
  const reqCls = "text-[10px] font-black text-hot";
  const inputCls =
    "w-full rounded-xl border border-line bg-sub px-4 py-3 text-[15px] outline-none focus:border-primary focus:bg-white";

  return (
    <form onSubmit={handleSubmit} className="px-[18px] py-6">
      <h1 className="mb-1 text-xl font-black tracking-tight">夢を投稿する</h1>

      <p className="mb-5 text-[12.5px] font-medium text-ink-sub">
        あなたの叶えたい夢を教えてください。応援したくなるプロジェクトを一緒に作りましょう。
      </p>

      {error && (
        <div className="mb-4 rounded-lg bg-error/10 px-3 py-2.5 text-[12.5px] font-bold text-error">
          {error}
        </div>
      )}

      <div className="mb-5">
        <label className={labelCls}>
          夢のタイトル <span className={reqCls}>必須</span>
        </label>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={60}
          placeholder="例：商店街の空き店舗を、みんなの居場所にしたい"
          className={inputCls}
          disabled={loading}
        />

        <p className="mt-1 text-right text-[11px] text-ink-sub">
          {title.length}/60
        </p>
      </div>

      <div className="mb-5">
        <label className={labelCls}>
          カテゴリ <span className={reqCls}>必須</span>
        </label>

        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((item) => {
            const active = category === item.name;

            return (
              <button
                type="button"
                key={item.name}
                onClick={() => setCategory(item.name)}
                disabled={loading}
                className={`rounded-full border px-3.5 py-2 text-[13px] font-bold transition ${
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-line bg-white text-ink-sub"
                }`}
              >
                {item.emoji} {item.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-5">
        <label className={labelCls}>
          目標金額 <span className={reqCls}>必須</span>
        </label>

        <div className="relative">
          <input
            type="number"
            inputMode="numeric"
            value={goalAmount}
            onChange={(e) => setGoalAmount(e.target.value)}
            min={1000}
            step={1000}
            placeholder="1000000"
            className={`${inputCls} pr-10`}
            disabled={loading}
          />

          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[13px] font-bold text-ink-sub">
            円
          </span>
        </div>

        <p className="mt-1 text-[11px] text-ink-sub">
          1,000円以上で設定してください。
        </p>
      </div>

      <div className="mb-5">
        <label className={labelCls}>
          概要文 <span className={reqCls}>必須</span>
        </label>

        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          maxLength={120}
          rows={2}
          placeholder="プロジェクトを一言で。一覧やSNSで最初に見られる文章です。"
          className={`${inputCls} resize-none`}
          disabled={loading}
        />

        <p className="mt-1 text-right text-[11px] text-ink-sub">
          {summary.length}/120
        </p>
      </div>

      <div className="mb-6">
        <label className={labelCls}>
          本文・ストーリー <span className={reqCls}>必須</span>
        </label>

        <textarea
          value={story}
          onChange={(e) => setStory(e.target.value)}
          maxLength={2000}
          rows={8}
          placeholder="なぜこの夢を実現したいのか、集めた資金の使い道、あなたの想いを自由に書いてください。"
          className={`${inputCls} resize-none`}
          disabled={loading}
        />

        <p
          className={`mt-1 text-right text-[11px] ${
            story.length < 500 || story.length > 2000
              ? "text-hot"
              : "text-ink-sub"
          }`}
        >
          {story.length}/2000（500文字以上）
        </p>
      </div>

      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <label className={labelCls}>
            リターン <span className={reqCls}>必須</span>
          </label>

          <span className="text-[11px] font-bold text-ink-sub">
            {returns.length}/{RETURNS_MAX}
          </span>
        </div>

        <div className="flex flex-col gap-4">
          {returns.map((item, index) => (
            <div key={index} className="rounded-card border border-line p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[12px] font-black text-primary">
                  リターン {index + 1}
                </span>

                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => removeReturn(index)}
                    disabled={loading}
                    className="text-[11.5px] font-bold text-hot"
                  >
                    削除
                  </button>
                )}
              </div>

              <label className="mb-1 block text-[11.5px] font-bold text-ink-sub">
                リターン名 <span className={reqCls}>必須</span>
              </label>

              <input
                type="text"
                value={item.title}
                onChange={(e) =>
                  updateReturn(index, { title: e.target.value })
                }
                maxLength={40}
                placeholder="例：お礼のメッセージ＋活動報告"
                className={`${inputCls} mb-3`}
                disabled={loading}
              />

              <label className="mb-1 block text-[11.5px] font-bold text-ink-sub">
                金額 <span className={reqCls}>必須</span>
              </label>

              <div className="relative mb-3">
                <input
                  type="number"
                  inputMode="numeric"
                  value={item.price}
                  onChange={(e) =>
                    updateReturn(index, { price: e.target.value })
                  }
                  min={500}
                  step={100}
                  placeholder="3000"
                  className={`${inputCls} pr-10`}
                  disabled={loading}
                />

                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[13px] font-bold text-ink-sub">
                  円
                </span>
              </div>

              <label className="mb-1 block text-[11.5px] font-bold text-ink-sub">
                説明{" "}
                <span className="text-[10px] font-bold text-ink-sub">
                  任意
                </span>
              </label>

              <textarea
                value={item.description}
                onChange={(e) =>
                  updateReturn(index, { description: e.target.value })
                }
                maxLength={200}
                rows={2}
                placeholder="リターンの内容やお届け予定などを書いてください。"
                className={`${inputCls} resize-none`}
                disabled={loading}
              />
            </div>
          ))}
        </div>

        {returns.length < RETURNS_MAX && (
          <button
            type="button"
            onClick={addReturn}
            disabled={loading}
            className="mt-3 flex min-h-tap w-full items-center justify-center gap-1.5 rounded-[14px] border border-dashed border-primary/40 bg-primary/5 text-[13.5px] font-extrabold text-primary active:scale-[.99]"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            リターンを追加（最大{RETURNS_MAX}個）
          </button>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex min-h-tap w-full items-center justify-center rounded-[14px] bg-brand-135 text-[15.5px] font-extrabold text-white shadow-[0_12px_26px_-8px_rgba(37,99,235,.6)] transition active:scale-[.99] disabled:opacity-60"
      >
        {loading ? "送信中…" : "この内容で投稿する"}
      </button>

      <p className="mt-3 text-center text-[11px] leading-relaxed text-ink-sub">
        投稿後、運営が内容を確認します。
        <br />
        画像の追加は今後のステップでご案内します。
      </p>
    </form>
  );
}