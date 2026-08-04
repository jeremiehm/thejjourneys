"use client";

import { useRef, useState, useTransition } from "react";
import type { ImageBlock as ImageBlockType } from "@/lib/blocks/types";
import { AdminImage } from "@/components/admin/admin-image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { uploadAdminImage } from "@/lib/admin/upload-image";
import { dataTransferHasImages, extractImageFiles } from "@/lib/admin/image-drop";
import { cn } from "@/lib/utils";

type ImageBlockProps = {
  block: ImageBlockType;
  onChange: (block: ImageBlockType) => void;
  onFilesDrop?: (files: File[]) => void;
};

export function ImageBlock({ block, onChange, onFilesDrop }: ImageBlockProps) {
  const [hovered, setHovered] = useState(false);
  const [fileDragOver, setFileDragOver] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [resizePercent, setResizePercent] = useState(block.data.widthPercent ?? 100);
  const [resizing, setResizing] = useState<"left" | "right" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startWidth = useRef(100);

  const showOverlay = hovered || menuOpen || resizing !== null;

  function openPicker() {
    if (!block.data.url) setDialogOpen(true);
  }

  function upload(file: File) {
    startTransition(async () => {
      setUploadError(null);
      const result = await uploadAdminImage(file);
      if (!result.ok) {
        setUploadError(result.error);
        return;
      }
      onChange({ ...block, data: { ...block.data, url: result.url, widthPercent: resizePercent } });
      setDialogOpen(false);
    });
  }

  function applyUrl() {
    if (!linkUrl.trim()) return;
    onChange({ ...block, data: { ...block.data, url: linkUrl.trim(), widthPercent: resizePercent } });
    setDialogOpen(false);
    setLinkUrl("");
  }

  function startResize(side: "left" | "right", clientX: number) {
    setResizing(side);
    startX.current = clientX;
    startWidth.current = resizePercent;
  }

  function onResizeMove(clientX: number) {
    if (!resizing || !containerRef.current) return;
    const parentWidth = containerRef.current.parentElement?.clientWidth ?? 1;
    const delta = ((clientX - startX.current) / parentWidth) * 100;
    const next =
      resizing === "right" ? startWidth.current + delta : startWidth.current - delta;
    const clamped = Math.min(100, Math.max(25, Math.round(next)));
    setResizePercent(clamped);
    onChange({ ...block, data: { ...block.data, widthPercent: clamped } });
  }

  function endResize() {
    setResizing(null);
  }

  if (!block.data.url) {
    return (
      <>
        <button
          type="button"
          onClick={openPicker}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => !fileDragOver && setHovered(false)}
          onDragEnter={(event) => {
            if (!dataTransferHasImages(event.dataTransfer)) return;
            event.preventDefault();
            setFileDragOver(true);
          }}
          onDragLeave={() => setFileDragOver(false)}
          onDragOver={(event) => {
            if (!dataTransferHasImages(event.dataTransfer)) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";
          }}
          onDrop={(event) => {
            const files = extractImageFiles(event.dataTransfer);
            if (files.length === 0) return;
            event.preventDefault();
            event.stopPropagation();
            setFileDragOver(false);
            if (onFilesDrop) {
              onFilesDrop(files);
              return;
            }
            upload(files[0]!);
          }}
          className={cn(
            "w-full rounded-md py-16 text-center text-sm text-stone-500 transition-colors duration-[120ms]",
            fileDragOver
              ? "bg-amber-50 ring-2 ring-amber-400 dark:bg-amber-950/30"
              : hovered
                ? "bg-[#EFEFED]"
                : "bg-[#F7F6F3]",
          )}
        >
          {fileDragOver ? "Drop image here" : "Drop an image or click to browse"}
        </button>
        <ImagePickerDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          linkUrl={linkUrl}
          setLinkUrl={setLinkUrl}
          isPending={isPending}
          onUpload={upload}
          onApplyUrl={applyUrl}
          uploadError={uploadError}
        />
      </>
    );
  }

  return (
    <figure
      ref={containerRef}
      className="relative mx-auto"
      style={{ width: `${resizePercent}%`, maxWidth: "100%" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        if (!resizing) setHovered(false);
        setMenuOpen(false);
      }}
    >
      <div className="relative aspect-[16/10] overflow-hidden rounded-md">
        <AdminImage src={block.data.url} alt={block.data.alt ?? ""} fill />
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-[120ms] ease-out",
            showOverlay ? "bg-black/[0.03] opacity-100" : "opacity-0",
          )}
        />
        {showOverlay ? (
          <div className="absolute right-2 top-2 flex gap-1 transition-opacity duration-[120ms] ease-out">
            <button
              type="button"
              className="rounded bg-white/90 px-2 py-1 text-xs text-stone-600 shadow-sm hover:bg-white"
              onClick={() => {
                const cap = window.prompt("Caption", block.data.caption ?? "");
                if (cap !== null) onChange({ ...block, data: { ...block.data, caption: cap } });
              }}
            >
              ✎ Caption
            </button>
            <div className="relative">
              <button
                type="button"
                className="rounded bg-white/90 px-2 py-1 text-xs text-stone-600 shadow-sm hover:bg-white"
                onClick={() => setMenuOpen((o) => !o)}
              >
                ⋯ Plus
              </button>
              {menuOpen ? (
                <div className="absolute right-0 top-full z-50 mt-1 min-w-[140px] rounded-lg border border-stone-200 bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    className="block w-full px-3 py-1.5 text-left text-sm hover:bg-stone-50"
                    onClick={() => {
                      setMenuOpen(false);
                      setDialogOpen(true);
                    }}
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    className="block w-full px-3 py-1.5 text-left text-sm hover:bg-stone-50"
                    onClick={() => onChange({ ...block, data: { ...block.data, url: "" } })}
                  >
                    Delete
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
        {showOverlay ? (
          <>
            <ResizeHandle
              side="left"
              onPointerDown={(e) => {
                e.preventDefault();
                startResize("left", e.clientX);
              }}
            />
            <ResizeHandle
              side="right"
              onPointerDown={(e) => {
                e.preventDefault();
                startResize("right", e.clientX);
              }}
            />
          </>
        ) : null}
      </div>
      {resizing ? (
        <ResizeListeners onMove={onResizeMove} onEnd={endResize} />
      ) : null}
      {resizing ? (
        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 rounded bg-stone-800 px-2 py-0.5 text-xs text-white">
          {resizePercent}%
        </span>
      ) : null}
      <CaptionField
        value={block.data.caption ?? ""}
        hovered={hovered}
        onChange={(caption) => onChange({ ...block, data: { ...block.data, caption } })}
      />
      <div className={cn("mt-2 space-y-1.5", !showOverlay && !block.data.alt && !block.data.decorative ? "opacity-100" : showOverlay ? "opacity-100" : "opacity-0")}>
        <label className="block">
          <span className="text-[11px] font-medium uppercase tracking-wide text-stone-500">Alt text</span>
          <input
            type="text"
            value={block.data.alt ?? ""}
            disabled={block.data.decorative}
            onChange={(event) =>
              onChange({ ...block, data: { ...block.data, alt: event.target.value, decorative: false } })
            }
            placeholder="Describe the image for screen readers and SEO"
            className="mt-1 w-full rounded-md border border-stone-200 bg-white px-2 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-900"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-stone-500">
          <input
            type="checkbox"
            checked={Boolean(block.data.decorative)}
            onChange={(event) =>
              onChange({
                ...block,
                data: {
                  ...block.data,
                  decorative: event.target.checked,
                  alt: event.target.checked ? "" : block.data.alt,
                },
              })
            }
          />
          Decorative (empty alt on purpose)
        </label>
        {!block.data.decorative && !(block.data.alt ?? "").trim() ? (
          <p className="text-xs font-medium text-amber-600">Missing alt text — add a description or mark decorative.</p>
        ) : null}
      </div>
      <ImagePickerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        linkUrl={linkUrl}
        setLinkUrl={setLinkUrl}
        isPending={isPending}
        onUpload={upload}
        onApplyUrl={applyUrl}
        uploadError={uploadError}
      />
    </figure>
  );
}

function ResizeHandle({
  side,
  onPointerDown,
}: {
  side: "left" | "right";
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  return (
    <button
      type="button"
      aria-label="Resize"
      onPointerDown={onPointerDown}
      className={cn(
        "absolute top-1/2 z-10 h-12 w-1 -translate-y-1/2 rounded-full bg-stone-400/80 transition-opacity duration-[120ms]",
        side === "left" ? "left-1" : "right-1",
      )}
    />
  );
}

function ResizeListeners({ onMove, onEnd }: { onMove: (x: number) => void; onEnd: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] cursor-col-resize"
      onPointerMove={(e) => onMove(e.clientX)}
      onPointerUp={onEnd}
      onPointerCancel={onEnd}
    />
  );
}

function CaptionField({
  value,
  hovered,
  onChange,
}: {
  value: string;
  hovered: boolean;
  onChange: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  if (!value && !hovered && !editing) return null;

  return (
    <figcaption className="mt-2 text-center">
      {editing ? (
        <input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setEditing(false)}
          placeholder="Add a caption…"
          className="w-full border-0 bg-transparent text-center text-sm italic text-stone-500 outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={cn(
            "text-sm italic text-[#999]",
            !value && "text-stone-400",
          )}
        >
          {value || (hovered ? "Add a caption…" : "")}
        </button>
      )}
    </figcaption>
  );
}

function ImagePickerDialog({
  open,
  onOpenChange,
  linkUrl,
  setLinkUrl,
  isPending,
  onUpload,
  onApplyUrl,
  uploadError,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  linkUrl: string;
  setLinkUrl: (url: string) => void;
  isPending: boolean;
  onUpload: (file: File) => void;
  onApplyUrl: () => void;
  uploadError?: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Image</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="upload">
          <TabsList className="w-full">
            <TabsTrigger value="upload" className="flex-1">
              Upload
            </TabsTrigger>
            <TabsTrigger value="link" className="flex-1">
              URL
            </TabsTrigger>
          </TabsList>
          <TabsContent value="upload" className="pt-3">
            <input
              type="file"
              accept="image/*"
              className="text-sm"
              onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
            />
            {isPending ? <p className="mt-2 text-xs text-stone-500">Uploading…</p> : null}
            {uploadError ? <p className="mt-2 text-xs text-red-600">{uploadError}</p> : null}
          </TabsContent>
          <TabsContent value="link" className="space-y-2 pt-3">
            <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" />
            <button
              type="button"
              onClick={onApplyUrl}
              className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white"
            >
              Insert
            </button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
