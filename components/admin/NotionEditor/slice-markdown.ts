import type { Editor } from "@tiptap/core";
import type { Fragment } from "@tiptap/pm/model";
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

export function sliceToMarkdown(editor: Editor, from: number, to: number): string {
  const slice = editor.state.doc.slice(from, to);
  return fragmentToMarkdown(editor, slice.content);
}
