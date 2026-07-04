"use client";

import { useRouter } from "next/navigation";
import type { Return } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { formatYen } from "@/lib/format";
import { useAuthGate } from "@/components/auth/AuthGate";

export function ReturnCard({ ret, slug }: { ret: Return; slug: string }) {
  const router = useRouter();
  const { requireLogin, loadingUser } = useAuthGate();

  const limited = ret.stockTotal != null;
  const remaining = limited ? Math.max(0, (ret.stockTotal as number) - ret.stockSold) : null;
  const soldOut = remaining === 0;

  const confirmPath = `/support/${slug}/confirm?return=${ret.id}`;

  function handleSupport() {
    if (soldOut || loadingUser) return;

    if (!requireLogin(confirmPath)) return;

    router.push(confirmPath);
  }

  return (
    <div className={`rounded-card border border-line p-4 ${soldOut ? "opacity-60" : ""}`}>
      <div className="mb-1 flex items-center gap-2">
        <span className="text-lg font-black text-brand">{formatYen(ret.price)}</span>
        {limited && !soldOut && <Badge kind="limited">残り{remaining}個</Badge>}
        {soldOut && <Badge kind="cat">売り切れ</Badge>}
      </div>

      <div className="mb-1 text-[14px] font-extrabold">{ret.title}</div>

      {ret.description && (
        <p className="mb-2 text-[12.5px] leading-relaxed text-ink-sub">
          {ret.description}
        </p>
      )}

      <div className="mb-3 flex items-center gap-3 text-[11px] font-bold text-ink-sub">
        {limited && <span>限定 {ret.stockTotal}個</span>}
        <span>{ret.stockSold}人が支援</span>
        {ret.estimatedDelivery && <span>お届け: {ret.estimatedDelivery}</span>}
      </div>

      <button
        onClick={handleSupport}
        disabled={soldOut || loadingUser}
        className={`flex min-h-[44px] w-full items-center justify-center rounded-xl text-[14px] font-extrabold ${
          soldOut
            ? "cursor-not-allowed bg-sub text-ink-sub"
            : "bg-primary/10 text-primary ring-1 ring-primary/30 disabled:opacity-60"
        }`}
      >
        {soldOut ? "売り切れ" : "このコースで応援する"}
      </button>
    </div>
  );
}