import { unstable_noStore as noStore } from "next/cache";
import type { Article, Author, Collection } from "@/lib/blocks/types";
import { parseArticleContent, parseCollectionLayout } from "@/lib/blocks/validation";
import { demoArticles, demoAuthors, demoCollections } from "@/lib/demo-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function logSupabaseReadError(scope: string, error: unknown) {
  if (process.env.NODE_ENV === "development") {
    console.error(`[${scope}]`, error);
  }
}

function filterDemoCollections(includeDrafts?: boolean) {
  return demoCollections.filter((collection) => includeDrafts || collection.status === "published");
}

function filterDemoArticles(options: { includeDrafts?: boolean; collectionId?: string; limit?: number } = {}) {
  let articles = demoArticles.map(withDemoRelations);
  if (!options.includeDrafts) articles = articles.filter(isVisibleOnPublicSite);
  if (options.collectionId) articles = articles.filter((article) => article.collection_id === options.collectionId);
  articles = articles.sort(
    (a, b) => a.position - b.position || +new Date(b.published_at ?? b.created_at) - +new Date(a.published_at ?? a.created_at),
  );
  return options.limit ? articles.slice(0, options.limit) : articles;
}

type CollectionRow = Omit<Collection, "layout"> & { layout: unknown };
type ArticleRow = Omit<Article, "content" | "author" | "collection"> & {
  content: unknown;
  meta_description?: string | null;
  lang?: string;
  authors?: Author | null;
  collections?: CollectionRow | null;
};

function mapCollection(row: CollectionRow): Collection {
  return { ...row, layout: parseCollectionLayout(row.layout) };
}

function mapArticle(row: ArticleRow): Article {
  return {
    ...row,
    meta_title: row.meta_title ?? null,
    meta_description: row.meta_description ?? null,
    og_image_url: row.og_image_url ?? null,
    canonical_url: row.canonical_url ?? null,
    noindex: row.noindex ?? false,
    lang: row.lang ?? "en",
    cover_type: row.cover_type ?? "banner",
    view_count: row.view_count ?? 0,
    like_count: row.like_count ?? 0,
    content_updated_at: row.content_updated_at ?? row.updated_at ?? null,
    content: parseArticleContent(row.content),
    author: row.authors ?? null,
    collection: row.collections ? mapCollection(row.collections) : null,
  };
}

function withDemoRelations(article: Article): Article {
  return {
    ...article,
    author: article.author ?? demoAuthors.find((author) => author.id === article.author_id) ?? null,
    collection: article.collection ?? demoCollections.find((collection) => collection.id === article.collection_id) ?? null,
  };
}

/** Article visible sur le site public : publié et dans une collection publiée. */
export function isVisibleOnPublicSite(article: Article): boolean {
  return article.status === "published" && article.collection?.status === "published";
}

/** Couverture explicite ou première image trouvée dans le contenu. */
export function getArticleCoverUrl(article: Article): string | null {
  if (article.cover_image_url?.trim()) return article.cover_image_url;
  for (const block of article.content) {
    if (block.type === "image" && block.data.url?.trim()) return block.data.url;
    if (block.type === "gallery") {
      const first = block.data.images.find((img) => img.url?.trim());
      if (first?.url) return first.url;
    }
  }
  return null;
}

export async function getAuthors(): Promise<Author[]> {
  noStore();
  const supabase = await createSupabaseServerClient();
  if (!supabase) return demoAuthors;
  try {
    const { data, error } = await supabase.from("authors").select("*").order("name");
    if (error) {
      logSupabaseReadError("getAuthors", error.message);
      return [];
    }
    return data ?? [];
  } catch (error) {
    logSupabaseReadError("getAuthors", error);
    return [];
  }
}

export async function getCollections(options: { includeDrafts?: boolean } = {}): Promise<Collection[]> {
  noStore();
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return filterDemoCollections(options.includeDrafts);
  }

  try {
    let query = supabase.from("collections").select("*").order("created_at", { ascending: false });
    if (!options.includeDrafts) query = query.eq("status", "published");
    const { data, error } = await query;
    if (error) {
      logSupabaseReadError("getCollections", error.message);
      return [];
    }
    return (data ?? []).map((row) => mapCollection(row as CollectionRow));
  } catch (error) {
    logSupabaseReadError("getCollections", error);
    return [];
  }
}

export async function getCollectionBySlug(slug: string, options: { includeDrafts?: boolean } = {}) {
  const collections = await getCollections(options);
  return collections.find((collection) => collection.slug === slug) ?? null;
}

export async function getCollectionById(id: string) {
  const collections = await getCollections({ includeDrafts: true });
  return collections.find((collection) => collection.id === id) ?? null;
}

export async function getArticles(options: { includeDrafts?: boolean; collectionId?: string; limit?: number } = {}): Promise<Article[]> {
  noStore();
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return filterDemoArticles(options);
  }

  let query = supabase
    .from("articles")
    .select("*, authors(*), collections(*)")
    .order("position", { ascending: true })
    .order("published_at", { ascending: false, nullsFirst: false });
  if (!options.includeDrafts) query = query.eq("status", "published");
  if (options.collectionId) query = query.eq("collection_id", options.collectionId);
  if (options.limit) query = query.limit(options.limit);

  try {
    const { data, error } = await query;
    if (error) {
      logSupabaseReadError("getArticles", error.message);
      return [];
    }
    const articles = (data ?? []).map((row) => mapArticle(row as ArticleRow));
    if (options.includeDrafts) return articles;
    return articles.filter(isVisibleOnPublicSite);
  } catch (error) {
    logSupabaseReadError("getArticles", error);
    return [];
  }
}

export async function getArticleBySlug(collectionSlug: string, articleSlug: string, options: { includeDrafts?: boolean } = {}) {
  noStore();
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    const articles = await getArticles({ includeDrafts: options.includeDrafts });
    return (
      articles.find(
        (article) => article.slug === articleSlug && article.collection?.slug === collectionSlug,
      ) ?? null
    );
  }

  let query = supabase
    .from("articles")
    .select("*, authors(*), collections(*)")
    .eq("slug", articleSlug);

  if (!options.includeDrafts) {
    query = query.eq("status", "published");
  }

  try {
    const { data, error } = await query.maybeSingle();
    if (error) {
      logSupabaseReadError("getArticleBySlug", error.message);
      return null;
    }
    if (!data) return null;

    const article = mapArticle(data as ArticleRow);
    if (article.collection?.slug !== collectionSlug) return null;
    if (!options.includeDrafts && !isVisibleOnPublicSite(article)) return null;
    return article;
  } catch (error) {
    logSupabaseReadError("getArticleBySlug", error);
    return null;
  }
}

export async function getArticleById(id: string) {
  const articles = await getArticles({ includeDrafts: true });
  return articles.find((article) => article.id === id) ?? null;
}

export async function getDashboardStats() {
  const [collections, articles] = await Promise.all([
    getCollections({ includeDrafts: true }),
    getArticles({ includeDrafts: true }),
  ]);

  return {
    totalCollections: collections.length,
    totalArticles: articles.length,
    drafts: collections.filter((collection) => collection.status === "draft").length + articles.filter((article) => article.status === "draft").length,
    recentArticles: [...articles].sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at)).slice(0, 5),
  };
}

export async function getArticleNavigation(collectionId: string, currentArticleId: string) {
  const articles = await getArticles({ collectionId });
  const index = articles.findIndex((article) => article.id === currentArticleId);
  return {
    previous: index > 0 ? articles[index - 1] : null,
    next: index >= 0 && index < articles.length - 1 ? articles[index + 1] : null,
  };
}
