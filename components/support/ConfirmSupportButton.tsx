"use client";

import { useState, useTransition } from "react";
import { createPendingPledge } from "@/lib/data/pledgeActions";

export function ConfirmSupportButton({
  projectSlug,
  returnId,
}: {
  projectSlug: string;
  returnId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (isPending || completed) return;

    setError(null);

    startTransition(async () => {
      const result = await createPendingPledge(projectSlug, returnId);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setCompleted(true);
    });
  }

  return (
    <div>
      {error && (
        <div className="mb-3 rounded-lg bg-red-50 px-3 py-2.5 text-[12px] font-bold text-red-600">
          {error}
        </div>
      )}

      {completed && (
        <div className="mb-3 rounded-lg bg-green-50 px-3 py-2.5 text-[12px] font-bold text-green-700">
          支援データを作成しました。現在はまだ決済されていません。
        </div>
      )}

      <button
        type="button"
        onClick={handleClick}
        disabled={isPending || completed}
        className="flex min-h-tap w-full items-center justify-center rounded-[14px] bg-brand-135 text-[15.5px] font-extrabold text-white disabled:opacity-60"
      >
        {isPending
          ? "処理中..."
          : completed
            ? "支援手続きを開始しました"
            : "支援手続きを開始する（テスト）"}
      </button>
    </div>
  );
}