import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { hasSupabaseEnv, supabaseEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

export type ArticleRedirectLookup = {
  from_slug: string;
  to_slug: string;
  article_id: string;
  collection_slug: string | null;
};

type CacheState = {
  byFromSlug: Map<string, ArticleRedirectLookup>;
  loadedAt: number;
};

const CACHE_TTL_MS = 60_000;
let cache: CacheState | null = null;

function createAnonClient(): SupabaseClient<Database> | null {
  if (!hasSupabaseEnv() || !supabaseEnv.url || !supabaseEnv.key) return null;
  return createClient<Database>(supabaseEnv.url, supabaseEnv.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function loadRedirectCache(): Promise<CacheState> {
  const supabase = createAnonClient();
  const byFromSlug = new Map<string, ArticleRedirectLookup>();
  if (!supabase) return { byFromSlug, loadedAt: Date.now() };

  const { data: redirects } = await supabase
    .from("article_redirects")
    .select("from_slug, to_slug, article_id");

  if (!redirects?.length) return { byFromSlug, loadedAt: Date.now() };

  const articleIds = [...new Set(redirects.map((row) => row.article_id))];
  const { data: articles } = await supabase
    .from("articles")
    .select("id, collections(slug)")
    .in("id", articleIds);

  const collectionByArticle = new Map<string, string>();
  for (const article of articles ?? []) {
    const collection = article.collections as { slug?: string } | { slug?: string }[] | null;
    const slug = Array.isArray(collection) ? collection[0]?.slug : collection?.slug;
    if (slug) collectionByArticle.set(article.id, slug);
  }

  for (const row of redirects) {
    byFromSlug.set(row.from_slug, {
      from_slug: row.from_slug,
      to_slug: row.to_slug,
      article_id: row.article_id,
      collection_slug: collectionByArticle.get(row.article_id) ?? null,
    });
  }

  return { byFromSlug, loadedAt: Date.now() };
}

/**
 * In-memory redirect map, refreshed every 60s (or on cold miss).
 * Chosen over per-request DB hits: the redirect set is tiny for this blog,
 * middleware runs on every matched article path, and a short TTL keeps
 * newly published slug changes visible within a minute without edge KV.
 */
export async function getArticleRedirect(fromSlug: string): Promise<ArticleRedirectLookup | null> {
  const now = Date.now();
  if (!cache || now - cache.loadedAt > CACHE_TTL_MS) {
    cache = await loadRedirectCache();
  }
  return cache.byFromSlug.get(fromSlug) ?? null;
}

export function invalidateArticleRedirectCache() {
  cache = null;
}

/**
 * Record a slug change without creating chains:
 * - Any redirect that pointed at `fromSlug` is retargeted to `toSlug`
 * - Upsert `fromSlug` → `toSlug`
 */
export async function recordArticleSlugRedirect(
  supabase: SupabaseClient<Database>,
  input: { articleId: string; fromSlug: string; toSlug: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { articleId, fromSlug, toSlug } = input;
  if (!fromSlug || !toSlug || fromSlug === toSlug) return { ok: true };

  const retarget = await supabase
    .from("article_redirects")
    .update({ to_slug: toSlug })
    .eq("to_slug", fromSlug);
  if (retarget.error) return { ok: false, error: retarget.error.message };

  await supabase.from("article_redirects").delete().eq("from_slug", toSlug);

  const upsert = await supabase.from("article_redirects").upsert(
    {
      from_slug: fromSlug,
      to_slug: toSlug,
      article_id: articleId,
    },
    { onConflict: "from_slug" },
  );
  if (upsert.error) return { ok: false, error: upsert.error.message };

  invalidateArticleRedirectCache();
  return { ok: true };
}
