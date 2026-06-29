import type { BadgeKind } from "@/types";

/**
 * バッジ: 「急上昇」「人気No.1」「新着」「残りわずか」「達成」など。
 * カラールール厳守:
 *   hot/no1/soon/limited → 赤系(アクセント) … 緊急感・人気感
 *   success              → 緑(達成・成功)
 *   new                  → 青(primary)
 *   cat                  → 中間色(カテゴリ表示)
 */
const STYLES: Record<BadgeKind, string> = {
  hot:     "bg-hot/90 text-white",
  no1:     "bg-gradient-to-br from-warning to-hot text-white",
  soon:    "bg-warning/95 text-white",
  limited: "bg-hot/90 text-white",
  success: "bg-success text-white",
  new:     "bg-primary/90 text-white",
  cat:     "bg-ink/50 text-white",
};

export function Badge({
  kind,
  children,
  className = "",
}: {
  kind: BadgeKind;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold backdrop-blur-sm ${STYLES[kind]} ${className}`}
    >
      {children}
    </span>
  );
}
