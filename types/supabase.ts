// types/supabase.ts
// Auto-generated for Sprint 10 schema additions
// Matches create_sprint10_schema.sql

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      consultations: {
        Row: {
          id: string;
          user_id: string;
          type: "AI" | "Video" | "Phone";
          items: Json | null;
          estimate_time: string | null; // interval as ISO string
          estimate_cost: number | null;
          status: "Pending Family Partner Approval" | "Approved" | "Rejected";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: "AI" | "Video" | "Phone";
          items?: Json | null;
          estimate_time?: string | null;
          estimate_cost?: number | null;
          status?: "Pending Family Partner Approval" | "Approved" | "Rejected";
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["consultations"]["Insert"]>;
      };

      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: "Milestone" | "Message" | "Invoice" | "System" | null;
          title: string;
          body: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type?: "Milestone" | "Message" | "Invoice" | "System" | null;
          title: string;
          body: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
      };

      invoices: {
        Row: {
          id: string;
          user_id: string;
          consultation_id: string | null;
          amount: number;
          status: "Paid" | "Pending" | "Overdue";
          due_date: string | null;
          file_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          consultation_id?: string | null;
          amount: number;
          status?: "Paid" | "Pending" | "Overdue";
          due_date?: string | null;
          file_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["invoices"]["Insert"]>;
      };

      message_threads: {
        Row: {
          id: string;
          user_id: string;
          partner_id: string | null;
          type: "General" | "Support" | "Tracking" | "Billing";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          partner_id?: string | null;
          type?: "General" | "Support" | "Tracking" | "Billing";
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["message_threads"]["Insert"]>;
      };

      messages: {
        Row: {
          id: string;
          user_id: string;
          thread_id: string | null;
          reply_to_id: string | null;
          body: string;
          attachment_urls: string[] | null;
          google_message_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          thread_id?: string | null;
          reply_to_id?: string | null;
          body: string;
          attachment_urls?: string[] | null;
          google_message_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["messages"]["Insert"]>;
      };

      job_tracking: {
        Row: {
          id: string;
          job_id: string;
          checklist: Json | null;
          fob_status: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          checklist?: Json | null;
          fob_status?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["job_tracking"]["Insert"]>;
      };
    };
  };
}