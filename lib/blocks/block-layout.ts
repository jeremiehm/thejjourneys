import type { ArticleBlock, ColumnContentBlock } from "@/lib/blocks/types";

export function isBlockFullWidth(block: ArticleBlock | ColumnContentBlock): boolean {
  if (block.type === "columns" || block.type === "row") return block.data.fullWidth ?? false;
  if ("fullWidth" in block.data) return Boolean(block.data.fullWidth);
  return false;
}

export function toggleBlockFullWidth<T extends ArticleBlock | ColumnContentBlock>(block: T): T {
  if (block.type === "columns" || block.type === "row") {
    return { ...block, data: { ...block.data, fullWidth: !block.data.fullWidth } };
  }
  if ("fullWidth" in block.data) {
    return { ...block, data: { ...block.data, fullWidth: !block.data.fullWidth } } as T;
  }
  return block;
}
