import { Extension, type Editor } from "@tiptap/core";
import type { ResolvedPos } from "@tiptap/pm/model";
import { htmlToMarkdown } from "@/lib/markdown-editor";
import { sliceToMarkdown } from "@/components/admin/NotionEditor/slice-markdown";

export type NewBlockPayload = {
  /** Markdown for the newly created block. */
  markdown?: string;
  /**
   * Final markdown that must remain in the current TipTap block after the split.
   * When set, the parent applies this in the same state update as the insert
   * (avoids racing TipTap onUpdate against a stale React snapshot).
   */
  remainingMarkdown?: string;
};

function findListItemType($from: ResolvedPos): "listItem" | "taskItem" | null {
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const name = $from.node(depth).type.name;
    if (name === "listItem" || name === "taskItem") return name;
  }
  return null;
}

function isListItemEmpty($from: ResolvedPos, itemType: "listItem" | "taskItem"): boolean {
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name === itemType) {
      return $from.node(depth).textContent.length === 0;
    }
  }
  return false;
}

function currentEditorMarkdown(editor: Editor): string {
  return htmlToMarkdown(editor.getHTML()).trim();
}

function handleParagraphEnter(editor: Editor, onNewBlock: (payload: NewBlockPayload) => void): boolean {
  const { state } = editor;
  const { $from } = state.selection;
  const doc = state.doc;

  const isOnlyEmptyParagraph =
    doc.childCount === 1 &&
    doc.firstChild?.type.name === "paragraph" &&
    doc.firstChild.content.size === 0;

  if (isOnlyEmptyParagraph) {
    onNewBlock({ remainingMarkdown: "" });
    return true;
  }

  const atParagraphEnd = $from.parentOffset === $from.parent.content.size;
  const paragraphEnd = $from.end();
  const posAfterParagraph = $from.after();

  if (!atParagraphEnd) {
    const afterMd = sliceToMarkdown(editor, $from.pos, paragraphEnd);
    editor.chain().focus().deleteRange({ from: $from.pos, to: paragraphEnd }).run();

    const restFrom = editor.state.selection.$from.after();
    const restMd = sliceToMarkdown(editor, restFrom, editor.state.doc.content.size);
    if (restMd) {
      editor.chain().focus().deleteRange({ from: restFrom, to: editor.state.doc.content.size }).run();
      onNewBlock({
        markdown: [afterMd, restMd].filter(Boolean).join("\n\n"),
        remainingMarkdown: currentEditorMarkdown(editor),
      });
    } else {
      onNewBlock({
        markdown: afterMd,
        remainingMarkdown: currentEditorMarkdown(editor),
      });
    }
    return true;
  }

  const restMd = sliceToMarkdown(editor, posAfterParagraph, doc.content.size);
  if (restMd) {
    editor.chain().focus().deleteRange({ from: posAfterParagraph, to: doc.content.size }).run();
    onNewBlock({
      markdown: restMd,
      remainingMarkdown: currentEditorMarkdown(editor),
    });
    return true;
  }

  onNewBlock({ remainingMarkdown: currentEditorMarkdown(editor) });
  return true;
}

function isInsideNode($from: ResolvedPos, typeName: string): boolean {
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name === typeName) return true;
  }
  return false;
}

function handleEnter(editor: Editor, onNewBlock: (payload: NewBlockPayload) => void): boolean {
  const { $from } = editor.state.selection;

  // Let TipTap / prosemirror-tables handle Enter inside tables and callouts.
  if (isInsideNode($from, "table") || isInsideNode($from, "callout")) {
    return false;
  }

  const listItemType = findListItemType($from);
  if (listItemType) {
    if (isListItemEmpty($from, listItemType)) {
      return editor.chain().focus().liftListItem(listItemType).run();
    }
    return false;
  }

  if ($from.parent.type.name === "heading") {
    onNewBlock({ remainingMarkdown: currentEditorMarkdown(editor) });
    return true;
  }

  if ($from.parent.type.name === "codeBlock") {
    return false;
  }

  if ($from.parent.type.name === "paragraph") {
    return handleParagraphEnter(editor, onNewBlock);
  }

  return false;
}

export function createNotionBlockEnterExtension(onNewBlock: (payload: NewBlockPayload) => void) {
  return Extension.create({
    name: "notionBlockEnter",
    priority: 1000,
    addKeyboardShortcuts() {
      return {
        "Shift-Enter": ({ editor }) => editor.chain().focus().setHardBreak().run(),
        Enter: ({ editor }) => handleEnter(editor, onNewBlock),
      };
    },
  });
}
