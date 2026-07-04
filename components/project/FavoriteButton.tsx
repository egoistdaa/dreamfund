"use client";

import { useEffect, useState } from "react";
import { useAuthGate } from "@/components/auth/AuthGate";
import { isFavorited, addFavorite, removeFavorite } from "@/lib/data/favorites";

export function FavoriteButton({
  projectId,
  slug,
  variant = "overlay",
}: {
  projectId: string;
  slug: string;
  variant?: "overlay" | "solid";
}) {
  const { user, loadingUser, requireLogin } = useAuthGate();
  const [fav, setFav] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    if (user) {
      isFavorited(projectId).then((v) => {
        if (active) setFav(v);
      });
    } else {
      setFav(false);
    }

    return () => {
      active = false;
    };
  }, [user, projectId]);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (busy || loadingUser) return;

    if (!requireLogin(`/projects/${slug}`)) return;

    setBusy(true);

    const next = !fav;
    setFav(next);

    const ok = next ? await addFavorite(projectId) : await removeFavorite(projectId);

    if (!ok) setFav(!next);

    setBusy(false);
  }

  const active = user ? fav : false;

  if (variant === "solid") {
    return (
      <button
        onClick={handleClick}
        disabled={busy || loadingUser}
        aria-pressed={active}
        aria-label={active ? "お気に入りから外す" : "お気に入りに追加"}
        className={`flex min-h-tap items-center justify-center gap-2 rounded-[14px] px-5 text-[14px] font-extrabold ring-1 transition active:scale-[.98] ${
          active ? "bg-hot/10 text-hot ring-hot/30" : "bg-white text-ink-sub ring-line"
        }`}
      >
        <HeartIcon filled={active} />
        {active ? "お気に入り済み" : "お気に入り"}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={busy || loadingUser}
      aria-pressed={active}
      aria-label={active ? "お気に入りから外す" : "お気に入りに追加"}
      className="grid h-9 w-9 place-items-center rounded-full bg-ink/40 backdrop-blur-sm transition active:scale-90"
    >
      <HeartIcon filled={active} className={active ? "text-hot" : "text-white"} />
    </button>
  );
}

function HeartIcon({ filled, className = "" }: { filled: boolean; className?: string }) {
  return (
    <svg
      className={`h-5 w-5 ${className}`}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M12 21C5.5 16.5 2 12.5 2 8.5 2 5.4 4.4 3 7.5 3 9.3 3 11 3.9 12 5.3 13 3.9 14.7 3 16.5 3 19.6 3 22 5.4 22 8.5c0 4-3.5 8-10 12.5z" />
    </svg>
  );
}