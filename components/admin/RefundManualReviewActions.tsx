"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestRefundRetry } from "@/lib/data/adminRefundActions";

type RefundManualReviewActionsProps = {
  refundId: string;
  canRequestRetry: boolean;
  adminRetryRequestedAt: string | null;
};

export function RefundManualReviewActions({
  refundId,
  canRequestRetry,
  adminRetryRequestedAt,
}: RefundManualReviewActionsProps) {
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const normalizedReason = reason.trim();
  const loading = busy || pending;
  const reasonIsValid =
    normalizedReason.length >= 5 &&
    normalizedReason.length <= 500;

  async function runRefundRetry() {
    if (!reasonIsValid || loading) {
      return;
    }

    setError(null);
    setSuccess(null);
    setBusy(true);
    setConfirming(false);

    try {
      const result = await requestRefundRetry(
        refundId,
        normalizedReason
      );

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setReason("");
      setEditing(false);
      setSuccess(
        "返金の再試行を依頼しました。既存の返金処理で再評価されます。"
      );

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setError(
        "返金の再試行依頼に失敗しました。返金状態を確認してから再度お試しください。"
      );
    } finally {
      setBusy(false);
    }
  }

  if (adminRetryRequestedAt !== null) {
    return (
      <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-[10.5px] font-extrabold text-blue-800">
        再試行依頼済み
      </span>
    );
  }

  if (!canRequestRetry) {
    return (
      <span className="text-[11px] text-slate-300">
        —
      </span>
    );
  }

  return (
    <div className="min-w-[250px]">
      {success ? (
        <div className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-[10.5px] font-bold leading-5 text-emerald-700 ring-1 ring-emerald-200">
          {success}
        </div>
      ) : null}

      {!editing ? (
        <button
          type="button"
          onClick={() => {
            setEditing(true);
            setError(null);
            setSuccess(null);
          }}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "処理中…" : "再試行を依頼"}
        </button>
      ) : (
        <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
          <p className="text-[10.5px] leading-5 text-slate-500">
            なぜ再試行するのか、管理操作履歴として残ります。
          </p>

          {error ? (
            <div className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-[10.5px] font-bold leading-5 text-rose-700 ring-1 ring-rose-200">
              {error}
            </div>
          ) : null}

          <label className="mt-3 block">
            <span className="text-[10.5px] font-bold text-slate-600">
              再試行理由
            </span>

            <textarea
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                setError(null);
                setSuccess(null);
              }}
              maxLength={500}
              rows={4}
              disabled={loading}
              placeholder="例：Stripe管理画面と返金状態を確認し、再処理が必要と判断したため"
              className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[11px] leading-5 text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-slate-400 disabled:bg-slate-50 disabled:text-slate-400"
            />

            <span className="mt-1.5 flex justify-between gap-3 text-[10px]">
              <span
                className={
                  normalizedReason.length > 0 &&
                  normalizedReason.length < 5
                    ? "font-bold text-rose-600"
                    : "text-slate-400"
                }
              >
                5文字以上で入力してください
              </span>

              <span className="shrink-0 text-slate-400">
                {reason.length}/500
              </span>
            </span>
          </label>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
              disabled={loading}
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-[10.5px] font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              閉じる
            </button>

            <button
              type="button"
              onClick={() => {
                setError(null);
                setSuccess(null);
                setConfirming(true);
              }}
              disabled={!reasonIsValid || loading}
              className="flex-1 rounded-lg bg-rose-600 px-3 py-2 text-[10.5px] font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              確認へ
            </button>
          </div>
        </div>
      )}

      {confirming ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          onClick={() => setConfirming(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`refund-retry-title-${refundId}`}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3
              id={`refund-retry-title-${refundId}`}
              className="text-lg font-black text-slate-900"
            >
              この返金の再試行を依頼しますか？
            </h3>

            <p className="mt-2 text-[13px] leading-6 text-slate-600">
              この操作はStripe返金をこの画面から直接実行するものではありません。
              選択した返金を既存の安全な返金処理へ再投入するよう依頼します。
              現在の状態が条件を満たさない場合はサーバー側で拒否されます。
            </p>

            <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
              <div className="text-[10.5px] font-bold text-slate-400">
                管理操作履歴に保存する理由
              </div>

              <p className="mt-1 whitespace-pre-wrap break-words text-[12px] leading-5 text-slate-700">
                {normalizedReason}
              </p>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={loading}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-[13px] font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                キャンセル
              </button>

              <button
                type="button"
                onClick={runRefundRetry}
                disabled={loading}
                className="flex-1 rounded-xl bg-rose-600 px-4 py-3 text-[13px] font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
              >
                {loading ? "処理中…" : "再試行を依頼"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
