import type { Article, ArticleBlock } from "@/lib/blocks/types";

export type SeoCheckStatus = "pass" | "warn" | "fail";

export type SeoCheckResult = {
  id: string;
  status: SeoCheckStatus;
  message: string;
  /** Optional focus target: field name or block id */
  focus?: string;
};

export type ArticleSeoInput = {
  title: string;
  slug: string;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImageUrl: string | null;
  coverImageUrl: string | null;
  noindex: boolean;
  content: ArticleBlock[];
};

function walkBlocks(blocks: ArticleBlock[], visit: (block: ArticleBlock) => void) {
  for (const block of blocks) {
    visit(block);
    if (block.type === "row") {
      for (const slot of block.data.children) walkBlocks([slot.block], visit);
    }
  }
}

function collectMarkdown(blocks: ArticleBlock[]): string {
  const parts: string[] = [];
  walkBlocks(blocks, (block) => {
    if (block.type === "text") parts.push(block.data.markdown ?? "");
  });
  return parts.join("\n");
}

function headingLevelsFromMarkdown(markdown: string): number[] {
  const levels: number[] = [];
  for (const line of markdown.split(/\r?\n/)) {
    const match = /^(#{1,6})\s+\S/.exec(line);
    if (match?.[1]) levels.push(match[1].length);
  }
  return levels;
}

function countInternalLinks(markdown: string): number {
  const matches = markdown.match(/\[[^\]]+\]\((\/[^)\s]+)\)/g) ?? [];
  return matches.length;
}

export function checkSlug(slug: string): SeoCheckResult {
  if (!slug.trim()) {
    return { id: "slug", status: "fail", message: "Slug is empty.", focus: "slug" };
  }
  return { id: "slug", status: "pass", message: "Slug is set." };
}

export function checkTitle(title: string): SeoCheckResult {
  if (!title.trim()) {
    return { id: "title", status: "fail", message: "Title is empty.", focus: "title" };
  }
  return { id: "title", status: "pass", message: "Title is set." };
}

export function checkSingleH1(content: ArticleBlock[]): SeoCheckResult {
  const markdown = collectMarkdown(content);
  const h1Count = (markdown.match(/^#\s+\S/gm) ?? []).length;
  if (h1Count > 0) {
    return {
      id: "h1",
      status: "fail",
      message: `Found ${h1Count} H1 (#) in body. The article title is the only H1 — use ## or lower.`,
      focus: "content",
    };
  }
  return { id: "h1", status: "pass", message: "No H1 headings in body." };
}

export function checkMetaTitle(metaTitle: string | null): SeoCheckResult {
  const value = metaTitle?.trim() ?? "";
  if (!value) {
    return { id: "meta_title", status: "warn", message: "Meta title is empty (falls back to title).", focus: "meta_title" };
  }
  if (value.length > 60) {
    return {
      id: "meta_title",
      status: "warn",
      message: `Meta title is ${value.length} characters (over 60).`,
      focus: "meta_title",
    };
  }
  return { id: "meta_title", status: "pass", message: "Meta title length looks fine." };
}

export function checkMetaDescription(metaDescription: string | null): SeoCheckResult {
  const value = metaDescription?.trim() ?? "";
  if (!value) {
    return {
      id: "meta_description",
      status: "warn",
      message: "Meta description is empty.",
      focus: "meta_description",
    };
  }
  if (value.length > 155) {
    return {
      id: "meta_description",
      status: "warn",
      message: `Meta description is ${value.length} characters (over 155).`,
      focus: "meta_description",
    };
  }
  return { id: "meta_description", status: "pass", message: "Meta description length looks fine." };
}

export function checkOgImage(ogImageUrl: string | null, coverImageUrl: string | null): SeoCheckResult {
  if (!(ogImageUrl?.trim() || coverImageUrl?.trim())) {
    return {
      id: "og_image",
      status: "warn",
      message: "No OG image or cover image set.",
      focus: "og_image_url",
    };
  }
  return { id: "og_image", status: "pass", message: "Social image is set." };
}

export function checkImageAlts(content: ArticleBlock[]): SeoCheckResult {
  const missing: string[] = [];
  walkBlocks(content, (block) => {
    if (block.type !== "image") return;
    if (block.data.decorative) return;
    if (!(block.data.alt ?? "").trim()) missing.push(block.id);
  });
  if (missing.length) {
    return {
      id: "image_alt",
      status: "warn",
      message: `${missing.length} image(s) missing alt text.`,
      focus: missing[0],
    };
  }
  return { id: "image_alt", status: "pass", message: "All images have alt or are decorative." };
}

export function checkHeadingHierarchy(content: ArticleBlock[]): SeoCheckResult {
  const levels = headingLevelsFromMarkdown(collectMarkdown(content));
  for (let i = 1; i < levels.length; i++) {
    const prev = levels[i - 1]!;
    const curr = levels[i]!;
    if (curr > prev + 1) {
      return {
        id: "heading_hierarchy",
        status: "warn",
        message: `Heading level skipped (H${prev} → H${curr}).`,
        focus: "content",
      };
    }
  }
  return { id: "heading_hierarchy", status: "pass", message: "Heading hierarchy is sequential." };
}

export function checkInternalLinks(content: ArticleBlock[]): SeoCheckResult {
  const count = countInternalLinks(collectMarkdown(content));
  if (count < 2) {
    return {
      id: "internal_links",
      status: "warn",
      message: `Only ${count} internal link(s) in the body (aim for at least 2).`,
      focus: "content",
    };
  }
  return { id: "internal_links", status: "pass", message: `${count} internal links found.` };
}

export function checkNoindex(noindex: boolean): SeoCheckResult {
  if (noindex) {
    return {
      id: "noindex",
      status: "warn",
      message: "noindex is on — page will be excluded from search and the sitemap.",
      focus: "noindex",
    };
  }
  return { id: "noindex", status: "pass", message: "Page is indexable." };
}

export function runSeoChecks(input: ArticleSeoInput): SeoCheckResult[] {
  return [
    checkSlug(input.slug),
    checkTitle(input.title),
    checkSingleH1(input.content),
    checkMetaTitle(input.metaTitle),
    checkMetaDescription(input.metaDescription),
    checkOgImage(input.ogImageUrl, input.coverImageUrl),
    checkImageAlts(input.content),
    checkHeadingHierarchy(input.content),
    checkInternalLinks(input.content),
    checkNoindex(input.noindex),
  ];
}

export function seoChecksBlockPublish(results: SeoCheckResult[]): boolean {
  return results.some((result) => result.status === "fail");
}

export function articleToSeoInput(article: Pick<
  Article,
  | "title"
  | "slug"
  | "meta_title"
  | "meta_description"
  | "og_image_url"
  | "cover_image_url"
  | "noindex"
  | "content"
>): ArticleSeoInput {
  return {
    title: article.title,
    slug: article.slug,
    metaTitle: article.meta_title,
    metaDescription: article.meta_description,
    ogImageUrl: article.og_image_url,
    coverImageUrl: article.cover_image_url,
    noindex: article.noindex,
    content: article.content,
  };
}
