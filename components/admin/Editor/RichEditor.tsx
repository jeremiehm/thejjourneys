"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Youtube from "@tiptap/extension-youtube";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Typography from "@tiptap/extension-typography";
import Underline from "@tiptap/extension-underline";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Strikethrough,
  Underline as UnderlineIcon,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { htmlToMarkdown, markdownToHtml } from "@/lib/markdown-editor";
import { cn } from "@/lib/utils";

type RichEditorProps = {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
};

type SaveState = "idle" | "saving" | "saved";

function ToolbarButton({
  label,
  shortcut,
  active,
  onClick,
  children,
}: {
  label: string;
  shortcut?: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={onClick}
            className={cn(
              "size-8 text-stone-600",
              active && "bg-amber-100 text-amber-900 hover:bg-amber-100",
            )}
            aria-label={label}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">{label}</p>
        {shortcut ? <p className="text-xs text-stone-400">{shortcut}</p> : null}
      </TooltipContent>
    </Tooltip>
  );
}

function ToolbarDivider() {
  return <Separator orientation="vertical" className="mx-1 h-6" />;
}

export function RichEditor({
  value,
  onChange,
  placeholder = "Raconte ce moment de voyage...",
}: RichEditorProps) {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [imageOpen, setImageOpen] = useState(false);
  const [youtubeOpen, setYoutubeOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Highlight,
      Typography,
      Link.configure({ openOnClick: false }),
      Image.configure({ inline: false }),
      Youtube.configure({ width: 640, height: 360, nocookie: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
      CharacterCount.configure(),
    ],
    content: markdownToHtml(value),
    editorProps: {
      attributes: {
        class:
          "prose prose-stone max-w-none min-h-[400px] px-6 py-6 focus:outline-none prose-headings:font-semibold prose-a:text-amber-700",
        "data-placeholder": placeholder,
      },
    },
    onUpdate: ({ editor: ed }) => {
      setSaveState("saving");
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onChange(htmlToMarkdown(ed.getHTML()));
        setSaveState("saved");
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(() => setSaveState("idle"), 2000);
      }, 1500);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const html = markdownToHtml(value);
    if (htmlToMarkdown(editor.getHTML()) !== value && editor.getHTML() !== html) {
      editor.commands.setContent(html, { emitUpdate: false });
    }
  }, [editor, value]);

  const uploadImage = useCallback(async (file: File) => {
    setUploading(true);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setUploading(false);
      return;
    }
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `uploads/${crypto.randomUUID()}.${ext}`;
    let bucket: "article-images" | "media" = "article-images";
    let { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
    if (error) {
      bucket = "media";
      ({ error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false }));
    }
    if (!error) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      setImageUrl(data.publicUrl);
    }
    setUploading(false);
  }, []);

  function insertImage() {
    if (!editor || !imageUrl) return;
    editor.chain().focus().setImage({ src: imageUrl, alt: imageAlt || undefined }).run();
    setImageOpen(false);
    setImageUrl("");
    setImageAlt("");
  }

  function insertYoutube() {
    if (!editor || !youtubeUrl) return;
    editor.commands.setYoutubeVideo({ src: youtubeUrl });
    setYoutubeOpen(false);
    setYoutubeUrl("");
  }

  function insertLink() {
    if (!editor || !linkUrl) return;
    editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run();
    setLinkOpen(false);
    setLinkUrl("");
  }

  if (!editor) return null;

  const wordCount = editor.storage.characterCount.words();

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-stone-200 bg-stone-50/80 px-2 py-2">
        <ToolbarButton
          label="Heading 1"
          shortcut="⌘⌥1"
          active={editor.isActive("heading", { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Heading 2"
          shortcut="⌘⌥2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Heading 3"
          shortcut="⌘⌥3"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Paragraph"
          active={editor.isActive("paragraph")}
          onClick={() => editor.chain().focus().setParagraph().run()}
        >
          <Pilcrow className="size-4" />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          label="Bold"
          shortcut="⌘B"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          shortcut="⌘I"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Underline"
          shortcut="⌘U"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Highlight"
          active={editor.isActive("highlight")}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
        >
          <Highlighter className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Strikethrough"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="size-4" />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          label="Quote"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Code"
          active={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <Code className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Divider"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus className="size-4" />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          label="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Ordered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-4" />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton label="Image" onClick={() => setImageOpen(true)}>
          <ImageIcon className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="YouTube" onClick={() => setYoutubeOpen(true)}>
          <Video className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Link" onClick={() => setLinkOpen(true)}>
          <Link2 className="size-4" />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          label="Align left"
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          <AlignLeft className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Align center"
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          <AlignCenter className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Align right"
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          <AlignRight className="size-4" />
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} />

      <div className="flex items-center justify-between border-t border-stone-100 px-4 py-2 text-xs text-stone-500">
        <span>
          {saveState === "saving" && "Saving..."}
          {saveState === "saved" && "✓ Saved"}
          {saveState === "idle" && "\u00a0"}
        </span>
        <span>{wordCount} words</span>
      </div>

      <Dialog open={imageOpen} onOpenChange={setImageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert image</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="upload">
            <TabsList className="w-full">
              <TabsTrigger value="upload" className="flex-1">
                Upload
              </TabsTrigger>
              <TabsTrigger value="url" className="flex-1">
                URL
              </TabsTrigger>
            </TabsList>
            <TabsContent value="upload" className="space-y-3 pt-3">
              <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 bg-stone-50 p-6 text-center text-sm text-stone-500 hover:bg-stone-100">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadImage(file);
                  }}
                />
                {uploading ? "Uploading..." : "Drag & drop or click to upload"}
              </label>
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="Preview" className="max-h-40 rounded-lg object-cover" />
              ) : null}
            </TabsContent>
            <TabsContent value="url" className="space-y-3 pt-3">
              <div className="space-y-2">
                <Label>Image URL</Label>
                <Input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://..." />
              </div>
            </TabsContent>
          </Tabs>
          <div className="space-y-2">
            <Label>Alt text</Label>
            <Input value={imageAlt} onChange={(event) => setImageAlt(event.target.value)} placeholder="Describe the image" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setImageOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={insertImage} disabled={!imageUrl}>
              Insert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={youtubeOpen} onOpenChange={setYoutubeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Embed YouTube video</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>YouTube URL</Label>
            <Input value={youtubeUrl} onChange={(event) => setYoutubeUrl(event.target.value)} placeholder="https://youtube.com/watch?v=..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setYoutubeOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={insertYoutube} disabled={!youtubeUrl}>
              Embed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert link</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>URL</Label>
            <Input value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="https://..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setLinkOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={insertLink} disabled={!linkUrl}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
