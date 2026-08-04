import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleCard } from "@/components/public/article-card";
import { ArticleCover } from "@/components/public/article-cover";
import { BlockRenderer } from "@/components/public/block-renderer";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { ArticleEngagement } from "@/components/public/article-engagement";
import { getArticleBySlug, getArticleCoverUrl, getArticleNavigation } from "@/lib/data";
import { estimateReadingTime } from "@/lib/reading-time";
import { buildArticleMetadata } from "@/lib/seo/metadata";
import { buildArticleJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo/structured-data";
import { formatDate } from "@/lib/utils";

type PageProps = { params: Promise<{ slug: string; articleSlug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, articleSlug } = await params;
  const article = await getArticleBySlug(slug, articleSlug);
  if (!article) return { title: "Article not found" };
  return buildArticleMetadata(article);
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug, articleSlug } = await params;
  const article = await getArticleBySlug(slug, articleSlug);
  if (!article || !article.collection) notFound();
  const nav = await getArticleNavigation(article.collection_id, article.id);
  const readingTime = estimateReadingTime(article.content);
  const coverType = article.cover_type ?? "banner";
  const coverUrl = getArticleCoverUrl(article);
  const modifiedAt = article.content_updated_at ?? article.published_at ?? article.updated_at;

  const jsonLd = [
    buildArticleJsonLd(article),
    buildBreadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: article.collection.title, path: `/collections/${article.collection.slug}` },
      {
        name: article.title,
        path: `/collections/${article.collection.slug}/${article.slug}`,
      },
    ]),
  ];

  return (
    <>
      <SiteHeader />
      <main>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <article>
          <header className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
            <nav aria-label="Breadcrumb" className="text-sm text-stone-500">
              <ol className="flex flex-wrap items-center gap-2">
                <li>
                  <Link href="/" className="hover:text-amber-700">
                    Home
                  </Link>
                </li>
                <li aria-hidden>/</li>
                <li>
                  <Link
                    href={`/collections/${article.collection.slug}`}
                    className="hover:text-amber-700"
                  >
                    {article.collection.title}
                  </Link>
                </li>
                <li aria-hidden>/</li>
                <li className="text-stone-800">{article.title}</li>
              </ol>
            </nav>
            {coverType === "above_title" ? (
              <div className="mt-8">
                <ArticleCover url={coverUrl} type="above_title" title={article.title} priority />
              </div>
            ) : null}
            <h1 className="mt-5 max-w-4xl text-5xl font-semibold tracking-wide text-stone-950 sm:text-7xl">
              {article.title}
            </h1>
            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-stone-600">
              <span>{article.author?.name ?? "Dot On The Map"}</span>
              {article.published_at ? (
                <>
                  <span>•</span>
                  <time dateTime={article.published_at}>Published {formatDate(article.published_at)}</time>
                </>
              ) : null}
              {modifiedAt ? (
                <>
                  <span>•</span>
                  <time dateTime={modifiedAt}>Updated {formatDate(modifiedAt)}</time>
                </>
              ) : null}
              <span>•</span>
              <span>{readingTime} min read</span>
            </div>
            <ArticleEngagement
              articleId={article.id}
              initialViewCount={article.view_count}
              initialLikeCount={article.like_count}
            />
            {article.excerpt ? (
              <p className="mt-6 max-w-3xl text-xl leading-8 text-stone-600">{article.excerpt}</p>
            ) : null}
            {coverType === "below_title" ? (
              <div className="mt-8">
                <ArticleCover url={coverUrl} type="below_title" title={article.title} priority />
              </div>
            ) : null}
          </header>
          {coverType === "banner" ? (
            <ArticleCover url={coverUrl} type="banner" title={article.title} priority />
          ) : null}
          <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
            <BlockRenderer blocks={article.content} />
          </div>
        </article>
        <nav className="mx-auto grid max-w-6xl gap-6 px-4 pb-16 sm:px-6 md:grid-cols-2 lg:px-8">
          {nav.previous ? (
            <div>
              <p className="mb-3 text-sm uppercase tracking-[0.2em] text-stone-500">Previous</p>
              <ArticleCard article={nav.previous} />
            </div>
          ) : (
            <div />
          )}
          {nav.next ? (
            <div>
              <p className="mb-3 text-sm uppercase tracking-[0.2em] text-stone-500">Next</p>
              <ArticleCard article={nav.next} />
            </div>
          ) : null}
        </nav>
      </main>
      <SiteFooter />
    </>
  );
}
