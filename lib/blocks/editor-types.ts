import { createId } from "@/lib/blocks/defaults";
import type {
  ArticleBlock,
  ColumnsBlock,
  DividerBlock,
  ImageBlock,
  QuoteBlockWithLayout,
  RowBlock,
  RowChildBlock,
  TextBlock,
} from "@/lib/blocks/types";

export type DropZone = "before" | "after" | "left" | "right";

export type EditorLeafBlock = TextBlock | ImageBlock | DividerBlock | QuoteBlockWithLayout;

export type EditorBlock = EditorLeafBlock | RowBlock;

export function isRowBlock(block: ArticleBlock | EditorBlock): block is RowBlock | ColumnsBlock {
  return block.type === "row" || block.type === "columns";
}

export function isLeafBlock(block: ArticleBlock | EditorBlock): block is EditorLeafBlock {
  return block.type === "text" || block.type === "image" || block.type === "divider" || block.type === "quote";
}

export function columnsToRow(block: ColumnsBlock): RowBlock {
  const total = block.data.columns.reduce((sum, col) => sum + col.span, 0);
  return {
    id: block.id,
    type: "row",
    data: {
      fullWidth: block.data.fullWidth,
      children: block.data.columns.map((column) => ({
        slotId: createId(),
        flex: column.span / total,
        block: column.blocks[0] ?? { id: createId(), type: "text", data: { markdown: "" } },
      })),
    },
  };
}

export function normalizeEditorBlocks(blocks: ArticleBlock[]): EditorBlock[] {
  return blocks.map((block) => {
    if (block.type === "columns") return columnsToRow(block);
    if (isLeafBlock(block)) return block;
    if (block.type === "row") return block;
    return { id: block.id, type: "text", data: { markdown: "" } };
  });
}

export function serializeEditorBlocks(blocks: EditorBlock[]): ArticleBlock[] {
  return blocks as ArticleBlock[];
}
