"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/browser";

type Mode = "login" | "signup";

function toJaError(message: string): string {
  const m = message.toLowerCase();

  if (m.includes("invalid login credentials")) {
    return "メールアドレスまたはパスワードが正しくありません。";
  }

  if (m.includes("email not confirmed")) {
    return "メールアドレスが未確認です。確認メールのリンクを押してください。";
  }

  if (m.includes("password") && m.includes("6")) {
    return "パスワードは6文字以上で入力してください。";
  }

  if (m.includes("unable to validate email") || m.includes("invalid email")) {
    return "メールアドレスの形式が正しくありません。";
  }

  if (m.includes("rate limit") || m.includes("too many")) {
    return "試行回数が多すぎます。しばらく待ってからお試しください。";
  }

  return "エラーが発生しました。時間をおいて再度お試しください。";
}

export function AuthForm({ mode }: { mode: Mode }) {
  const params = useSearchParams();

  const redirect = params.get("redirect") || "/mypage";
  const isSignup = mode === "signup";

  const successBanner =
    params.get("reset") === "1"
      ? "パスワードを再設定しました。新しいパスワードでログインしてください。"
      : params.get("confirmed") === "1"
        ? "メールアドレスの確認が完了しました。ログインしてください。"
        : null;

  const confirmError = params.get("error") === "confirm";

  const redirectQuery = `?redirect=${encodeURIComponent(redirect)}`;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function validate(): string | null {
    if (!email.includes("@") || email.length < 5) {
      return "メールアドレスの形式が正しくありません。";
    }

    if (password.length < 6) {
      return "パスワードは6文字以上で入力してください。";
    }

    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (loading) return;

    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    const supabase = createBrowserSupabase();

    try {
      if (mode === "signup") {
        const emailRedirectTo = `${
          window.location.origin
        }/login?confirmed=1&redirect=${encodeURIComponent(redirect)}`;

        const normalizedEmail = email.trim().toLowerCase();

const { error } = await supabase.auth.signInWithPassword({
  email: normalizedEmail,
  password,
});

if (error) {
  console.error("DreamFund login failed", {
    code: error.code,
    status: error.status,
    message: error.message,
  });

  setError(toJaError(error.message));
  return;
}

        setSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setError(toJaError(error.message));
          return;
        }

        window.location.assign(redirect);
      }
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
          確認メールを送信しました
        </h2>

        <p className="text-[13px] leading-relaxed text-ink-sub">
          <span className="font-bold text-ink">{email}</span>{" "}
          宛に確認メールをお送りしました。
          <br />
          メール内のリンクを押すと登録が完了します。
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
      {successBanner && mode === "login" && (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-success/10 px-3 py-2.5 text-[12.5px] font-bold text-success">
          <svg
            className="mt-0.5 h-4 w-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
          <span>{successBanner}</span>
        </div>
      )}

      {confirmError && mode === "login" && (
        <div className="mb-4 rounded-lg bg-error/10 px-3 py-2.5 text-[12.5px] font-bold text-error">
          確認リンクの処理に失敗しました。すでに確認済みの場合は、そのままログインできます。
        </div>
      )}

      <h1 className="mb-1 text-xl font-black tracking-tight">
        {isSignup ? "新規会員登録" : "ログイン"}
      </h1>

      <p className="mb-5 text-[12.5px] font-medium text-ink-sub">
        {isSignup
          ? "メールアドレスで、夢の応援を始めよう。"
          : "おかえりなさい。"}
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
        className="mb-4 w-full rounded-xl border border-line bg-sub px-4 py-3 text-[15px] outline-none focus:border-primary focus:bg-white"
        disabled={loading}
      />

      <label className="mb-1 block text-[12px] font-bold text-ink-sub">
        パスワード
      </label>

      <input
        type="password"
        autoComplete={isSignup ? "new-password" : "current-password"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="6文字以上"
        className="mb-2 w-full rounded-xl border border-line bg-sub px-4 py-3 text-[15px] outline-none focus:border-primary focus:bg-white"
        disabled={loading}
      />

      {!isSignup && (
        <div className="mb-5 text-right">
          <Link href="/forgot-password" className="text-[12px] font-bold text-primary">
            パスワードを忘れた方
          </Link>
        </div>
      )}

      {isSignup && <div className="mb-3" />}

      <button
        type="submit"
        disabled={loading}
        className="flex min-h-tap w-full items-center justify-center gap-2 rounded-[14px] bg-brand-135 text-[15.5px] font-extrabold text-white shadow-[0_12px_26px_-8px_rgba(37,99,235,.6)] transition active:scale-[.99] disabled:opacity-60"
      >
        {loading ? "処理中…" : isSignup ? "登録する" : "ログイン"}
      </button>

      <div className="mt-5 text-center text-[12.5px] text-ink-sub">
        {isSignup ? (
          <>
            アカウントをお持ちの方は{" "}
            <Link
              href={`/login${redirectQuery}`}
              className="font-bold text-primary"
            >
              ログイン
            </Link>
          </>
        ) : (
          <>
            初めての方は{" "}
            <Link
              href={`/signup${redirectQuery}`}
              className="font-bold text-primary"
            >
              新規登録
            </Link>
          </>
        )}
      </div>
    </form>
  );
}