import type { ArticleBlock } from "@/lib/blocks/types";
import { createArticleBlock } from "@/lib/blocks/defaults";

export function blocksToMarkdown(blocks: ArticleBlock[]): string {
  const text = blocks.find((block) => block.type === "text");
  return text?.type === "text" ? text.data.markdown : "";
}

export function markdownToBlocks(markdown: string, existing?: ArticleBlock[]): ArticleBlock[] {
  const textBlock = existing?.find((block) => block.type === "text");
  const others = (existing ?? []).filter((block) => block.type !== "text");
  const base = textBlock ?? createArticleBlock("text");
  if (base.type !== "text") return existing ?? [createArticleBlock("text")];
  return [{ ...base, data: { markdown } }, ...others];
}
