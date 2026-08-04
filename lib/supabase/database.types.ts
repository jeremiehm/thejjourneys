import type { ArticleBlock, LayoutBlock } from "@/lib/blocks/types";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      authors: {
        Row: { id: string; name: string; slug: string; avatar_url: string | null; bio: string | null };
        Insert: { id?: string; name: string; slug: string; avatar_url?: string | null; bio?: string | null };
        Update: { id?: string; name?: string; slug?: string; avatar_url?: string | null; bio?: string | null };
        Relationships: [];
      };
      collections: {
        Row: {
          id: string;
          title: string;
          slug: string;
          description: string | null;
          cover_image_url: string | null;
          layout: LayoutBlock[] | Json;
          status: "draft" | "published";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          description?: string | null;
          cover_image_url?: string | null;
          layout?: LayoutBlock[] | Json;
          status?: "draft" | "published";
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["collections"]["Insert"]>;
        Relationships: [];
      };
      articles: {
        Row: {
          id: string;
          collection_id: string;
          author_id: string;
          title: string;
          slug: string;
          excerpt: string | null;
          meta_title: string | null;
          meta_description: string | null;
          og_image_url: string | null;
          canonical_url: string | null;
          noindex: boolean;
          lang: string;
          cover_image_url: string | null;
          cover_type: "banner" | "above_title" | "below_title";
          content: ArticleBlock[] | Json;
          status: "draft" | "published";
          published_at: string | null;
          position: number;
          view_count: number;
          like_count: number;
          created_at: string;
          updated_at: string;
          content_updated_at: string | null;
        };
        Insert: {
          id?: string;
          collection_id: string;
          author_id: string;
          title: string;
          slug: string;
          excerpt?: string | null;
          meta_title?: string | null;
          meta_description?: string | null;
          og_image_url?: string | null;
          canonical_url?: string | null;
          noindex?: boolean;
          lang?: string;
          cover_image_url?: string | null;
          cover_type?: "banner" | "above_title" | "below_title";
          content?: ArticleBlock[] | Json;
          status?: "draft" | "published";
          published_at?: string | null;
          position?: number;
          view_count?: number;
          like_count?: number;
          created_at?: string;
          updated_at?: string;
          content_updated_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["articles"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "articles_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "authors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "articles_collection_id_fkey";
            columns: ["collection_id"];
            isOneToOne: false;
            referencedRelation: "collections";
            referencedColumns: ["id"];
          },
        ];
      };
      article_redirects: {
        Row: {
          id: string;
          from_slug: string;
          to_slug: string;
          article_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          from_slug: string;
          to_slug: string;
          article_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["article_redirects"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "article_redirects_article_id_fkey";
            columns: ["article_id"];
            isOneToOne: false;
            referencedRelation: "articles";
            referencedColumns: ["id"];
          },
        ];
      };
      article_revisions: {
        Row: {
          id: string;
          article_id: string;
          title: string;
          excerpt: string | null;
          meta_description: string | null;
          content: ArticleBlock[] | Json;
          label: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          article_id: string;
          title: string;
          excerpt?: string | null;
          meta_description?: string | null;
          content: ArticleBlock[] | Json;
          label?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["article_revisions"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "article_revisions_article_id_fkey";
            columns: ["article_id"];
            isOneToOne: false;
            referencedRelation: "articles";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_agents: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          context: string;
          tone: string | null;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          context?: string;
          tone?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_agents"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      increment_article_view: {
        Args: { p_article_id: string };
        Returns: number;
      };
      toggle_article_like: {
        Args: { p_article_id: string; p_visitor_key: string };
        Returns: { liked: boolean; like_count: number };
      };
      get_article_liked: {
        Args: { p_article_id: string; p_visitor_key: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
