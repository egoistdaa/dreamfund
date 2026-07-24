/**
 * Supabase繝・・繝悶Ν縺ｮ蝙九Ｔchema.sql 縺ｮ繧ｫ繝ｩ繝縺ｫ蟇ｾ蠢懊・ * supabase-js 縺悟梛繧呈ｭ｣縺励￥隗｣豎ｺ縺吶ｋ縺溘ａ縲ヽelationships / Views / Functions /
 * Enums / CompositeTypes 繧ょｮ夂ｾｩ縺励※縺・ｋ縲・ */

export type ProjectStatusDB =
  | "draft"
  | "under_review"
  | "rejected"
  | "live"
  | "succeeded"
  | "failed"
  | "closed";

export type FundingTypeDB = "all_or_nothing" | "all_in";

export type PledgeStatusDB =
  | "pending"
  | "paid"
  | "refunded"
  | "failed";

export type RefundStatusDB =
  | "requested"
  | "approved"
  | "processing"
  | "done"
  | "rejected";

export type ProjectSettlementStatusDB =
  | "checking"
  | "waiting_for_payments"
  | "locked_succeeded"
  | "locked_failed"
  | "refunding"
  | "completed"
  | "manual_review";

export type SupportMessageTypeDB =
  | "support"
  | "creator_reply";
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SubmissionReturn = {
  title: string;
  price: number;
  description: string | null;
};

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
      profiles_private: {
        Row: {
          id: string;
          role: "user" | "creator" | "reviewer" | "admin";
          kyc_status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: "user" | "creator" | "reviewer" | "admin";
        };
        Update: {
          role?: "user" | "creator" | "reviewer" | "admin";
        };
        Relationships: [];
      };
            notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          payload: Json | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          payload?: Json | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          type?: string;
          payload?: Json | null;
          read_at?: string | null;
          created_at?: string;
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
        Update: Partial<
          Database["public"]["Tables"]["returns"]["Insert"]
        >;
        Relationships: [];
      };

      pledges: {
        Row: {
          id: string;
          project_id: string;
          backer_id: string;
          return_id: string | null;
          amount: number;
          fee_amount: number;
          status: PledgeStatusDB;
          stripe_payment_intent_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          project_id: string;
          backer_id: string;
          amount: number;
          return_id?: string | null;
          fee_amount?: number;
          status?: PledgeStatusDB;
          stripe_payment_intent_id?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["pledges"]["Insert"]
        >;
        Relationships: [];
      };
      project_settlements: {
        Row: {
          id: string;
          project_id: string;
          status: ProjectSettlementStatusDB;
          final_status: ProjectStatusDB | null;
          unresolved_payment_count: number;
          locked_current_amount: number | null;
          locked_supporters_count: number | null;
          last_checked_at: string | null;
          next_check_at: string | null;
          settlement_locked_at: string | null;
          refund_eligible_at: string | null;
          attempt_count: number;
          last_error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          status?: ProjectSettlementStatusDB;
          final_status?: ProjectStatusDB | null;
          unresolved_payment_count?: number;
          locked_current_amount?: number | null;
          locked_supporters_count?: number | null;
          last_checked_at?: string | null;
          next_check_at?: string | null;
          settlement_locked_at?: string | null;
          refund_eligible_at?: string | null;
          attempt_count?: number;
          last_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["project_settlements"]["Insert"]
        >;
        Relationships: [];
      };
      refunds: {
        Row: {
          id: string;
          pledge_id: string;
          project_id: string;
          reason: string | null;
          amount: number;
          status: RefundStatusDB;
          stripe_refund_id: string | null;
          idempotency_key: string;
          stripe_status: string | null;
          processed_by: string | null;
          attempt_count: number;
          last_error: string | null;
          next_retry_at: string | null;
          approved_at: string | null;
          processing_started_at: string | null;
          succeeded_at: string | null;
          manual_review_required: boolean;
          manual_review_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pledge_id: string;
          project_id: string;
          reason?: string | null;
          amount: number;
          status?: RefundStatusDB;
          stripe_refund_id?: string | null;
          idempotency_key: string;
          stripe_status?: string | null;
          processed_by?: string | null;
          attempt_count?: number;
          last_error?: string | null;
          next_retry_at?: string | null;
          approved_at?: string | null;
          processing_started_at?: string | null;
          succeeded_at?: string | null;
          manual_review_required?: boolean;
          manual_review_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["refunds"]["Insert"]
        >;
        Relationships: [];
      };

      support_conversations: {
        Row: {
          id: string;
          project_id: string;
          backer_id: string;
          created_at: string;
          updated_at: string;
          last_message_at: string;
          creator_last_read_at: string | null;
          backer_last_read_at: string | null;
        };
        Insert: {
          project_id: string;
          backer_id: string;
          created_at?: string;
          updated_at?: string;
          last_message_at?: string;
          creator_last_read_at?: string | null;
          backer_last_read_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["support_conversations"]["Insert"]
        >;
        Relationships: [];
      };

      support_messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          message_type: SupportMessageTypeDB;
          body: string;
          created_at: string;
        };
        Insert: {
          conversation_id: string;
          sender_id: string;
          message_type: SupportMessageTypeDB;
          body: string;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["support_messages"]["Insert"]
        >;
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

      project_submissions: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          category: string;
          goal_amount: number;
          summary: string;
          story: string;
          returns: SubmissionReturn[];
          cover_image_url: string | null;
          status: string;
          created_at: string;
          updated_at: string;
          published_project_id: string | null;
          published_seen_at: string | null;
        };
        Insert: {
          user_id: string;
          title: string;
          category: string;
          goal_amount: number;
          summary: string;
          story: string;
          returns: SubmissionReturn[];
          cover_image_url?: string | null;
          status?: string;
          published_project_id?: string | null;
          published_seen_at?: string | null;
        };
        Update: Record<string, unknown>;
        Relationships: [];
        published_project_id?: string | null;
        published_seen_at?: string | null;
      };
    };

    Views: Record<string, never>;
    Functions: {
      create_pending_pledge: {
        Args: {
          p_project_slug: string;
          p_return_id: string;
        };
        Returns: {
          pledge_id: string;
          amount: number;
        }[];
      };
      finalize_expired_projects: {
  Args: Record<PropertyKey, never>;
  Returns: {
    project_id: string;
    finalized_status: ProjectStatusDB;
  }[];
};

      send_support_message: {
        Args: {
          p_project_slug: string;
          p_body: string;
        };
        Returns: {
          conversation_id: string;
          message_id: string;
        }[];
      };

      reply_to_support_message: {
        Args: {
          p_conversation_id: string;
          p_body: string;
        };
        Returns: {
          conversation_id: string;
          message_id: string;
        }[];
      };
           mark_notification_read: {
        Args: {
          p_notification_id: string;
        };
        Returns: undefined;
      };
mark_backer_support_conversation_read: {
  Args: {
    p_conversation_id: string;
  };
  Returns: undefined;
};
      mark_support_conversation_read: {
        Args: {
          p_conversation_id: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      project_status: ProjectStatusDB;
      funding_type: FundingTypeDB;
    };
    CompositeTypes: Record<string, never>;
  };
}
