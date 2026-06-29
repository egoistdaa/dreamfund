import type { Comment } from "@/types";

function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "今日";
  if (days === 1) return "昨日";
  return `${days}日前`;
}

/** コメント一覧（MVPは表示のみ。投稿は会員機能実装後）。 */
export function CommentList({ comments }: { comments: Comment[] }) {
  if (comments.length === 0) {
    return <p className="rounded-card bg-sub px-4 py-8 text-center text-[13px] text-ink-sub">まだ応援コメントはありません。</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      {comments.map((c) => (
        <div key={c.id} className="rounded-card bg-sub p-4">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-135 text-[11px] font-black text-white">
              {c.author?.displayName?.[0] ?? "?"}
            </span>
            <span className="text-[12.5px] font-extrabold">{c.author?.displayName ?? "匿名"}</span>
            <span className="ml-auto text-[11px] text-ink-sub">{timeAgo(c.createdAt)}</span>
          </div>
          <p className="text-[13px] leading-relaxed">{c.body}</p>
        </div>
      ))}
    </div>
  );
}
