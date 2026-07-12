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

const AUTOSAVE_REVISION_INTERVAL_MS = 3 * 60 * 1000;
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
  options?: { throttleAutosave?: boolean },
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return;

  if (options?.throttleAutosave && label === "Autosave") {
    const { data: last } = await supabase
      .from("article_revisions")
      .select("created_at")
      .eq("article_id", articleId)
      .eq("label", "Autosave")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (last?.created_at) {
      const elapsed = Date.now() - new Date(last.created_at).getTime();
      if (elapsed < AUTOSAVE_REVISION_INTERVAL_MS) return;
    }
  }

  await supabase.from("article_revisions").insert({
    article_id: articleId,
    title: snapshot.title,
    excerpt: snapshot.excerpt,
    meta_description: snapshot.meta_description,
    content: snapshot.content as unknown as Json,
    label,
  });

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
}

export async function getArticleRevisions(articleId: string): Promise<ArticleRevision[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("article_revisions")
    .select("*")
    .eq("article_id", articleId)
    .order("created_at", { ascending: false })
    .limit(30);

  return (data ?? []).map((row) => ({
    ...row,
    content: row.content as unknown as ArticleBlock[],
  }));
}
