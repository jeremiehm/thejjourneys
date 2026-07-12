import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";
import { getArticles, getCollections } from "@/lib/data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [collections, articles] = await Promise.all([getCollections(), getArticles()]);
  return [
    { url: siteUrl, lastModified: new Date() },
    { url: `${siteUrl}/collections`, lastModified: new Date() },
    { url: `${siteUrl}/about`, lastModified: new Date() },
    ...collections.map((collection) => ({ url: `${siteUrl}/collections/${collection.slug}`, lastModified: new Date(collection.updated_at) })),
    ...articles.filter((article) => article.collection).map((article) => ({ url: `${siteUrl}/collections/${article.collection?.slug}/${article.slug}`, lastModified: new Date(article.updated_at) })),
  ];
}
