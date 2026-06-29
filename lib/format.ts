import type { Project } from "@/types";

/** 達成率(%)。currentAmount / goalAmount を整数%で返す。 */
export function achievementRate(p: Pick<Project, "currentAmount" | "goalAmount">): number {
  if (p.goalAmount <= 0) return 0;
  return Math.round((p.currentAmount / p.goalAmount) * 100);
}

/** 達成済みか（達成率100%以上）。緑表示の判定に使う。 */
export function isAchieved(p: Pick<Project, "currentAmount" | "goalAmount">): boolean {
  return achievementRate(p) >= 100;
}

/** 残り日数。endAt から今日を引く。終了済みは0。 */
export function daysLeft(endAt?: string | null): number {
  if (!endAt) return 0;
  const end = new Date(endAt).getTime();
  const now = Date.now();
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

/** 終了間近か（残り3日以内）。hotバッジ判定に使う。 */
export function isEndingSoon(endAt?: string | null): boolean {
  const d = daysLeft(endAt);
  return d > 0 && d <= 3;
}

/** 金額を「¥1,234,000」形式に整形。 */
export function formatYen(amount: number): string {
  return "¥" + amount.toLocaleString("ja-JP");
}

/** 金額を「200万円」のような短縮表記に（目標額の補助表示用）。 */
export function formatManYen(amount: number): string {
  if (amount >= 100_000_000) return `${(amount / 100_000_000).toFixed(1)}億円`;
  if (amount >= 10_000) return `${Math.round(amount / 10_000)}万円`;
  return formatYen(amount);
}

/**
 * 手数料計算。schema.sql の platform_settings と同じ考え方。
 * 将来は設定値をDBから読むが、ロジックの置き場所をここに固定しておく。
 */
export function calcFee(
  amount: number,
  platformRate = 0.10,
  paymentRate = 0.036
): { platformFee: number; paymentFee: number; net: number } {
  const platformFee = Math.round(amount * platformRate);
  const paymentFee = Math.round(amount * paymentRate);
  return { platformFee, paymentFee, net: amount - platformFee - paymentFee };
}
