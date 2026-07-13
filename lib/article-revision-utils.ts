import type { ArticleBlock } from "@/lib/blocks/types";
import type { ArticleRevision } from "@/lib/article-revisions";

export function revisionBlockCount(revision: ArticleRevision): number {
  return revision.content?.length ?? 0;
}

export function countBlocks(blocks: ArticleBlock[]): number {
  return blocks.length;
}
