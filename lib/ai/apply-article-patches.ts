import { createArticleBlock, createId } from "@/lib/blocks/defaults";
import { findBlockLocation } from "@/lib/blocks/content-ops";
import { normalizeEditorBlocks, type EditorBlock } from "@/lib/blocks/editor-types";
import type { ArticleBlock } from "@/lib/blocks/types";
import type { ArticlePatch } from "@/lib/ai/types";
import { structureSectionToBlock } from "@/lib/ai/structure-to-blocks";

function cloneBlocks(blocks: ArticleBlock[]): ArticleBlock[] {
  return structuredClone(blocks) as ArticleBlock[];
}

export function applyArticlePatches(blocks: ArticleBlock[], patches: ArticlePatch[]): ArticleBlock[] {
  if (patches.length === 0) return blocks;

  const editorBlocks = normalizeEditorBlocks(cloneBlocks(blocks));

  for (const patch of patches) {
    const loc = findBlockLocation(editorBlocks, patch.blockId);
    if (!loc) continue;

    if (patch.action === "delete") {
      if (loc.kind === "root") {
        editorBlocks.splice(loc.index, 1);
      } else {
        const row = editorBlocks[loc.rowIndex]!;
        if (row.type === "row") {
          row.data.children.splice(loc.slotIndex, 1);
          if (row.data.children.length === 0) {
            editorBlocks.splice(loc.rowIndex, 1);
          } else if (row.data.children.length === 1) {
            editorBlocks.splice(loc.rowIndex, 1, row.data.children[0]!.block as EditorBlock);
          }
        }
      }
      continue;
    }

    if (!patch.section) continue;
    const newBlock = structureSectionToBlock(patch.section, patch.action === "replace" ? patch.blockId : undefined);

    if (patch.action === "replace") {
      if (loc.kind === "root") {
        editorBlocks[loc.index] = newBlock as (typeof editorBlocks)[number];
      } else {
        const row = editorBlocks[loc.rowIndex]!;
        if (row.type === "row") {
          row.data.children[loc.slotIndex] = {
            ...row.data.children[loc.slotIndex]!,
            block: newBlock as (typeof row.data.children)[number]["block"],
          };
        }
      }
      continue;
    }

    if (patch.action === "insert_after") {
      if (loc.kind === "root") {
        editorBlocks.splice(loc.index + 1, 0, newBlock as (typeof editorBlocks)[number]);
      } else {
        const row = editorBlocks[loc.rowIndex]!;
        if (row.type === "row") {
          const flex = 1 / (row.data.children.length + 1);
          row.data.children.splice(loc.slotIndex + 1, 0, {
            slotId: createId(),
            flex,
            block: newBlock as (typeof row.data.children)[number]["block"],
          });
          row.data.children = row.data.children.map((c) => ({ ...c, flex }));
        }
      }
    }
  }

  const next = editorBlocks as ArticleBlock[];
  return next.length > 0 ? next : [createArticleBlock("text")];
}

export function validatePatches(patches: ArticlePatch[]): string | null {
  for (const patch of patches) {
    if ((patch.action === "replace" || patch.action === "insert_after") && !patch.section) {
      return `Patch on ${patch.blockId} missing section for action ${patch.action}`;
    }
  }
  return null;
}
