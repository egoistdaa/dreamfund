import Link from "next/link";
import type { Return } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { formatYen } from "@/lib/format";

/**
 * リターン（支援コース）カード。
 * 在庫が limited なら残数を表示。売り切れは選択不可。
 */
export function ReturnCard({ ret, slug }: { ret: Return; slug: string }) {
  const limited = ret.stockTotal != null;
  const remaining = limited ? Math.max(0, (ret.stockTotal as number) - ret.stockSold) : null;
  const soldOut = remaining === 0;

  return (
    <div className={`rounded-card border border-line p-4 ${soldOut ? "opacity-60" : ""}`}>
      <div className="mb-1 flex items-center gap-2">
        <span className="text-lg font-black text-brand">{formatYen(ret.price)}</span>
        {limited && !soldOut && <Badge kind="limited">残り{remaining}個</Badge>}
        {soldOut && <Badge kind="cat">売り切れ</Badge>}
      </div>
      <div className="mb-1 text-[14px] font-extrabold">{ret.title}</div>
      {ret.description && <p className="mb-2 text-[12.5px] leading-relaxed text-ink-sub">{ret.description}</p>}
      <div className="mb-3 flex items-center gap-3 text-[11px] font-bold text-ink-sub">
        {limited && <span>限定 {ret.stockTotal}個</span>}
        <span>{ret.stockSold}人が支援</span>
        {ret.estimatedDelivery && <span>お届け: {ret.estimatedDelivery}</span>}
      </div>
      <Link
        href={soldOut ? "#" : `/support/${slug}?return=${ret.id}`}
        aria-disabled={soldOut}
        className={`flex min-h-[44px] items-center justify-center rounded-xl text-[14px] font-extrabold ${
          soldOut ? "pointer-events-none bg-sub text-ink-sub" : "bg-primary/10 text-primary ring-1 ring-primary/30"
        }`}
      >
        {soldOut ? "売り切れ" : "このコースで応援する"}
      </Link>
    </div>
  );
}
