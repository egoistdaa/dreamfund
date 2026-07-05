import { Suspense } from "react";
import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "パスワードの再設定",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={<div className="text-center text-ink-sub">読み込み中…</div>}
    >
      <ForgotPasswordForm />
    </Suspense>
  );
}