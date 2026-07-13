import type { ArticleBlock, RowBlock } from "@/lib/blocks/types";

function tag(blockId: string) {
  return `[block:${blockId}]`;
}

function serializeLeaf(block: ArticleBlock): string {
  switch (block.type) {
    case "text":
      return `${tag(block.id)}\n${block.data.markdown}`;
    case "quote":
      return `${tag(block.id)}\n> ${block.data.text}${block.data.attribution ? `\n— ${block.data.attribution}` : ""}`;
    case "tip_card":
      return `${tag(block.id)}\n[Tip: ${block.data.label}] ${block.data.body}`;
    case "image":
      return `${tag(block.id)}\n[Image${block.data.caption ? `: ${block.data.caption}` : ""}]`;
    case "divider":
      return `${tag(block.id)}\n---${block.data.label ? ` ${block.data.label}` : ""}`;
    case "gallery":
      return `${tag(block.id)}\n[Gallery: ${block.data.images.length} photo(s)]`;
    case "map":
      return `${tag(block.id)}\n[Map: ${block.data.query}]`;
    case "video":
      return `${tag(block.id)}\n[Video${block.data.title ? `: ${block.data.title}` : ""}]`;
    case "timeline":
      return `${tag(block.id)}\n${block.data.items.map((i) => `- ${i.label}: ${i.title} — ${i.text}`).join("\n")}`;
    case "affiliate":
      return `${tag(block.id)}\n[Affiliate link: ${block.data.title}]`;
    default:
      return "";
  }
}

function serializeRow(block: RowBlock): string {
  return block.data.children
    .map((slot) => serializeLeaf(slot.block))
    .filter(Boolean)
    .join("\n\n");
}

export function serializeArticleBlocksForAi(blocks: ArticleBlock[]): string {
  const parts: string[] = [];

  for (const block of blocks) {
    if (block.type === "row") {
      const rowText = serializeRow(block);
      if (rowText) parts.push(`${tag(block.id)}\n${rowText}`);
      continue;
    }
    if (block.type === "columns") {
      for (const col of block.data.columns) {
        for (const child of col.blocks) {
          const t = serializeLeaf(child);
          if (t) parts.push(t);
        }
      }
      continue;
    }
    const text = serializeLeaf(block);
    if (text) parts.push(text);
  }

  return parts.join("\n\n");
}

export function findBlockIdByExcerpt(blocks: ArticleBlock[], excerpt: string): string | undefined {
  const needle = excerpt.slice(0, 80).toLowerCase();
  for (const block of blocks) {
    const serialized = serializeLeaf(block).toLowerCase();
    if (serialized.includes(needle)) return block.id;
    if (block.type === "row") {
      for (const slot of block.data.children) {
        const s = serializeLeaf(slot.block).toLowerCase();
        if (s.includes(needle)) return slot.block.id;
      }
    }
  }
  return undefined;
}
