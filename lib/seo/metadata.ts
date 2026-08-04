import type { Metadata } from "next";
import type { Article, ArticleBlock } from "@/lib/blocks/types";
import { SITE_URL } from "@/lib/env";
import { getArticleCoverUrl } from "@/lib/data";

const DEFAULT_OG_IMAGE = `${SITE_URL}/icon.png`;

/** Strip light markdown syntax for description fallbacks. */
export function stripMarkdownLite(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]+`/g, " ")
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/^>{1,}\s*/gm, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~]+/g, "")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function firstTextBlockPlain(blocks: ArticleBlock[], maxLen = 155): string {
  for (const block of blocks) {
    if (block.type === "text" && block.data.markdown?.trim()) {
      const plain = stripMarkdownLite(block.data.markdown);
      if (!plain) continue;
      return plain.length > maxLen ? `${plain.slice(0, maxLen - 1).trimEnd()}…` : plain;
    }
  }
  return "";
}

export function articleAbsoluteUrl(article: Article): string {
  const collectionSlug = article.collection?.slug;
  if (!collectionSlug) return SITE_URL;
  return `${SITE_URL}/collections/${collectionSlug}/${article.slug}`;
}

export function resolveArticleTitle(article: Article): string {
  return article.meta_title?.trim() || article.title;
}

export function resolveArticleDescription(article: Article): string {
  return (
    article.meta_description?.trim() ||
    article.excerpt?.trim() ||
    firstTextBlockPlain(article.content) ||
    ""
  );
}

export function resolveArticleCanonical(article: Article): string {
  return article.canonical_url?.trim() || articleAbsoluteUrl(article);
}

export function resolveArticleOgImage(article: Article): string {
  return article.og_image_url?.trim() || getArticleCoverUrl(article) || DEFAULT_OG_IMAGE;
}

export function buildArticleMetadata(article: Article): Metadata {
  const title = resolveArticleTitle(article);
  const description = resolveArticleDescription(article) || undefined;
  const canonical = resolveArticleCanonical(article);
  const image = resolveArticleOgImage(article);
  const authors = article.author?.name ? [article.author.name] : ["Dot On The Map"];

  return {
    title,
    description,
    alternates: { canonical },
    robots: article.noindex
      ? { index: false, follow: true }
      : { index: true, follow: true },
    openGraph: {
      type: "article",
      title,
      description,
      url: canonical,
      siteName: "Dot On The Map",
      images: [{ url: image }],
      publishedTime: article.published_at ?? undefined,
      modifiedTime: article.content_updated_at ?? article.published_at ?? undefined,
      authors,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
