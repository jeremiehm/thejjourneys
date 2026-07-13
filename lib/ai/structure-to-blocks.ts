import { createArticleBlock, createId } from "@/lib/blocks/defaults";
import type { ArticleBlock } from "@/lib/blocks/types";
import type { StructureSection } from "./types";

export function structureSectionToBlock(section: StructureSection, preserveId?: string): ArticleBlock {
  const id = preserveId ?? createId();

  switch (section.type) {
    case "text":
      return { id, type: "text", data: { markdown: section.markdown, fullWidth: false } };
    case "tip_card":
      return {
        id,
        type: "tip_card",
        data: { icon: section.icon ?? "💡", label: section.label, body: section.body },
      };
    case "quote":
      return {
        id,
        type: "quote",
        data: { text: section.text, attribution: section.attribution ?? "", fullWidth: false },
      };
    case "divider":
      return { id, type: "divider", data: { label: section.label ?? "", fullWidth: false } };
    case "image":
      return {
        id,
        type: "image",
        data: {
          url: "",
          caption: section.caption ?? "",
          alt: section.alt ?? section.caption ?? "",
          fullWidth: false,
        },
      };
    case "timeline":
      return { id, type: "timeline", data: { items: section.items } };
  }
}

export function structureSectionsToBlocks(sections: StructureSection[]): ArticleBlock[] {
  const blocks: ArticleBlock[] = [];

  for (const section of sections) {
    blocks.push(structureSectionToBlock(section));
  }

  return blocks.length > 0 ? blocks : [createArticleBlock("text")];
}
