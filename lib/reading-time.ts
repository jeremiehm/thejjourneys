import type { ArticleBlock } from "@/lib/blocks/types";
import { stripMarkdown } from "@/lib/utils";

function blockText(block: ArticleBlock): string {
  switch (block.type) {
    case "text":
      return block.data.markdown;
    case "tip_card":
      return `${block.data.label} ${block.data.body}`;
    case "affiliate":
      return `${block.data.title} ${block.data.description ?? ""}`;
    case "timeline":
      return block.data.items.map((item) => `${item.title} ${item.text}`).join(" ");
    case "quote":
      return `${block.data.text} ${block.data.attribution ?? ""}`;
    case "image":
      return block.data.caption ?? "";
    case "gallery":
      return block.data.images.map((image) => image.caption ?? "").join(" ");
    case "map":
    case "video":
    case "divider":
      return "";
    case "columns":
      return block.data.columns
        .flatMap((column) => column.blocks)
        .map((child) => blockText(child as ArticleBlock))
        .join(" ");
    case "row":
      return block.data.children.map((slot) => blockText(slot.block as ArticleBlock)).join(" ");
  }
}

export function estimateReadingTime(blocks: ArticleBlock[]) {
  const words = stripMarkdown(blocks.map(blockText).join(" ")).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}
