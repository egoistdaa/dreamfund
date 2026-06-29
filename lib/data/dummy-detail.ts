import type { Return, ProjectUpdate, Comment } from "@/types";

/**
 * 詳細ページ用のダミー関連データ。projectId をキーに引く。
 * 将来は returns/project_updates/comments テーブルから取得（型は同じ）。
 */

const ago = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

export const DUMMY_RETURNS: Record<string, Return[]> = {
  p1: [
    { id: "r1", projectId: "p1", title: "応援コース", description: "感謝のメールをお送りします。", price: 1000, stockTotal: null, stockSold: 84, estimatedDelivery: "2026年8月" },
    { id: "r2", projectId: "p1", title: "横丁オープン記念チケット", description: "オープニングイベントにご招待。お礼の品付き。", price: 5000, stockTotal: 100, stockSold: 73, estimatedDelivery: "2026年10月" },
    { id: "r3", projectId: "p1", title: "屋台オーナー権（1日）", description: "横丁の屋台を1日運営できる権利。", price: 30000, stockTotal: 20, stockSold: 18, estimatedDelivery: "2026年11月" },
  ],
  p3: [
    { id: "r4", projectId: "p3", title: "応援コース", description: "選手から感謝のメッセージ。", price: 2000, stockTotal: null, stockSold: 320, estimatedDelivery: "2026年9月" },
    { id: "r5", projectId: "p3", title: "サイン入りユニフォーム", description: "日本代表選手のサイン入り。", price: 20000, stockTotal: 50, stockSold: 50, estimatedDelivery: "2026年12月" },
  ],
};

export const DUMMY_UPDATES: Record<string, ProjectUpdate[]> = {
  p1: [
    { id: "u-1", projectId: "p1", title: "目標金額を達成しました！", body: "皆さまの応援のおかげで目標を達成できました。本当にありがとうございます。引き続きネクストゴールを目指します。", createdAt: ago(2) },
    { id: "u-2", projectId: "p1", title: "改装工事がスタートしました", body: "いよいよ横丁の改装に着手しました。進捗は随時ご報告します。", createdAt: ago(6) },
  ],
  p3: [
    { id: "u-3", projectId: "p3", title: "壮行会を開催しました", body: "多くの方にお集まりいただき、選手たちも気合が入っています。", createdAt: ago(3) },
  ],
};

export const DUMMY_COMMENTS: Record<string, Comment[]> = {
  p1: [
    { id: "c1", projectId: "p1", author: { id: "x1", displayName: "地元出身です" }, body: "子どもの頃に通った横丁が復活するなんて夢のようです。応援しています！", createdAt: ago(1) },
    { id: "c2", projectId: "p1", author: { id: "x2", displayName: "まちづくりファン" }, body: "こういう取り組みが全国に広がってほしい。微力ですが支援しました。", createdAt: ago(4) },
  ],
  p3: [
    { id: "c3", projectId: "p3", author: { id: "x3", displayName: "バスケ好き" }, body: "世界での活躍を楽しみにしています！", createdAt: ago(2) },
  ],
};
