"use client";

import { FormEvent, useState } from "react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

const publishableKey =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

if (!publishableKey) {
  throw new Error(
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY が設定されていません"
  );
}

const stripePromise = loadStripe(publishableKey);

function PaymentForm({
  pledgeId,
  projectSlug,
}: {
  pledgeId: string;
  projectSlug: string;
}) {
  const stripe = useStripe();
  const elements = useElements();

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!stripe || !elements || isProcessing) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    const returnUrl =
      `${window.location.origin}/support/${projectSlug}/complete` +
      `?pledge=${encodeURIComponent(pledgeId)}`;

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
      },
    });

    if (error) {
      setErrorMessage(
        error.message ?? "決済を完了できませんでした。"
      );
      setIsProcessing(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4 rounded-card border border-line bg-white p-4">
        <div className="mb-3 text-[13px] font-black">
          お支払い方法
        </div>

        <PaymentElement
          options={{
            layout: "tabs",
          }}
        />
      </div>

      {errorMessage && (
        <div className="mb-3 rounded-lg bg-red-50 px-3 py-2.5 text-[12px] font-bold text-red-600">
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || !elements || isProcessing}
        className="flex min-h-tap w-full items-center justify-center rounded-[14px] bg-brand-135 text-[15.5px] font-extrabold text-white disabled:opacity-60"
      >
        {isProcessing
          ? "決済処理中..."
          : "カードで支援を確定する"}
      </button>

      <p className="mt-3 text-center text-[10.5px] font-medium leading-relaxed text-ink-sub">
        現在はStripeのサンドボックスです。
        実際の請求は発生しません。
      </p>
    </form>
  );
}

export function StripePaymentForm({
  clientSecret,
  pledgeId,
  projectSlug,
}: {
  clientSecret: string;
  pledgeId: string;
  projectSlug: string;
}) {
  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: "stripe",
          variables: {
            borderRadius: "12px",
          },
        },
      }}
    >
      <PaymentForm
        pledgeId={pledgeId}
        projectSlug={projectSlug}
      />
    </Elements>
  );
}