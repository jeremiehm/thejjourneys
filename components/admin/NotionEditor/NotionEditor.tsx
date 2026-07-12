"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Youtube from "@tiptap/extension-youtube";
import Highlight from "@tiptap/extension-highlight";
import Typography from "@tiptap/extension-typography";
import Underline from "@tiptap/extension-underline";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Node, mergeAttributes } from "@tiptap/core";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { htmlToMarkdown, markdownToHtml } from "@/lib/markdown-editor";
import { EditorBubbleMenu } from "@/components/admin/NotionEditor/BubbleMenu";
import { SlashMenu, type SlashMenuRef } from "@/components/admin/NotionEditor/SlashMenu";
import type { SlashItem } from "@/components/admin/NotionEditor/slash-items";
import {
  createNotionBlockBackspaceExtension,
} from "@/components/admin/NotionEditor/notion-block-backspace";
import {
  createNotionBlockEnterExtension,
  type NewBlockPayload,
} from "@/components/admin/NotionEditor/notion-block-enter";
import {
  applySlashToEditor,
  getSlashMatch,
  getSlashMenuRect,
} from "@/components/admin/NotionEditor/slash-command";
const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,
  parseHTML: () => [{ tag: 'div[data-type="callout"]' }],
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "callout",
        class: "notion-callout",
      }),
      ["div", { class: "notion-callout-icon", contenteditable: "false" }, "💡"],
      ["div", { class: "notion-callout-body" }, 0],
    ];
  },
});

type NotionEditorProps = {
  value: string;
  onChange: (markdown: string) => void;
  editorRef?: MutableRefObject<Editor | null>;
  /** Mode bloc Notion : Enter crée un bloc frère via le parent */
  blockMode?: boolean;
  blockId?: string;
  onRegisterEditor?: (blockId: string, editor: Editor | null) => void;
  onNewBlock?: (payload: NewBlockPayload) => void;
  onDeleteBlock?: () => boolean;
  /** Si fourni, le menu slash est géré par le parent (éditeur de blocs) */
  onSlashTrigger?: (
    state: { query: string } | null,
    getRect: (() => DOMRect | null) | null,
  ) => void;
};

export function NotionEditor({
  value,
  onChange,
  editorRef,
  blockMode,
  blockId,
  onRegisterEditor,
  onNewBlock,
  onDeleteBlock,
  onSlashTrigger,
}: NotionEditorProps) {
  const slashRef = useRef<SlashMenuRef>(null);
  const [slashQuery, setSlashQuery] = useState<string | null>(null);
  const [slashRect, setSlashRect] = useState<(() => DOMRect | null) | null>(null);
  const [mediaDialog, setMediaDialog] = useState<"image" | "video" | null>(null);
  const [mediaUrl, setMediaUrl] = useState("");
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  const onNewBlockRef = useRef(onNewBlock);
  const onDeleteBlockRef = useRef(onDeleteBlock);
  useEffect(() => {
    onNewBlockRef.current = onNewBlock;
  }, [onNewBlock]);
  useEffect(() => {
    onDeleteBlockRef.current = onDeleteBlock;
  }, [onDeleteBlock]);

  const blockEnterExtension = useMemo(
    () =>
      blockMode
        ? createNotionBlockEnterExtension((payload) => onNewBlockRef.current?.(payload))
        : null,
    [blockMode],
  );

  const blockBackspaceExtension = useMemo(
    () =>
      blockMode && onDeleteBlock
        ? createNotionBlockBackspaceExtension(() => onDeleteBlockRef.current?.() ?? false)
        : null,
    [blockMode, onDeleteBlock],
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        hardBreak: { keepMarks: true },
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      Underline,
      Link.configure({ openOnClick: false }),
      Image.configure({ inline: false }),
      Youtube.configure({ width: 640, height: 360 }),
      Highlight,
      Typography,
      TaskList,
      TaskItem.configure({ nested: true }),
      Callout,
      Placeholder.configure({
        placeholder: blockMode
          ? "Tapez « / » pour les commandes"
          : "Press 'Enter' to continue with an empty page, or type '/' for commands",
      }),
      ...(blockEnterExtension ? [blockEnterExtension] : []),
      ...(blockBackspaceExtension ? [blockBackspaceExtension] : []),
    ],
    content: markdownToHtml(value),
    editorProps: {
      attributes: {
        class: blockMode
          ? "notion-editor-content notion-editor-content--block outline-none min-h-[1.5em]"
          : "notion-editor-content outline-none min-h-[200px]",
      },
    },
    onUpdate({ editor: ed }) {
      onChange(htmlToMarkdown(ed.getHTML()));
      updateSlash(ed);
    },
    onSelectionUpdate({ editor: ed }) {
      updateSlash(ed);
    },
  });

  useEffect(() => {
    if (editorRef) editorRef.current = editor;
  }, [editor, editorRef]);

  useEffect(() => {
    if (!blockId || !onRegisterEditor) return;
    onRegisterEditor(blockId, editor);
    return () => onRegisterEditor(blockId, null);
  }, [blockId, editor, onRegisterEditor]);

  const updateSlash = useCallback(
    (ed: NonNullable<typeof editor>) => {
      const match = getSlashMatch(ed);
      if (!match) {
        if (onSlashTrigger) onSlashTrigger(null, null);
        else setSlashQuery(null);
        return;
      }
      const getRect = () => getSlashMenuRect(ed);
      if (onSlashTrigger) {
        onSlashTrigger({ query: match.query }, getRect);
        setSlashQuery(null);
        return;
      }
      setSlashQuery(match.query);
      setSlashRect(() => getRect);
    },
    [onSlashTrigger],
  );

  useEffect(() => {
    if (!editor) return;
    const handler = (event: KeyboardEvent) => {
      if (slashQuery === null) return;
      if (event.key === "Escape") {
        setSlashQuery(null);
        return;
      }
      if (slashRef.current?.onKeyDown(event)) {
        event.preventDefault();
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [editor, slashQuery]);

  function applySlash(item: SlashItem) {
    if (!editor) return;
    applySlashToEditor(editor, item, {
      onOpenImageDialog: () => setMediaDialog("image"),
      onOpenVideoDialog: () => setMediaDialog("video"),
    });
    setSlashQuery(null);
  }

  function applyMedia() {
    if (!editor || !mediaDialog || !mediaUrl.trim()) return;
    if (mediaDialog === "image") {
      editor.chain().focus().setImage({ src: mediaUrl.trim() }).run();
    } else {
      editor.chain().focus().setYoutubeVideo({ src: mediaUrl.trim() }).run();
    }
    setMediaDialog(null);
    setMediaUrl("");
  }

  async function uploadImage(file: File) {
    setUploadMessage(null);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setUploadMessage("Configure Supabase or paste a URL.");
      return;
    }
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `uploads/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, file, { upsert: false });
    if (error) {
      setUploadMessage(error.message);
      return;
    }
    const { data } = supabase.storage.from("media").getPublicUrl(path);
    setMediaUrl(data.publicUrl);
  }

  return (
    <div className="relative">
      <EditorBubbleMenu editor={editor} blockId={blockId} />
      <EditorContent editor={editor} />
      {!onSlashTrigger && slashQuery !== null ? (
        <SlashMenu
          ref={slashRef}
          query={slashQuery}
          onSelect={applySlash}
          clientRect={slashRect}
        />
      ) : null}

      <Dialog open={mediaDialog !== null} onOpenChange={(open) => !open && setMediaDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{mediaDialog === "video" ? "Embed video" : "Insert image"}</DialogTitle>
          </DialogHeader>
          {mediaDialog === "image" ? (
            <Tabs defaultValue="upload">
              <TabsList className="w-full">
                <TabsTrigger value="upload" className="flex-1">
                  Upload
                </TabsTrigger>
                <TabsTrigger value="link" className="flex-1">
                  Link
                </TabsTrigger>
              </TabsList>
              <TabsContent value="upload" className="pt-2">
                <input
                  type="file"
                  accept="image/*"
                  className="text-sm"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadImage(file);
                  }}
                />
                {uploadMessage ? <p className="mt-2 text-xs text-red-600">{uploadMessage}</p> : null}
              </TabsContent>
              <TabsContent value="link" className="space-y-2 pt-2">
                <Input value={mediaUrl} onChange={(event) => setMediaUrl(event.target.value)} placeholder="https://..." />
              </TabsContent>
            </Tabs>
          ) : (
            <Input value={mediaUrl} onChange={(event) => setMediaUrl(event.target.value)} placeholder="YouTube or Vimeo URL" />
          )}
          <button
            type="button"
            className="mt-3 rounded-lg bg-stone-900 px-4 py-2 text-sm text-white dark:bg-stone-100 dark:text-stone-900"
            onClick={applyMedia}
          >
            Insert
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function focusNotionEditor(editor: ReturnType<typeof useEditor> | null) {
  editor?.chain().focus().run();
}
