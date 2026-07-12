import { COLUMN_PRESETS } from "@/lib/blocks/layout-presets";
import type { ArticleBlock, ColumnContentBlock, LayoutBlock } from "@/lib/blocks/types";

export function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

export function createArticleBlock(type: ArticleBlock["type"]): ArticleBlock {
  const id = createId();
  switch (type) {
    case "text":
      return { id, type, data: { markdown: "", fullWidth: false } };
    case "gallery":
      return { id, type, data: { display: "grid", images: [] } };
    case "map":
      return { id, type, data: { query: "Hanoi, Vietnam", zoom: 12 } };
    case "tip_card":
      return { id, type, data: { icon: "💡", label: "Good to know", body: "Add a practical travel tip." } };
    case "affiliate":
      return { id, type, data: { url: "https://", title: "Useful resource", description: "", cta: "View link" } };
    case "video":
      return { id, type, data: { url: "https://www.youtube.com/watch?v=", title: "Video" } };
    case "timeline":
      return { id, type, data: { items: [{ label: "Day 1", title: "Arrival", text: "Describe this stop." }] } };
    case "quote":
      return { id, type, data: { text: "A sentence that sums up this moment.", attribution: "", fullWidth: false } };
    case "image":
      return { id, type, data: { url: "", caption: "", alt: "", fullWidth: false } };
    case "divider":
      return { id, type, data: { label: "", fullWidth: false } };
    case "row":
      return createRowBlock("2-equal");
    case "columns":
      return createRowBlock("2-equal");
  }
}

export function createRowBlock(presetId: string): Extract<ArticleBlock, { type: "row" }> {
  const preset = COLUMN_PRESETS.find((item) => item.id === presetId) ?? COLUMN_PRESETS[0]!;
  const total = preset.spans.reduce((a, b) => a + b, 0);
  return {
    id: createId(),
    type: "row",
    data: {
      fullWidth: false,
      children: preset.spans.map((span) => ({
        slotId: createId(),
        flex: span / total,
        block: createColumnContentBlock("text"),
      })),
    },
  };
}

/** @deprecated */
export function createColumnsBlock(presetId: string): Extract<ArticleBlock, { type: "columns" }> {
  const preset = COLUMN_PRESETS.find((item) => item.id === presetId) ?? COLUMN_PRESETS[0]!;
  return {
    id: createId(),
    type: "columns",
    data: {
      fullWidth: false,
      columns: preset.spans.map((span) => ({
        span,
        blocks: [createColumnContentBlock("text")],
      })),
    },
  };
}

export function createColumnContentBlock(type: ColumnContentBlock["type"]): ColumnContentBlock {
  const id = createId();
  switch (type) {
    case "text":
      return { id, type, data: { markdown: "" } };
    case "image":
      return { id, type, data: { url: "", caption: "", alt: "" } };
    case "divider":
      return { id, type, data: { label: "" } };
    case "quote":
      return { id, type, data: { text: "", attribution: "" } };
  }
}

export function createLayoutBlock(type: LayoutBlock["type"]): LayoutBlock {
  const id = createId();
  switch (type) {
    case "hero":
      return { id, type, data: { imageUrl: "", title: "Collection title", subtitle: "", align: "center" } };
    case "text":
      return { id, type, data: { heading: "Introduction", body: "Introduce this adventure." } };
    case "article_grid":
      return { id, type, data: { title: "All articles", columns: 3 } };
    case "article_list":
      return { id, type, data: { title: "Itinerary notes" } };
    case "featured_article":
      return { id, type, data: { articleId: undefined, title: "Do not miss" } };
    case "image":
      return { id, type, data: { url: "", caption: "", alt: "" } };
    case "gallery":
      return { id, type, data: { images: [] } };
    case "quote":
      return { id, type, data: { text: "An atmospheric quote.", attribution: "" } };
    case "divider":
      return { id, type, data: { label: "" } };
    case "spacer":
      return { id, type, data: { size: "md" } };
  }
}
