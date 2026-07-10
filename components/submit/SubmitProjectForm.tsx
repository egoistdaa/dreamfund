"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { submitProject } from "@/lib/data/projectSubmissions";
import {
  uploadSubmissionCover,
  validateSubmissionImage,
} from "@/lib/storage/submissionImage";
import { CATEGORIES } from "@/lib/data/projects";

/**
 * 夢の投稿フォーム（第一段階）。
 * - メイン画像（任意・1枚）/ タイトル / カテゴリ / 目標金額 / 概要文 / 本文 / リターン（可変・最大5）
 * - リターンは初期1つ、「リターンを追加」で最大5つ。2つ目以降のみ削除可。
 * - 画像は選択時プレビュー、送信時に submissions バケットへアップロードして
 *   cover_image_url に保存。画像なしでも投稿可（任意）。
 * - 日本語エラー、送信中はボタン無効化（二重送信防止）。
 * - 保存後は完了画面（/mypage 導線）を表示。
 * - 公開一覧反映は今回は対象外。project_submissions に申請保存のみ。
 */

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

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handlePickCover(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);

    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateSubmissionImage(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  function removeCover() {
    setCoverFile(null);
    setCoverPreview(null);

    if (coverInputRef.current) {
      coverInputRef.current.value = "";
    }
  }

  function updateReturn(index: number, patch: Partial<ReturnRow>) {
    setReturns((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...patch } : r))
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
      let coverImageUrl: string | null = null;

      if (coverFile) {
        const uploadResult = await uploadSubmissionCover(coverFile);

        if (!uploadResult.ok) {
          setError(uploadResult.error);
          setLoading(false);
          return;
        }

        coverImageUrl = uploadResult.url;
      }

      const result = await submitProject({
        title,
        category,
        goalAmount: Number(goalAmount),
        summary,
        story,
        returns: returns.map((r) => ({
          title: r.title,
          price: Number(r.price),
          description: r.description,
        })),
        coverImageUrl,
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
          （現在は運営確認の準備中です。公開機能は順次ご案内します）
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
          メイン画像
          <span className="text-[10px] font-bold text-ink-sub">任意</span>
        </label>

        {coverPreview ? (
          <div className="relative overflow-hidden rounded-card-lg border border-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverPreview}
              alt="メイン画像のプレビュー"
              className="h-[200px] w-full object-cover"
            />

            <button
              type="button"
              onClick={removeCover}
              disabled={loading}
              className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-ink/60 text-white backdrop-blur-sm active:scale-90"
              aria-label="画像を削除"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            disabled={loading}
            className="flex h-[160px] w-full flex-col items-center justify-center gap-2 rounded-card-lg border border-dashed border-primary/40 bg-primary/5 text-primary active:scale-[.99]"
          >
            <svg
              className="h-8 w-8"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>

            <span className="text-[13px] font-extrabold">画像を選択</span>
            <span className="text-[11px] font-bold text-ink-sub">
              JPEG / PNG / WebP・5MBまで
            </span>
          </button>
        )}

        <input
          ref={coverInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handlePickCover}
          className="hidden"
          disabled={loading}
        />
      </div>

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
          {CATEGORIES.map((c) => {
            const active = category === c.name;

            return (
              <button
                type="button"
                key={c.name}
                onClick={() => setCategory(c.name)}
                disabled={loading}
                className={`rounded-full border px-3.5 py-2 text-[13px] font-bold transition ${
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-line bg-white text-ink-sub"
                }`}
              >
                {c.emoji} {c.name}
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
            story.length < 100 || story.length > 2000
              ? "text-hot"
              : "text-ink-sub"
          }`}
        >
          {story.length}/2000（100文字以上で入力してください。）
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
          {returns.map((r, i) => (
            <div key={i} className="rounded-card border border-line p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[12px] font-black text-primary">
                  リターン {i + 1}
                </span>

                {i > 0 && (
                  <button
                    type="button"
                    onClick={() => removeReturn(i)}
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
                value={r.title}
                onChange={(e) => updateReturn(i, { title: e.target.value })}
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
                  value={r.price}
                  onChange={(e) => updateReturn(i, { price: e.target.value })}
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
                説明
                <span className="text-[10px] font-bold text-ink-sub">
                  任意
                </span>
              </label>

              <textarea
                value={r.description}
                onChange={(e) =>
                  updateReturn(i, { description: e.target.value })
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
      </p>
    </form>
  );
}