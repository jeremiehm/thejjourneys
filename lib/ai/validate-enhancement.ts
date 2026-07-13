import type { ArticleBlock } from "@/lib/blocks/types";
import { serializeArticleBlocksForAi } from "@/lib/ai/article-serializer";
import type { StructureSection } from "./types";

function contentLength(text: string): number {
  return text.replace(/\s+/g, " ").trim().length;
}

export function articleContentLength(blocks: ArticleBlock[]): number {
  return contentLength(serializeArticleBlocksForAi(blocks));
}

export function sectionsContentLength(sections: StructureSection[]): number {
  const parts = sections.map((section) => {
    if (section.type === "text") return section.markdown;
    if (section.type === "tip_card") return section.body;
    if (section.type === "quote") return section.text;
    if (section.type === "timeline") {
      return section.items.map((item) => `${item.title} ${item.text}`).join(" ");
    }
    return "";
  });
  return contentLength(parts.join("\n"));
}

/** Reject AI rewrites that would wipe most of the article body. */
export function isBodyEnhancementSafe(
  originalBlocks: ArticleBlock[],
  sections: StructureSection[],
): { safe: boolean; reason?: string } {
  const originalLen = articleContentLength(originalBlocks);
  const enhancedLen = sectionsContentLength(sections);

  if (originalLen < 250) return { safe: true };

  if (enhancedLen < originalLen * 0.65) {
    return {
      safe: false,
      reason: `SEO enhancement was blocked: generated content is much shorter than your article (${enhancedLen} vs ${originalLen} characters).`,
    };
  }

  const originalTextBlocks = originalBlocks.filter((b) => b.type === "text").length;
  const enhancedTextBlocks = sections.filter((s) => s.type === "text").length;
  if (originalTextBlocks >= 2 && enhancedTextBlocks < Math.ceil(originalTextBlocks * 0.5)) {
    return {
      safe: false,
      reason: "SEO enhancement was blocked: too many sections would have been removed.",
    };
  }

  return { safe: true };
}
