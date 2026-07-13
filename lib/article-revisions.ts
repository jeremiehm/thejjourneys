import type { ArticleBlock } from "@/lib/blocks/types";
import type { Json } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ArticleRevision = {
  id: string;
  article_id: string;
  title: string;
  excerpt: string | null;
  meta_description: string | null;
  content: ArticleBlock[];
  label: string | null;
  created_at: string;
};

const MAX_REVISIONS_PER_ARTICLE = 50;

export async function createArticleRevision(
  articleId: string,
  snapshot: {
    title: string;
    excerpt: string | null;
    meta_description: string | null;
    content: ArticleBlock[];
  },
  label: string,
): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: inserted, error } = await supabase
    .from("article_revisions")
    .insert({
      article_id: articleId,
      title: snapshot.title,
      excerpt: snapshot.excerpt,
      meta_description: snapshot.meta_description,
      content: snapshot.content as unknown as Json,
      label,
    })
    .select("id")
    .single();

  if (error || !inserted) return null;

  const { data: oldRevisions } = await supabase
    .from("article_revisions")
    .select("id")
    .eq("article_id", articleId)
    .order("created_at", { ascending: false })
    .range(MAX_REVISIONS_PER_ARTICLE, MAX_REVISIONS_PER_ARTICLE + 20);

  if (oldRevisions?.length) {
    await supabase
      .from("article_revisions")
      .delete()
      .in(
        "id",
        oldRevisions.map((r) => r.id),
      );
  }

  return inserted.id;
}

export async function getArticleRevisions(articleId: string): Promise<ArticleRevision[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("article_revisions")
    .select("*")
    .eq("article_id", articleId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (data ?? []).map((row) => ({
    ...row,
    content: row.content as unknown as ArticleBlock[],
  }));
}
