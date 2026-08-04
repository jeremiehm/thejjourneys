import type { Article } from "@/lib/blocks/types";
import { SITE_URL } from "@/lib/env";
import {
  articleAbsoluteUrl,
  resolveArticleCanonical,
  resolveArticleDescription,
  resolveArticleOgImage,
  resolveArticleTitle,
} from "@/lib/seo/metadata";

export type BreadcrumbItem = { name: string; path: string };

function absolute(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${SITE_URL}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

export function buildArticleJsonLd(article: Article) {
  const headline = resolveArticleTitle(article).slice(0, 110);
  const description = resolveArticleDescription(article);
  const canonical = resolveArticleCanonical(article);
  const image = resolveArticleOgImage(article);

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline,
    description: description || undefined,
    image: [image],
    datePublished: article.published_at ?? undefined,
    dateModified: article.content_updated_at ?? article.published_at ?? undefined,
    author: {
      "@type": "Person",
      name: article.author?.name ?? "Jeremie",
      url: article.author?.slug ? absolute(`/`) : undefined,
    },
    publisher: {
      "@type": "Organization",
      name: "Dot On The Map",
      logo: {
        "@type": "ImageObject",
        url: absolute("/icon.png"),
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonical,
    },
    url: articleAbsoluteUrl(article),
  };
}

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absolute(item.path),
    })),
  };
}

export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Dot On The Map",
    url: SITE_URL,
    logo: absolute("/icon.png"),
    sameAs: [] as string[],
  };
}
