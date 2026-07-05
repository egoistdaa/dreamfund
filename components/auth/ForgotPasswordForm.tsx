"use client";

import { useState } from "react";
import Link from "next/link";
import { createBrowserSupabase } from "@/lib/supabase/browser";

function toJaError(message: string): string {
  const m = message.toLowerCase();

  if (m.includes("invalid email") || m.includes("unable to validate email")) {
    return "メールアドレスの形式が正しくありません。";
  }

  if (m.includes("rate limit") || m.includes("too many")) {
    return "試行回数が多すぎます。しばらく待ってからお試しください。";
  }

  return "エラーが発生しました。時間をおいて再度お試しください。";
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (loading) return;

    setError(null);

    if (!email.includes("@") || email.length < 5) {
      setError("メールアドレスの形式が正しくありません。");
      return;
    }

    setLoading(true);

    try {
      const supabase = createBrowserSupabase();
      const redirectTo = `${window.location.origin}/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error && error.message.toLowerCase().includes("invalid email")) {
        setError(toJaError(error.message));
        return;
      }

      setSent(true);
    } catch {
      setError("通信エラーが発生しました。接続を確認してください。");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-card-lg border border-line bg-white p-6 text-center">
        <div className="mb-3 text-4xl">📩</div>

        <h2 className="mb-2 text-lg font-black">
          再設定メールを送信しました
        </h2>

        <p className="text-[13px] leading-relaxed text-ink-sub">
          <span className="font-bold text-ink">{email}</span>{" "}
          宛にパスワード再設定用のメールをお送りしました。
          <br />
          メール内のリンクを押して、新しいパスワードを設定してください。
          <br />
          （メールが届かない場合は迷惑メールフォルダもご確認ください）
        </p>

        <Link
          href="/login"
          className="mt-5 inline-block text-[13px] font-bold text-primary"
        >
          ログイン画面へ戻る
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-card-lg border border-line bg-white p-6"
    >
      <h1 className="mb-1 text-xl font-black tracking-tight">
        パスワードの再設定
      </h1>

      <p className="mb-5 text-[12.5px] font-medium text-ink-sub">
        登録済みのメールアドレスを入力してください。再設定用のリンクをお送りします。
      </p>

      {error && (
        <div className="mb-4 rounded-lg bg-error/10 px-3 py-2.5 text-[12.5px] font-bold text-error">
          {error}
        </div>
      )}

      <label className="mb-1 block text-[12px] font-bold text-ink-sub">
        メールアドレス
      </label>

      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="mb-5 w-full rounded-xl border border-line bg-sub px-4 py-3 text-[15px] outline-none focus:border-primary focus:bg-white"
        disabled={loading}
      />

      <button
        type="submit"
        disabled={loading}
        className="flex min-h-tap w-full items-center justify-center rounded-[14px] bg-brand-135 text-[15.5px] font-extrabold text-white shadow-[0_12px_26px_-8px_rgba(37,99,235,.6)] transition active:scale-[.99] disabled:opacity-60"
      >
        {loading ? "送信中…" : "再設定メールを送信"}
      </button>

      <div className="mt-5 text-center text-[12.5px] text-ink-sub">
        <Link href="/login" className="font-bold text-primary">
          ログイン画面へ戻る
        </Link>
      </div>
    </form>
  );
}