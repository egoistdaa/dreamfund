import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = {
  title: "ログイン",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center text-ink-sub">読み込み中…</div>}>
      <AuthForm mode="login" />
    </Suspense>
  );
}