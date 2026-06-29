/**
 * Supabaseテーブルの型。schema.sql のカラムに対応。
 * 本来は `supabase gen types typescript` で自動生成できるが、
 * 接続前でも開発を進められるよう手書きで用意。
 * 接続後は自動生成版に置き換え可能（このファイルを差し替えるだけ）。
 */

export type ProjectStatusDB =
  | "draft" | "under_review" | "rejected"
  | "live" | "succeeded" | "failed" | "closed";
export type FundingTypeDB = "all_or_nothing" | "all_in";

export interface Database {
  public: {
    Tables: {
      public_profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: { id: string; display_name?: string; avatar_url?: string | null; bio?: string | null };
        Update: Partial<{ display_name: string; avatar_url: string | null; bio: string | null }>;
      };
      projects: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          slug: string;
          category: string;
          tags: string[];
          thumbnail_url: string | null;
          gallery: string[];
          story: string | null;
          goal_amount: number;
          current_amount: number;
          supporters_count: number;
          funding_type: FundingTypeDB;
          status: ProjectStatusDB;
          review_note: string | null;
          start_at: string | null;
          end_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      returns: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          description: string | null;
          price: number;
          stock_total: number | null;
          stock_sold: number;
          estimated_delivery: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      project_updates: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          body: string | null;
          created_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      comments: {
        Row: {
          id: string;
          project_id: string;
          author_id: string;
          body: string;
          created_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
    };
  };
}
