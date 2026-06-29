"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { CATEGORIES } from "@/lib/data/projects";

/**
 * 一覧の絞り込みUI（クライアント）。
 * 状態はURLのクエリ(?q=&category=&sort=)に持つ。
 * なぜURLか: 共有・ブックマーク・戻る操作に強く、SEOにも有利。
 * 実フィルタはサーバー側(listProjects)で行うので、ここは見た目と遷移だけ。
 */
const SORT_TABS: { key: string; label: string }[] = [
  { key: "trending", label: "🔥 急上昇" },
  { key: "popular", label: "👑 人気" },
  { key: "new", label: "🆕 新着" },
  { key: "almost", label: "🎯 達成間近" },
  { key: "ending", label: "⏰ まもなく終了" },
];

export function ListFilters({
  q, category, sort,
}: { q: string; category: string; sort: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      router.push(`${pathname}?${next.toString()}`);
    },
    [params, pathname, router]
  );

  return (
    <div className="sticky top-[57px] z-40 border-b border-line bg-white/95 backdrop-blur-md">
      {/* 検索ボックス */}
      <div className="px-[18px] pt-3">
        <div className="flex min-h-tap items-center gap-3 rounded-card bg-sub px-4 py-3 ring-1 ring-line">
          <svg className="h-5 w-5 shrink-0 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" />
          </svg>
          <input
            defaultValue={q}
            placeholder="何を応援したい？"
            onKeyDown={(e) => { if (e.key === "Enter") setParam("q", (e.target as HTMLInputElement).value); }}
            className="flex-1 bg-transparent text-[15px] font-semibold outline-none placeholder:text-slate-400"
            aria-label="検索キーワード"
          />
        </div>
      </div>

      {/* 並び替えタブ */}
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-[18px] py-3">
        <button
          onClick={() => setParam("sort", "")}
          className={`shrink-0 rounded-full px-3.5 py-2 text-[13px] font-bold ring-1 ring-line ${!sort ? "bg-brand-135 text-white ring-0" : "bg-sub text-ink-sub"}`}
        >
          ✨ おすすめ
        </button>
        {SORT_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setParam("sort", t.key)}
            className={`shrink-0 rounded-full px-3.5 py-2 text-[13px] font-bold ring-1 ring-line ${sort === t.key ? "bg-brand-135 text-white ring-0" : "bg-sub text-ink-sub"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* カテゴリチップ */}
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-[18px] pb-3">
        <button
          onClick={() => setParam("category", "")}
          className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold ${!category ? "bg-primary/10 text-primary ring-1 ring-primary/30" : "bg-sub text-ink-sub ring-1 ring-line"}`}
        >
          すべて
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.name}
            onClick={() => setParam("category", c.name)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold ${category === c.name ? "bg-primary/10 text-primary ring-1 ring-primary/30" : "bg-sub text-ink-sub ring-1 ring-line"}`}
          >
            {c.emoji} {c.name}
          </button>
        ))}
      </div>
    </div>
  );
}
