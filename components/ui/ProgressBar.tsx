/**
 * 達成率バー（DreamFundの象徴）。
 * 青→紫のグラデーションで「夢へ向かう勢い」を表現。
 * 達成済み(100%以上)は緑グラデーションに切り替え（ポジティブ状態）。
 */
export function ProgressBar({
  rate,
  achieved = false,
  size = "md",
}: {
  rate: number;            // 達成率(%)
  achieved?: boolean;      // 100%以上か
  size?: "sm" | "md";
}) {
  const height = size === "sm" ? "h-1.5" : "h-2.5";
  const width = Math.min(100, Math.max(0, rate)); // バー自体は100%で頭打ち
  return (
    <div
      className={`${height} w-full overflow-hidden rounded-full bg-sub`}
      role="progressbar"
      aria-valuenow={rate}
      aria-valuemin={0}
      aria-label={`達成率 ${rate}%`}
    >
      <div
        className={`${height} rounded-full ${achieved ? "bg-brand-success" : "bg-brand"}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
