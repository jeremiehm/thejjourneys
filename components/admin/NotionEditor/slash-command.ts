import type { Editor } from "@tiptap/core";
import type { SlashItem } from "@/components/admin/NotionEditor/slash-items";

export type SlashMatch = {
  query: string;
  slashFrom: number;
  slashTo: number;
};

/** Détecte une commande « / » sur la ligne courante (nœud parent du curseur). */
export function getSlashMatch(editor: Editor): SlashMatch | null {
  const { $from } = editor.state.selection;
  const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);

  const slashIndex = textBefore.lastIndexOf("/");
  if (slashIndex === -1) return null;

  const query = textBefore.slice(slashIndex + 1);
  if (query.includes(" ") || query.includes("\n")) return null;

  return {
    query,
    slashFrom: $from.start() + slashIndex,
    slashTo: $from.pos,
  };
}

export function getSlashMenuRect(editor: Editor): DOMRect {
  const { from } = editor.state.selection;
  const coords = editor.view.coordsAtPos(from);
  return new DOMRect(coords.left, coords.top, 0, Math.max(coords.bottom - coords.top, 20));
}

export function deleteSlashCommand(editor: Editor): boolean {
  const match = getSlashMatch(editor);
  if (!match) return false;
  return editor.chain().focus().deleteRange({ from: match.slashFrom, to: match.slashTo }).run();
}

export type ApplySlashOptions = {
  onOpenImageDialog?: () => void;
  onOpenVideoDialog?: () => void;
};

export function applySlashToEditor(editor: Editor, item: SlashItem, options?: ApplySlashOptions): void {
  deleteSlashCommand(editor);

  const chain = editor.chain().focus();
  switch (item.id) {
    case "paragraph":
      chain.setParagraph().run();
      break;
    case "h1":
      chain.setHeading({ level: 1 }).run();
      break;
    case "h2":
      chain.setHeading({ level: 2 }).run();
      break;
    case "h3":
      chain.setHeading({ level: 3 }).run();
      break;
    case "quote":
      chain.toggleBlockquote().run();
      break;
    case "code":
      chain.toggleCodeBlock().run();
      break;
    case "divider":
      chain.setHorizontalRule().run();
      break;
    case "image":
      options?.onOpenImageDialog?.();
      break;
    case "video":
      options?.onOpenVideoDialog?.();
      break;
    case "bullet":
      chain.toggleBulletList().run();
      break;
    case "ordered":
      chain.toggleOrderedList().run();
      break;
    case "task":
      chain.toggleTaskList().run();
      break;
    case "callout":
      editor.commands.insertContent({
        type: "callout",
        content: [{ type: "paragraph" }],
      });
      break;
    default:
      break;
  }
}
