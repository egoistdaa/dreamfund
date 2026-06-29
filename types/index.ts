/**
 * ドメイン型定義。
 * ★差し替えやすさの肝: ダミーデータも将来のSupabaseデータも、
 *   この同じ型に従う。だからデータ取得元を変えても画面は無修正。
 *   命名・構造は schema.sql のカラムに合わせている。
 */

export type ProjectStatus =
  | "draft" | "under_review" | "rejected"
  | "live" | "succeeded" | "failed" | "closed";

export type FundingType = "all_or_nothing" | "all_in";

/** 公開プロフィール（public_profiles テーブル相当） */
export interface PublicProfile {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
}

/** リターン（returns テーブル相当） */
export interface Return {
  id: string;
  projectId: string;
  title: string;
  description?: string | null;
  price: number;
  stockTotal?: number | null;   // null = 無制限, 数値 = 限定◯個
  stockSold: number;
  estimatedDelivery?: string | null;
}

/** 活動報告（project_updates テーブル相当） */
export interface ProjectUpdate {
  id: string;
  projectId: string;
  title: string;
  body?: string | null;
  createdAt: string;
}

/** コメント（comments テーブル相当） */
export interface Comment {
  id: string;
  projectId: string;
  author?: PublicProfile;
  body: string;
  createdAt: string;
}

/** プロジェクト（projects テーブル相当） */
export interface Project {
  id: string;
  ownerId: string;
  owner?: PublicProfile;        // 結合して持つ（一覧表示用）
  title: string;
  slug: string;
  category: string;
  tags: string[];
  thumbnailUrl?: string | null;
  gallery: string[];
  story?: string | null;
  goalAmount: number;
  currentAmount: number;
  supportersCount: number;
  fundingType: FundingType;
  status: ProjectStatus;
  startAt?: string | null;
  endAt?: string | null;
  createdAt: string;
  // 詳細ページ用（任意で同梱）
  returns?: Return[];
  updates?: ProjectUpdate[];
}

/** カード等で使う表示用バッジ。緊急感・人気感の演出に使う。 */
export type BadgeKind = "hot" | "no1" | "new" | "soon" | "success" | "cat" | "limited";

/** 一覧の並び替え種別 */
export type SortKey = "recommended" | "trending" | "popular" | "new" | "ending" | "almost";
