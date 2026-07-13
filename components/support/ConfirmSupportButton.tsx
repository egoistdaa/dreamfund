"use client";

import { useState, useTransition } from "react";
import { createPendingPledge } from "@/lib/data/pledgeActions";
import { StripePaymentForm } from "@/components/support/StripePaymentForm";

type PaymentSession = {
  pledgeId: string;
  amount: number;
  clientSecret: string;
};

export function ConfirmSupportButton({
  projectSlug,
  returnId,
}: {
  projectSlug: string;
  returnId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [paymentSession, setPaymentSession] =
    useState<PaymentSession | null>(null);

  function handleClick() {
    if (isPending || paymentSession) return;

    setError(null);

    startTransition(async () => {
      const result = await createPendingPledge(projectSlug, returnId);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setPaymentSession({
        pledgeId: result.pledgeId,
        amount: result.amount,
        clientSecret: result.clientSecret,
      });
    });
  }

  if (paymentSession) {
    return (
      <StripePaymentForm
        clientSecret={paymentSession.clientSecret}
        pledgeId={paymentSession.pledgeId}
        projectSlug={projectSlug}
      />
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-3 rounded-lg bg-red-50 px-3 py-2.5 text-[12px] font-bold text-red-600">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="flex min-h-tap w-full items-center justify-center rounded-[14px] bg-brand-135 text-[15.5px] font-extrabold text-white disabled:opacity-60"
      >
        {isPending
          ? "決済画面を準備中..."
          : "支払い方法を入力する（テスト）"}
      </button>
    </div>
  );
}