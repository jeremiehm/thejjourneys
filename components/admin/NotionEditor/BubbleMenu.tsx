"use client";

import type { Editor } from "@tiptap/react";
import { BubbleMenu as TiptapBubbleMenu } from "@tiptap/react/menus";
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  Link2,
  Quote,
  Strikethrough,
  Underline,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { InlineAiMenu } from "@/components/admin/ai/InlineAiMenu";

type EditorBubbleMenuProps = {
  editor: Editor | null;
  blockId?: string;
};

function MenuBtn({
  active,
  onClick,
  children,
  label,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-white/10",
        active && "bg-stone-100 text-stone-900 dark:bg-white/15 dark:text-white",
      )}
    >
      {children}
    </button>
  );
}

export function EditorBubbleMenu({ editor, blockId }: EditorBubbleMenuProps) {
  if (!editor) return null;

  return (
    <TiptapBubbleMenu
      editor={editor}
      className="flex items-center gap-0.5 rounded-lg border border-stone-200 bg-white px-1 py-0.5 shadow-lg dark:border-stone-700 dark:bg-[#252525]"
    >
      <MenuBtn
        label="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </MenuBtn>
      <MenuBtn
        label="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </MenuBtn>
      <MenuBtn
        label="Underline"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Underline className="h-4 w-4" />
      </MenuBtn>
      <MenuBtn
        label="Strike"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="h-4 w-4" />
      </MenuBtn>
      <MenuBtn
        label="Link"
        active={editor.isActive("link")}
        onClick={() => {
          const previous = editor.getAttributes("link").href as string | undefined;
          const url = window.prompt("URL", previous ?? "https://");
          if (url === null) return;
          if (url === "") {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            return;
          }
          editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
        }}
      >
        <Link2 className="h-4 w-4" />
      </MenuBtn>
      <span className="mx-1 h-5 w-px bg-stone-200 dark:bg-stone-600" />
      <MenuBtn label="H1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
        <Heading1 className="h-4 w-4" />
      </MenuBtn>
      <MenuBtn label="H2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 className="h-4 w-4" />
      </MenuBtn>
      <MenuBtn label="H3" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        <Heading3 className="h-4 w-4" />
      </MenuBtn>
      <MenuBtn
        label="Liste à puces"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-4 w-4" />
      </MenuBtn>
      <MenuBtn label="Quote" onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote className="h-4 w-4" />
      </MenuBtn>
      <InlineAiMenu editor={editor} blockId={blockId} />
    </TiptapBubbleMenu>
  );
}
