import type { Editor } from "@tiptap/core";
import type { Fragment, Node as ProseMirrorNode } from "@tiptap/pm/model";
import { DOMSerializer } from "@tiptap/pm/model";
import { htmlToMarkdown } from "@/lib/markdown-editor";

export function fragmentToMarkdown(editor: Editor, fragment: Fragment): string {
  const serializer = DOMSerializer.fromSchema(editor.schema);
  const wrap = document.createElement("div");
  wrap.appendChild(serializer.serializeFragment(fragment));
  const html = wrap.innerHTML.trim();
  if (!html) return "";
  return htmlToMarkdown(html).trim();
}

/**
 * Expand [from, to] so partial table coverage includes whole table nodes.
 * Avoids broken GFM when Enter-split / slice crosses a table boundary.
 */
export function expandRangeAroundTables(
  doc: ProseMirrorNode,
  from: number,
  to: number,
): { from: number; to: number } {
  let nextFrom = from;
  let nextTo = to;

  doc.descendants((node, pos) => {
    if (node.type.name !== "table") return undefined;
    const start = pos;
    const end = pos + node.nodeSize;
    const overlaps = nextFrom < end && nextTo > start;
    if (!overlaps) return false;
    if (nextFrom > start && nextFrom < end) nextFrom = start;
    if (nextTo > start && nextTo < end) nextTo = end;
    return false;
  });

  return { from: nextFrom, to: nextTo };
}

export function sliceToMarkdown(editor: Editor, from: number, to: number): string {
  const expanded = expandRangeAroundTables(editor.state.doc, from, to);
  const slice = editor.state.doc.slice(expanded.from, expanded.to);
  return fragmentToMarkdown(editor, slice.content);
}
