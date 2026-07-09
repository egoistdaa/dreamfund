"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveSubmission, rejectSubmission } from "@/lib/data/adminActions";

type Action = "approve" | "reject";

export function ReviewActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isProcessed = status !== "pending_review";
  const loading = pending || busy;

  if (isProcessed) {
    const done =
      status === "approved"
        ? {
            text: "この申請は承認済みです（公開準備）",
            cls: "bg-emerald-50 text-emerald-700 ring-emerald-200",
          }
        : status === "rejected"
          ? {
              text: "この申請は見送りになりました",
              cls: "bg-rose-50 text-rose-700 ring-rose-200",
            }
          : {
              text: "この申請は処理済みです",
              cls: "bg-slate-50 text-slate-600 ring-slate-200",
            };

    return (
      <div>
        <div
          className={`rounded-xl px-4 py-3 text-center text-[13px] font-bold ring-1 ${done.cls}`}
        >
          {done.text}
        </div>
        <p className="mt-4 border-t border-slate-100 pt-3 text-[11px] leading-relaxed text-slate-400">
          公開ページへの反映は次のステップで実装予定です。
        </p>
      </div>
    );
  }

  async function run(action: Action) {
    setError(null);
    setBusy(true);
    setConfirming(null);

    const res =
      action === "approve"
        ? await approveSubmission(id)
        : await rejectSubmission(id);

    setBusy(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }

    startTransition(() => router.refresh());
  }

  return (
    <div>
      <p className="mb-4 text-[12px] leading-relaxed text-slate-500">
        承認すると公開準備の状態になります。公開ページへの反映は次のステップで実装予定です。
      </p>

      {error && (
        <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2.5 text-[12.5px] font-bold text-rose-700 ring-1 ring-rose-200">
          {error}
        </div>
      )}

      <div className="space-y-2.5">
        <button
          type="button"
          onClick={() => setConfirming("approve")}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-[13.5px] font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
          {loading ? "処理中…" : "承認する（公開準備へ）"}
        </button>

        <button
          type="button"
          onClick={() => setConfirming("reject")}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-[13.5px] font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
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
          見送りにする
        </button>
      </div>

      {confirming && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          onClick={() => setConfirming(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {confirming === "approve" ? (
              <>
                <h3 className="mb-2 text-lg font-black text-slate-900">
                  この申請を承認しますか？
                </h3>
                <p className="mb-6 text-[13px] leading-relaxed text-slate-600">
                  ステータスが「公開準備」に変わります。
                  <br />
                  この操作は元に戻せません。
                  <br />
                  公開ページへの反映はまだ行われません。
                </p>
              </>
            ) : (
              <>
                <h3 className="mb-2 text-lg font-black text-slate-900">
                  この申請を見送りますか？
                </h3>
                <p className="mb-6 text-[13px] leading-relaxed text-slate-600">
                  ステータスが「見送り」に変わります。
                  <br />
                  この操作は元に戻せません。
                </p>
              </>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirming(null)}
                disabled={loading}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-[13.5px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                キャンセル
              </button>

              <button
                type="button"
                onClick={() => run(confirming)}
                disabled={loading}
                className={`flex-1 rounded-xl px-4 py-3 text-[13.5px] font-bold text-white disabled:opacity-50 ${
                  confirming === "approve"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {loading
                  ? "処理中…"
                  : confirming === "approve"
                    ? "承認する"
                    : "見送る"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}