import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";
import { getArticles, getCollections } from "@/lib/data";

// Article routes use noStore() → dynamic. Sitemap revalidates hourly so
// content_updated_at changes appear without rebuilding the whole app.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // If the site ever exceeds 50,000 URLs, split into a sitemap index.
  const [collections, articles] = await Promise.all([getCollections(), getArticles()]);

  const indexableArticles = articles.filter(
    (article) => article.collection && !article.noindex && article.status === "published",
  );

  return [
    { url: siteUrl, lastModified: new Date() },
    { url: `${siteUrl}/collections`, lastModified: new Date() },
    { url: `${siteUrl}/about`, lastModified: new Date() },
    ...collections.map((collection) => ({
      url: `${siteUrl}/collections/${collection.slug}`,
      lastModified: new Date(collection.updated_at),
    })),
    ...indexableArticles.map((article) => ({
      url: `${siteUrl}/collections/${article.collection?.slug}/${article.slug}`,
      lastModified: new Date(
        article.content_updated_at ?? article.published_at ?? article.updated_at,
      ),
    })),
  ];
}
