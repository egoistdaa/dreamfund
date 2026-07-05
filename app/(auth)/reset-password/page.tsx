import { Suspense } from "react";
import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "新しいパスワードの設定",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={<div className="text-center text-ink-sub">読み込み中…</div>}
    >
      <ResetPasswordForm />
    </Suspense>
  );
}