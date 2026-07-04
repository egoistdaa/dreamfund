"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { createBrowserSupabase } from "@/lib/supabase/browser";

type AuthGateValue = {
  user: User | null;
  loadingUser: boolean;
  requireLogin: (redirect: string) => boolean;
};

const AuthGateContext = createContext<AuthGateValue | null>(null);

export function useAuthGate(): AuthGateValue {
  const ctx = useContext(AuthGateContext);

  if (!ctx) {
    throw new Error("useAuthGate は AuthGateProvider の内側で使ってください");
  }

  return ctx;
}

export function AuthGateProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [modalRedirect, setModalRedirect] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (active) {
        setUser(data.user ?? null);
        setLoadingUser(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoadingUser(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const requireLogin = useCallback(
    (redirect: string) => {
      if (user) return true;

      setModalRedirect(redirect);
      return false;
    },
    [user]
  );

  const closeModal = () => setModalRedirect(null);

  return (
    <AuthGateContext.Provider value={{ user, loadingUser, requireLogin }}>
      {children}

      {modalRedirect !== null && (
        <AuthRequiredModal redirect={modalRedirect} onClose={closeModal} />
      )}
    </AuthGateContext.Provider>
  );
}

function AuthRequiredModal({
  redirect,
  onClose,
}: {
  redirect: string;
  onClose: () => void;
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const q = `?redirect=${encodeURIComponent(redirect)}`;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-ink/50 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-[390px] rounded-t-[26px] bg-white p-6 pb-8 shadow-2xl sm:rounded-[26px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line sm:hidden" />

        <div className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-brand-135">
          <svg
            className="h-7 w-7 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M12 21C5.5 16.5 2 12.5 2 8.5 2 5.4 4.4 3 7.5 3 9.3 3 11 3.9 12 5.3 13 3.9 14.7 3 16.5 3 19.6 3 22 5.4 22 8.5c0 4-3.5 8-10 12.5z" />
          </svg>
        </div>

        <h2 className="mb-1 text-lg font-black">
          この機能を利用するにはログインが必要です
        </h2>

        <p className="mb-5 text-[13px] leading-relaxed text-ink-sub">
          ログインまたは新規会員登録をすると、お気に入りや応援ができます。
        </p>

        <Link
          href={`/login${q}`}
          className="mb-3 flex min-h-tap items-center justify-center rounded-[14px] bg-brand-135 text-[15px] font-extrabold text-white shadow-[0_12px_26px_-8px_rgba(37,99,235,.6)] active:scale-[.99]"
        >
          ログイン
        </Link>

        <Link
          href={`/signup${q}`}
          className="flex min-h-tap items-center justify-center rounded-[14px] bg-primary/10 text-[15px] font-extrabold text-primary ring-1 ring-primary/30 active:scale-[.99]"
        >
          新規会員登録
        </Link>

        <button
          onClick={onClose}
          className="mt-4 w-full text-center text-[13px] font-bold text-ink-sub"
        >
          あとで
        </button>
      </div>
    </div>
  );
}