"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/browser";

type Status = "checking" | "ready" | "invalid";

function toJaError(message: string): string {
  const m = message.toLowerCase();

  if (
    m.includes("should be at least") ||
    (m.includes("password") && m.includes("8"))
  ) {
    return "パスワードは8文字以上で入力してください。";
  }

  if (m.includes("same") && m.includes("password")) {
    return "以前と同じパスワードは使用できません。別のパスワードを設定してください。";
  }

  if (m.includes("session") || m.includes("token") || m.includes("expired")) {
    return "リンクの有効期限が切れています。再度メールを送信してください。";
  }

  if (m.includes("rate limit") || m.includes("too many")) {
    return "試行回数が多すぎます。しばらく待ってからお試しください。";
  }

  return "エラーが発生しました。時間をおいて再度お試しください。";
}

export function ResetPasswordForm() {
  const router = useRouter();

  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

useEffect(() => {
    const supabase = createBrowserSupabase();
    let cancelled = false;

    async function verifyRecoveryLink() {
      const searchParams = new URLSearchParams(
        window.location.search
      );

      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type");
      const errorCode = searchParams.get("error_code");

      if (
        errorCode ||
        !tokenHash ||
        type !== "recovery"
      ) {
        if (!cancelled) {
          setStatus("invalid");
        }

        return;
      }

      const { error: verifyError } =
        await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        });

      if (cancelled) {
        return;
      }

      if (verifyError) {
        setStatus("invalid");
        return;
      }

      setStatus("ready");
    }

    void verifyRecoveryLink();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (loading) return;

    setError(null);

    if (password.length < 8) {
      setError("パスワードは8文字以上で入力してください。");
      return;
    }

    if (password !== confirm) {
      setError("パスワードが一致しません。もう一度ご確認ください。");
      return;
    }

    setLoading(true);

    try {
      const supabase = createBrowserSupabase();

      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setError(toJaError(error.message));
        setLoading(false);
        return;
      }

      await supabase.auth.signOut();
      router.push("/login?reset=1");
    } catch {
      setError("通信エラーが発生しました。接続を確認してください。");
      setLoading(false);
    }
  }

  if (status === "checking") {
    return (
      <div className="rounded-card-lg border border-line bg-white p-6 text-center text-[13px] text-ink-sub">
        リンクを確認しています…
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="rounded-card-lg border border-line bg-white p-6 text-center">
        <div className="mb-3 text-4xl">⚠️</div>

        <h2 className="mb-2 text-lg font-black">リンクが無効です</h2>

        <p className="text-[13px] leading-relaxed text-ink-sub">
          リンクの有効期限が切れているか、正しく開けませんでした。
          <br />
          お手数ですが、もう一度パスワード再設定メールを送信してください。
        </p>

        <Link
          href="/forgot-password"
          className="mt-5 inline-block text-[13px] font-bold text-primary"
        >
          再設定メールを再送する
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
        新しいパスワードの設定
      </h1>

      <p className="mb-5 text-[12.5px] font-medium text-ink-sub">
        新しいパスワードを入力してください（8文字以上）。
      </p>

      {error && (
        <div className="mb-4 rounded-lg bg-error/10 px-3 py-2.5 text-[12.5px] font-bold text-error">
          {error}
        </div>
      )}

      <label className="mb-1 block text-[12px] font-bold text-ink-sub">
        新しいパスワード
      </label>

      <input
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="8文字以上"
        className="mb-4 w-full rounded-xl border border-line bg-sub px-4 py-3 text-[15px] outline-none focus:border-primary focus:bg-white"
        disabled={loading}
      />

      <label className="mb-1 block text-[12px] font-bold text-ink-sub">
        新しいパスワード（確認）
      </label>

      <input
        type="password"
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="もう一度入力"
        className="mb-5 w-full rounded-xl border border-line bg-sub px-4 py-3 text-[15px] outline-none focus:border-primary focus:bg-white"
        disabled={loading}
      />

      <button
        type="submit"
        disabled={loading}
        className="flex min-h-tap w-full items-center justify-center rounded-[14px] bg-brand-135 text-[15.5px] font-extrabold text-white shadow-[0_12px_26px_-8px_rgba(37,99,235,.6)] transition active:scale-[.99] disabled:opacity-60"
      >
        {loading ? "更新中…" : "パスワードを更新"}
      </button>
    </form>
  );
}