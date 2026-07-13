import { Extension, type Editor } from "@tiptap/core";

function isEditorVisuallyEmpty(editor: Editor): boolean {
  const { doc } = editor.state;
  if (doc.textContent.trim().length > 0) return false;
  if (doc.childCount === 0) return true;
  if (doc.childCount === 1) {
    const first = doc.firstChild;
    if (!first) return true;
    if (first.type.name === "paragraph" && first.content.size === 0) return true;
  }
  return doc.textContent.trim().length === 0;
}

function shouldDeleteOuterBlock(editor: Editor): boolean {
  const { selection } = editor.state;
  if (!selection.empty) return false;
  return isEditorVisuallyEmpty(editor);
}

export function createNotionBlockBackspaceExtension(onDeleteBlock: () => boolean) {
  return Extension.create({
    name: "notionBlockBackspace",
    priority: 1001,
    addKeyboardShortcuts() {
      const handle = () => {
        if (!shouldDeleteOuterBlock(this.editor)) return false;
        return onDeleteBlock();
      };
      return {
        Backspace: handle,
        Delete: handle,
      };
    },
  });
}
