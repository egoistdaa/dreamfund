/**
 * Supabaseテーブルの型。schema.sql のカラムに対応。
 * supabase-js が型を正しく解決するため、Relationships / Views / Functions /
 * Enums / CompositeTypes も定義している。
 */

export type ProjectStatusDB =
  | "draft"
  | "under_review"
  | "rejected"
  | "live"
  | "succeeded"
  | "failed"
  | "closed";

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
        Insert: {
          id: string;
          display_name?: string;
          avatar_url?: string | null;
          bio?: string | null;
        };
        Update: {
          display_name?: string;
          avatar_url?: string | null;
          bio?: string | null;
        };
        Relationships: [];
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
        Insert: {
          owner_id: string;
          title: string;
          slug: string;
          category: string;
          goal_amount: number;
          tags?: string[];
          thumbnail_url?: string | null;
          gallery?: string[];
          story?: string | null;
          funding_type?: FundingTypeDB;
          status?: ProjectStatusDB;
          start_at?: string | null;
          end_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["projects"]["Insert"]>;
        Relationships: [];
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
        Insert: {
          project_id: string;
          title: string;
          price: number;
          description?: string | null;
          stock_total?: number | null;
          stock_sold?: number;
          estimated_delivery?: string | null;
          sort_order?: number;
        };
        Update: Partial<Database["public"]["Tables"]["returns"]["Insert"]>;
        Relationships: [];
      };

      project_updates: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          body: string | null;
          created_at: string;
        };
        Insert: {
          project_id: string;
          title: string;
          body?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["project_updates"]["Insert"]>;
        Relationships: [];
      };

      comments: {
        Row: {
          id: string;
          project_id: string;
          author_id: string;
          body: string;
          created_at: string;
        };
        Insert: {
          project_id: string;
          author_id: string;
          body: string;
        };
        Update: Partial<Database["public"]["Tables"]["comments"]["Insert"]>;
        Relationships: [];
      };

      favorites: {
        Row: {
          user_id: string;
          project_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          project_id: string;
        };
        Update: {
          user_id?: string;
          project_id?: string;
        };
        Relationships: [];
      };
    };

    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      project_status: ProjectStatusDB;
      funding_type: FundingTypeDB;
    };
    CompositeTypes: Record<string, never>;
  };
}