"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestSettlementRecheck } from "@/lib/data/adminSettlementActions";

export function SettlementRecheckActions({
  settlementId,
}: {
  settlementId: string;
}) {
  const router = useRouter();

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

  async function runRecheck() {
    if (!reasonIsValid || loading) {
      return;
    }

    setError(null);
    setSuccess(null);
    setBusy(true);
    setConfirming(false);

    const result = await requestSettlementRecheck(
      settlementId,
      normalizedReason
    );

    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setReason("");
    setSuccess(
      "再確認待ちに変更しました。次回の自動精算処理で再評価されます。"
    );

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div>
      <p className="text-[12px] leading-5 text-slate-500">
        手動確認になった原因を確認したうえで、再評価が必要な場合のみ実行してください。
        実行理由は監査ログに保存されます。
      </p>

      {error ? (
        <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-[12px] font-bold leading-5 text-rose-700 ring-1 ring-rose-200">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-[12px] font-bold leading-5 text-emerald-700 ring-1 ring-emerald-200">
          {success}
        </div>
      ) : null}

      <label className="mt-4 block">
        <span className="text-[11.5px] font-bold text-slate-600">
          再確認理由
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
          placeholder="例：Stripe管理画面と支援レコードを確認し、表示金額の修正後に再評価するため"
          className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[13px] leading-5 text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-slate-400 disabled:bg-slate-50 disabled:text-slate-400"
        />

        <span className="mt-1.5 flex justify-between gap-3 text-[10.5px]">
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

      <button
        type="button"
        onClick={() => {
          setError(null);
          setSuccess(null);
          setConfirming(true);
        }}
        disabled={!reasonIsValid || loading}
        className="mt-4 flex w-full items-center justify-center rounded-xl bg-rose-600 px-4 py-3 text-[13.5px] font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "処理中…" : "精算を再確認する"}
      </button>

      {confirming ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          onClick={() => setConfirming(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="settlement-recheck-title"
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3
              id="settlement-recheck-title"
              className="text-lg font-black text-slate-900"
            >
              この精算を再確認しますか？
            </h3>

            <p className="mt-2 text-[13px] leading-6 text-slate-600">
              手動確認状態を解除して、次回の自動精算処理で再評価できる状態へ戻します。
              ロック済み・確定済み・返金レコードがある精算はサーバー側で拒否されます。
            </p>

            <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
              <div className="text-[10.5px] font-bold text-slate-400">
                監査ログに保存する理由
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
                onClick={runRecheck}
                disabled={loading}
                className="flex-1 rounded-xl bg-rose-600 px-4 py-3 text-[13px] font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
              >
                {loading ? "処理中…" : "再確認する"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}