import { Extension } from "@tiptap/core";

export function createLinkShortcutExtension(onOpenLinkEditor: () => void) {
  return Extension.create({
    name: "notionLinkShortcut",
    addKeyboardShortcuts() {
      return {
        "Mod-k": () => {
          onOpenLinkEditor();
          return true;
        },
      };
    },
  });
}
