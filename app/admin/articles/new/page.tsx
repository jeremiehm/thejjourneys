import { NotionArticlePage } from "@/components/admin/NotionArticlePage";
import { getArticles, getAuthors, getCollections } from "@/lib/data";

export default async function NewArticlePage() {
  const [collections, authors, allArticles] = await Promise.all([
    getCollections({ includeDrafts: true }),
    getAuthors(),
    getArticles({ includeDrafts: true }),
  ]);

  const siblingArticles = allArticles
    .filter((a) => a.collection)
    .map((a) => ({
      title: a.title,
      slug: a.slug,
      collectionSlug: a.collection!.slug,
      excerpt: a.excerpt,
    }));

  return (
    <NotionArticlePage collections={collections} authors={authors} siblingArticles={siblingArticles} revisions={[]} />
  );
}
