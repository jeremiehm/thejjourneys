import { notFound } from "next/navigation";
import { NotionArticlePage } from "@/components/admin/NotionArticlePage";
import { getAiAgents } from "@/lib/ai/agents";
import { getArticleRevisions } from "@/lib/article-revisions";
import { getArticleById, getArticles, getAuthors, getCollections } from "@/lib/data";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditArticleNotionPage({ params }: PageProps) {
  const { id } = await params;
  const [article, collections, authors, allArticles, revisions, agents] = await Promise.all([
    getArticleById(id),
    getCollections({ includeDrafts: true }),
    getAuthors(),
    getArticles({ includeDrafts: true }),
    getArticleRevisions(id),
    getAiAgents(),
  ]);
  if (!article) notFound();

  const siblingArticles = allArticles
    .filter((a) => a.id !== id && a.collection)
    .map((a) => ({
      title: a.title,
      slug: a.slug,
      collectionSlug: a.collection!.slug,
      excerpt: a.excerpt,
    }));

  return (
    <NotionArticlePage
      article={article}
      collections={collections}
      authors={authors}
      siblingArticles={siblingArticles}
      revisions={revisions}
      agents={agents}
    />
  );
}
