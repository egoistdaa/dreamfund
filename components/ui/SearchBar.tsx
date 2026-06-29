import Link from "next/link";

/**
 * 検索バー（目立たせる版）。「何を応援したい？」で感情的な入口に。
 * MVPでは一覧ページへ遷移するだけ（実検索は一覧側のクエリで行う）。
 */
export function SearchBar({
  chips = [],
}: {
  chips?: { label: string; query: string }[];
}) {
  return (
    <div>
      <Link
        href="/projects"
        className="flex min-h-tap items-center gap-3 rounded-card bg-white px-4 py-3.5 shadow-[0_10px_30px_-10px_rgba(37,99,235,.28)] ring-1 ring-line transition active:scale-[.99]"
        aria-label="プロジェクトを検索"
      >
        <svg className="h-5 w-5 shrink-0 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" />
        </svg>
        <span className="flex-1 text-[15px] font-semibold text-slate-400">何を応援したい？</span>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-135">
          <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </span>
      </Link>

      {chips.length > 0 && (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {chips.map((c) => (
            <Link
              key={c.label}
              href={`/projects?q=${encodeURIComponent(c.query)}`}
              className="shrink-0 rounded-full bg-sub px-3.5 py-1.5 text-[11.5px] font-bold text-ink-sub ring-1 ring-line"
            >
              {c.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
