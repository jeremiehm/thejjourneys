"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { Editor } from "@tiptap/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createId } from "@/lib/blocks/defaults";
import {
  applyDrop,
  createEmptyLeaf,
  detectDropZone,
  duplicateBlock,
  findBlockLocation,
  countLeafBlocks,
  getPreviousLeafBlockId,
  listLeafBlockIds,
  mapLeafBlock,
  removeBlockAt,
  removeBlocksByIds,
  updateRowFlexes,
} from "@/lib/blocks/content-ops";
import type { DropZone } from "@/lib/blocks/editor-types";
import {
  isLeafBlock,
  isRowBlock,
  columnsToRow,
  normalizeEditorBlocks,
  serializeEditorBlocks,
  type EditorBlock,
  type EditorLeafBlock,
} from "@/lib/blocks/editor-types";
import type { ArticleBlock, RowBlock } from "@/lib/blocks/types";
import type { MarkdownEditorSegment } from "@/lib/markdown-editor";
import { BlockWrapper, type BlockContextMenuAction } from "@/components/admin/NotionEditor/BlockWrapper";
import { DragIndicator } from "@/components/admin/NotionEditor/DragIndicator";
import { FlexRowWrapper } from "@/components/admin/NotionEditor/FlexRowWrapper";
import { ImageBlock } from "@/components/admin/NotionEditor/ImageBlock";
import { NotionEditor, focusNotionEditor } from "@/components/admin/NotionEditor/NotionEditor";
import { SlashMenu, type SlashMenuRef } from "@/components/admin/NotionEditor/SlashMenu";
import type { NewBlockPayload } from "@/components/admin/NotionEditor/notion-block-enter";
import {
  applySlashToEditor,
  deleteSlashCommand,
  getSlashMenuRect,
} from "@/components/admin/NotionEditor/slash-command";
import type { SlashItem } from "@/components/admin/NotionEditor/slash-items";
import { uploadAdminImage } from "@/lib/admin/upload-image";
import { blockIdAtPoint, dataTransferHasImages, extractImageFiles } from "@/lib/admin/image-drop";
import { cn } from "@/lib/utils";
import type { Dispatch, SetStateAction } from "react";

function getLastLeafBlockId(blocks: EditorBlock[]): string | null {
  for (let i = blocks.length - 1; i >= 0; i -= 1) {
    const block = blocks[i]!;
    if (isRowBlock(block)) {
      return block.data.children[block.data.children.length - 1]!.block.id;
    }
    if (isLeafBlock(block)) return block.id;
  }
  return null;
}

function insertLeavesAfter(blocks: EditorBlock[], afterBlockId: string, leaves: EditorLeafBlock[]): EditorBlock[] {
  const loc = findBlockLocation(blocks, afterBlockId);
  if (!loc || leaves.length === 0) return blocks;

  const next = structuredClone(blocks) as EditorBlock[];
  if (loc.kind === "root") {
    next.splice(loc.index + 1, 0, ...leaves);
    return next;
  }

  const row = next[loc.rowIndex] as RowBlock;
  const newSlots = leaves.map((leaf) => ({
    slotId: createId(),
    flex: 0,
    block: leaf as RowBlock["data"]["children"][number]["block"],
  }));
  row.data.children.splice(loc.slotIndex + 1, 0, ...newSlots);
  const flex = 1 / row.data.children.length;
  row.data.children = row.data.children.map((c) => ({ ...c, flex }));
  next[loc.rowIndex] = row;
  return next;
}

type NotionBlockEditorProps = {
  blocks: ArticleBlock[];
  onChange: Dispatch<SetStateAction<ArticleBlock[]>>;
  editorRef?: React.MutableRefObject<import("@tiptap/core").Editor | null>;
  onExternalRegisterEditor?: (blockId: string, editor: Editor | null) => void;
};

type DropState = { overId: string; zone: DropZone };

function rangeSelectIds(orderedIds: string[], anchorId: string, targetId: string): string[] {
  const a = orderedIds.indexOf(anchorId);
  const b = orderedIds.indexOf(targetId);
  if (a < 0 || b < 0) return [targetId];
  const [from, to] = a < b ? [a, b] : [b, a];
  return orderedIds.slice(from, to + 1);
}

export function NotionBlockEditor({ blocks, onChange, editorRef, onExternalRegisterEditor }: NotionBlockEditorProps) {
  const editorBlocks = useMemo(() => normalizeEditorBlocks(blocks), [blocks]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dropState, setDropState] = useState<DropState | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectionAnchorRef = useRef<string | null>(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );
  const slashRef = useRef<SlashMenuRef>(null);
  const editorsByBlockId = useRef(new Map<string, Editor>());
  const pendingFocusBlockId = useRef<string | null>(null);
  const [slashState, setSlashState] = useState<{
    blockId: string;
    query: string;
    rect: () => DOMRect | null;
  } | null>(null);
  const [isFileDragOver, setIsFileDragOver] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const fileDragDepthRef = useRef(0);

  const setEditorBlocks = useCallback(
    (next: SetStateAction<EditorBlock[]>) => {
      onChange((prev) => {
        const current = normalizeEditorBlocks(prev);
        const resolved = typeof next === "function" ? next(current) : next;
        return serializeEditorBlocks(resolved);
      });
    },
    [onChange],
  );

  useEffect(() => {
    if (!slashState) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSlashState(null);
        return;
      }
      if (slashRef.current?.onKeyDown(event)) {
        event.preventDefault();
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [slashState]);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
    selectionAnchorRef.current = null;
  }, []);

  const selectBlocks = useCallback(
    (blockId: string, event: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }) => {
      const ordered = listLeafBlockIds(editorBlocks);
      if (event.shiftKey && selectionAnchorRef.current) {
        setSelectedIds(rangeSelectIds(ordered, selectionAnchorRef.current, blockId));
        return;
      }
      if (event.metaKey || event.ctrlKey) {
        setSelectedIds((prev) => {
          if (prev.includes(blockId)) return prev.filter((id) => id !== blockId);
          return [...prev, blockId];
        });
        selectionAnchorRef.current = blockId;
        return;
      }
      setSelectedIds([blockId]);
      selectionAnchorRef.current = blockId;
    },
    [editorBlocks],
  );

  const deleteSelectedBlocks = useCallback(() => {
    if (selectedIds.length === 0) return;
    setEditorBlocks((prev) => removeBlocksByIds(prev, selectedIds));
    clearSelection();
  }, [clearSelection, selectedIds, setEditorBlocks]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (selectedIds.length === 0) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest?.(".ProseMirror, input, textarea, [contenteditable='true']")) return;
      if (event.key === "Escape") {
        clearSelection();
        return;
      }
      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        deleteSelectedBlocks();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [clearSelection, deleteSelectedBlocks, selectedIds.length]);

  const updateBlock = useCallback(
    (id: string, updater: (block: EditorLeafBlock) => EditorLeafBlock) => {
      setEditorBlocks((prev) => mapLeafBlock(prev, id, updater));
    },
    [setEditorBlocks],
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
    const handler = (e: PointerEvent) => {
      pointerRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("pointermove", handler);
    (window as unknown as { __notionDragPointer?: typeof handler }).__notionDragPointer = handler;
  }

  function handleDragMove(event: DragMoveEvent) {
    const overId = event.over?.id ? String(event.over.id) : null;
    if (!overId || overId === activeId) {
      setDropState(null);
      return;
    }
    const el = document.querySelector(`[data-droppable-id="${overId}"]`);
    const rect = el?.getBoundingClientRect();
    if (!rect) {
      setDropState(null);
      return;
    }
    const zone = detectDropZone(rect, pointerRef.current.x, pointerRef.current.y);
    setDropState({ overId, zone });
  }

  function handleDragEnd(event: DragEndEvent) {
    const handler = (window as unknown as { __notionDragPointer?: (e: PointerEvent) => void }).__notionDragPointer;
    if (handler) window.removeEventListener("pointermove", handler);

    setActiveId(null);
    setDropState(null);

    const active = event.active.id ? String(event.active.id) : null;
    const over = event.over?.id ? String(event.over.id) : null;
    if (!active || !over || !dropState) return;

    setEditorBlocks((prev) => applyDrop(prev, active, over, dropState.zone));
  }

  function handleContextAction(blockId: string, action: BlockContextMenuAction) {
    if (action.type === "delete") {
      if (selectedIds.length > 1 && selectedIds.includes(blockId)) {
        deleteSelectedBlocks();
        return;
      }
      setEditorBlocks((prev) => {
        const loc = findBlockLocation(prev, blockId);
        return loc ? removeBlockAt(prev, loc) : prev;
      });
      clearSelection();
      return;
    }
    if (action.type === "duplicate") {
      setEditorBlocks((prev) => duplicateBlock(prev, blockId));
      return;
    }
    if (action.type === "copyLink") {
      const url = `${window.location.href}#block-${blockId}`;
      void navigator.clipboard.writeText(url);
      return;
    }
    if (action.type === "transform") {
      updateBlock(blockId, () => createEmptyLeaf(action.blockType));
    }
  }

  const registerEditor = useCallback((blockId: string, editor: Editor | null) => {
    if (editor) editorsByBlockId.current.set(blockId, editor);
    else editorsByBlockId.current.delete(blockId);
    onExternalRegisterEditor?.(blockId, editor);
  }, [onExternalRegisterEditor]);

  const focusBlock = useCallback((blockId: string) => {
    const tryFocus = (attempt = 0) => {
      const editor = editorsByBlockId.current.get(blockId);
      if (editor) {
        editor.chain().focus("end").run();
        return;
      }
      if (attempt < 8) {
        requestAnimationFrame(() => tryFocus(attempt + 1));
        return;
      }
      focusNotionEditor(editorRef?.current ?? null);
    };
    requestAnimationFrame(() => tryFocus());
  }, [editorRef]);

  useEffect(() => {
    const blockId = pendingFocusBlockId.current;
    if (!blockId) return;
    pendingFocusBlockId.current = null;
    focusBlock(blockId);
  }, [editorBlocks, focusBlock]);

  function insertAfter(blockId: string, leaf: EditorLeafBlock, options?: { focus?: boolean }) {
    setEditorBlocks((prev) => {
      const loc = findBlockLocation(prev, blockId);
      if (!loc) return prev;
      const next = structuredClone(prev) as EditorBlock[];
      if (loc.kind === "root") {
        next.splice(loc.index + 1, 0, leaf);
      } else {
        const row = next[loc.rowIndex] as RowBlock;
        row.data.children.splice(loc.slotIndex + 1, 0, {
          slotId: createId(),
          flex: 1 / (row.data.children.length + 1),
          block: leaf,
        });
        const flex = 1 / row.data.children.length;
        row.data.children = row.data.children.map((c) => ({ ...c, flex }));
        next[loc.rowIndex] = row;
      }
      return next;
    });
    if (options?.focus !== false && leaf.type === "text") {
      setTimeout(() => focusBlock(leaf.id), 0);
    }
  }

  const deleteLeafBlock = useCallback(
    (blockId: string) => {
      let deleted = false;
      setEditorBlocks((prev) => {
        if (countLeafBlocks(prev) <= 1) return prev;
        const loc = findBlockLocation(prev, blockId);
        if (!loc) return prev;
        const previousId = getPreviousLeafBlockId(prev, blockId);
        if (previousId) pendingFocusBlockId.current = previousId;
        deleted = true;
        return removeBlockAt(prev, loc);
      });
      if (deleted) clearSelection();
      return deleted;
    },
    [clearSelection, setEditorBlocks],
  );

  const insertTextBlockAfter = useCallback(
    (afterBlockId: string, payload: NewBlockPayload = {}) => {
      const markdown = payload.markdown ?? "";
      const leaf = createEmptyLeaf("text");
      if (markdown && leaf.type === "text") leaf.data.markdown = markdown;

      setEditorBlocks((prev) => {
        let next = prev;
        if (payload.remainingMarkdown !== undefined) {
          next = mapLeafBlock(next, afterBlockId, (block) =>
            block.type === "text" ? { ...block, data: { ...block.data, markdown: payload.remainingMarkdown! } } : block,
          );
        }

        const loc = findBlockLocation(next, afterBlockId);
        if (!loc) return next;
        next = structuredClone(next) as EditorBlock[];
        if (loc.kind === "root") {
          const freshLoc = findBlockLocation(next, afterBlockId);
          if (!freshLoc || freshLoc.kind !== "root") return next;
          next.splice(freshLoc.index + 1, 0, leaf);
        } else {
          const freshLoc = findBlockLocation(next, afterBlockId);
          if (!freshLoc || freshLoc.kind !== "row") return next;
          const row = next[freshLoc.rowIndex] as RowBlock;
          row.data.children.splice(freshLoc.slotIndex + 1, 0, {
            slotId: createId(),
            flex: 1 / (row.data.children.length + 1),
            block: leaf,
          });
          const flex = 1 / row.data.children.length;
          row.data.children = row.data.children.map((c) => ({ ...c, flex }));
          next[freshLoc.rowIndex] = row;
        }
        return next;
      });
      setTimeout(() => focusBlock(leaf.id), 0);
    },
    [focusBlock, setEditorBlocks],
  );

  const insertMarkdownSegmentsAfter = useCallback(
    (afterBlockId: string, segments: MarkdownEditorSegment[]) => {
      if (segments.length === 0) return;

      const leaves: EditorLeafBlock[] = segments.map((segment) => {
        if (segment.type === "divider") return createEmptyLeaf("divider");
        const leaf = createEmptyLeaf("text");
        if (leaf.type === "text") leaf.data.markdown = segment.markdown;
        return leaf;
      });

      const focusId =
        [...leaves].reverse().find((leaf) => leaf.type === "text")?.id ?? leaves[leaves.length - 1]?.id ?? null;
      if (focusId) pendingFocusBlockId.current = focusId;

      setEditorBlocks((prev) => {
        const loc = findBlockLocation(prev, afterBlockId);
        if (!loc) return prev;
        const next = structuredClone(prev) as EditorBlock[];
        if (loc.kind === "root") {
          const freshLoc = findBlockLocation(next, afterBlockId);
          if (!freshLoc || freshLoc.kind !== "root") return next;
          next.splice(freshLoc.index + 1, 0, ...leaves);
          return next;
        }
        const freshLoc = findBlockLocation(next, afterBlockId);
        if (!freshLoc || freshLoc.kind !== "row") return next;
        const row = next[freshLoc.rowIndex] as RowBlock;
        const inserts = leaves.map((block) => ({
          slotId: createId(),
          flex: 1,
          block,
        }));
        row.data.children.splice(freshLoc.slotIndex + 1, 0, ...inserts);
        const flex = 1 / row.data.children.length;
        row.data.children = row.data.children.map((c) => ({ ...c, flex }));
        next[freshLoc.rowIndex] = row;
        return next;
      });
    },
    [setEditorBlocks],
  );

  function openSlashForNewBlock(afterBlockId: string) {
    const leaf = createEmptyLeaf("text");
    insertAfter(afterBlockId, leaf);
    setTimeout(() => {
      const editor = editorsByBlockId.current.get(leaf.id);
      const rect = editor
        ? () => getSlashMenuRect(editor)
        : () => document.querySelector(`[data-block-id="${leaf.id}"]`)?.getBoundingClientRect() ?? null;
      setSlashState({ blockId: leaf.id, query: "", rect });
      focusBlock(leaf.id);
    }, 0);
  }

  const insertImageFiles = useCallback(
    async (files: File[], anchorBlockId?: string) => {
      if (files.length === 0) return;

      setImageUploading(true);
      setImageUploadError(null);

      try {
        const targetId =
          anchorBlockId ??
          getLastLeafBlockId(editorBlocks) ??
          editorBlocks[editorBlocks.length - 1]?.id ??
          null;
        if (!targetId) return;

        const loc = findBlockLocation(editorBlocks, targetId);
        const targetBlock =
          loc?.kind === "root"
            ? (loc.block as EditorLeafBlock)
            : loc?.kind === "row"
              ? loc.slot.block
              : null;

        if (targetBlock?.type === "image" && !targetBlock.data.url && files.length === 1) {
          const result = await uploadAdminImage(files[0]!);
          if (!result.ok) throw new Error(result.error);
          updateBlock(targetId, (b) =>
            b.type === "image" ? { ...b, data: { ...b.data, url: result.url } } : b,
          );
          return;
        }

        const leaves: EditorLeafBlock[] = [];
        for (const file of files) {
          const result = await uploadAdminImage(file);
          if (!result.ok) throw new Error(result.error);
          const leaf = createEmptyLeaf("image");
          if (leaf.type === "image") {
            leaf.data.url = result.url;
          }
          leaves.push(leaf);
        }

        setEditorBlocks((prev) => insertLeavesAfter(prev, targetId, leaves));
      } catch (error) {
        setImageUploadError(error instanceof Error ? error.message : "Upload failed");
      } finally {
        setImageUploading(false);
        setIsFileDragOver(false);
        fileDragDepthRef.current = 0;
      }
    },
    [editorBlocks, setEditorBlocks, updateBlock],
  );

  function handleFileDragEnter(event: React.DragEvent) {
    if (!dataTransferHasImages(event.dataTransfer)) return;
    event.preventDefault();
    fileDragDepthRef.current += 1;
    setIsFileDragOver(true);
  }

  function handleFileDragLeave() {
    fileDragDepthRef.current -= 1;
    if (fileDragDepthRef.current <= 0) {
      fileDragDepthRef.current = 0;
      setIsFileDragOver(false);
    }
  }

  function handleFileDragOver(event: React.DragEvent) {
    if (!dataTransferHasImages(event.dataTransfer)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleFileDrop(event: React.DragEvent) {
    const files = extractImageFiles(event.dataTransfer);
    if (files.length === 0) return;
    event.preventDefault();
    event.stopPropagation();
    fileDragDepthRef.current = 0;
    setIsFileDragOver(false);
    const anchorId = blockIdAtPoint(event.clientX, event.clientY) ?? undefined;
    void insertImageFiles(files, anchorId);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      <div
        className={cn(
          "notion-block-editor relative space-y-1",
          isFileDragOver && "notion-block-editor--file-drag",
        )}
        onDragEnter={handleFileDragEnter}
        onDragLeave={handleFileDragLeave}
        onDragOver={handleFileDragOver}
        onDrop={handleFileDrop}
      >
        {isFileDragOver ? (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-lg border-2 border-dashed border-amber-400 bg-amber-50/80 dark:bg-amber-950/30">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Drop to add image</p>
          </div>
        ) : null}
        {imageUploading ? (
          <p className="text-xs text-stone-500">Uploading image…</p>
        ) : null}
        {imageUploadError ? (
          <p className="text-xs text-red-600">{imageUploadError}</p>
        ) : null}
        {selectedIds.length > 1 ? (
          <div className="sticky top-2 z-30 mb-2 flex items-center gap-2 rounded-lg border border-stone-200 bg-white/95 px-3 py-2 text-sm shadow-sm backdrop-blur dark:border-stone-700 dark:bg-stone-900/95">
            <span className="text-stone-600 dark:text-stone-300">{selectedIds.length} blocks selected</span>
            <button
              type="button"
              className="rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300"
              onClick={deleteSelectedBlocks}
            >
              Delete
            </button>
            <button
              type="button"
              className="rounded-md px-2.5 py-1 text-xs font-medium text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
              onClick={clearSelection}
            >
              Clear
            </button>
            <span className="ml-auto hidden text-[11px] text-stone-400 sm:inline">
              Shift+click or ⌘/Ctrl+click on ⠿ · Delete to remove
            </span>
          </div>
        ) : null}
        {editorBlocks.map((block, index) => (
          <RootBlockNode
            key={block.id}
            block={block}
            index={index}
            activeId={activeId}
            dropState={dropState}
            selectedIds={selectedIds}
            editorRef={index === 0 && block.type === "text" ? editorRef : undefined}
            onUpdateLeaf={(id, leaf) => {
              clearSelection();
              updateBlock(id, () => leaf);
            }}
            onContextAction={handleContextAction}
            onAddBelow={openSlashForNewBlock}
            onNewBlock={insertTextBlockAfter}
            onPasteMarkdownSegments={insertMarkdownSegmentsAfter}
            onDeleteBlock={deleteLeafBlock}
            onRegisterEditor={registerEditor}
            onSelectBlock={selectBlocks}
            onRowFlexChange={(rowId, flexes) =>
              setEditorBlocks((prev) => updateRowFlexes(prev, rowId, flexes))
            }
            onSlash={(blockId, state, rect) => {
              if (!state) setSlashState(null);
              else setSlashState({ blockId, query: state.query, rect: rect ?? (() => null) });
            }}
            onImageFilesDrop={(files, blockId) => void insertImageFiles(files, blockId)}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeId ? (
          <div className="rounded-md bg-stone-100/80 px-4 py-2 text-sm text-stone-500 shadow-sm">Move…</div>
        ) : null}
      </DragOverlay>

      {slashState ? (
        <SlashMenu
          ref={slashRef}
          query={slashState.query}
          clientRect={slashState.rect}
          onSelect={(item) => {
            applySlashItem(item, slashState.blockId, editorsByBlockId.current, updateBlock);
            setSlashState(null);
          }}
        />
      ) : null}
    </DndContext>
  );
}

function RootBlockNode({
  block,
  index,
  activeId,
  dropState,
  selectedIds,
  editorRef,
  onUpdateLeaf,
  onContextAction,
  onAddBelow,
  onNewBlock,
  onPasteMarkdownSegments,
  onDeleteBlock,
  onRegisterEditor,
  onSelectBlock,
  onRowFlexChange,
  onSlash,
  onImageFilesDrop,
}: {
  block: EditorBlock;
  index: number;
  activeId: string | null;
  dropState: DropState | null;
  selectedIds: string[];
  editorRef?: React.MutableRefObject<import("@tiptap/core").Editor | null>;
  onUpdateLeaf: (id: string, leaf: EditorLeafBlock) => void;
  onContextAction: (id: string, action: BlockContextMenuAction) => void;
  onAddBelow: (id: string) => void;
  onNewBlock: (afterBlockId: string, payload?: NewBlockPayload) => void;
  onPasteMarkdownSegments: (afterBlockId: string, segments: MarkdownEditorSegment[]) => void;
  onDeleteBlock: (blockId: string) => boolean;
  onRegisterEditor: (blockId: string, editor: Editor | null) => void;
  onSelectBlock: (blockId: string, event: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }) => void;
  onRowFlexChange: (rowId: string, flexes: number[]) => void;
  onSlash: (
    blockId: string,
    state: { query: string } | null,
    rect: (() => DOMRect | null) | null,
  ) => void;
  onImageFilesDrop: (files: File[], blockId: string) => void;
}) {
  if (block.type === "row") {
    const row = block;
    return (
      <RowDropTarget rowId={row.id} activeId={activeId} dropState={dropState}>
        <FlexRowWrapper row={row} onFlexChange={(flexes) => onRowFlexChange(row.id, flexes)}>
          {row.data.children.map((slot) => (
            <LeafBlockNode
              key={slot.slotId}
              droppableId={slot.slotId}
              block={slot.block}
              activeId={activeId}
              dropState={dropState}
              selected={selectedIds.includes(slot.block.id)}
              onUpdate={(leaf) => onUpdateLeaf(slot.block.id, leaf)}
              onContextAction={(action) => onContextAction(slot.block.id, action)}
              onAddBelow={() => onAddBelow(slot.block.id)}
              onNewBlock={onNewBlock}
              onPasteMarkdownSegments={onPasteMarkdownSegments}
              onDeleteBlock={onDeleteBlock}
              onRegisterEditor={onRegisterEditor}
              onSelectBlock={onSelectBlock}
              onSlash={onSlash}
              onImageFilesDrop={onImageFilesDrop}
            />
          ))}
        </FlexRowWrapper>
      </RowDropTarget>
    );
  }

  if (!isLeafBlock(block)) return null;

  return (
    <LeafBlockNode
      droppableId={block.id}
      block={block}
      activeId={activeId}
      dropState={dropState}
      selected={selectedIds.includes(block.id)}
      editorRef={editorRef}
      onUpdate={(leaf) => onUpdateLeaf(block.id, leaf)}
      onContextAction={(action) => onContextAction(block.id, action)}
      onAddBelow={() => onAddBelow(block.id)}
      onNewBlock={onNewBlock}
      onPasteMarkdownSegments={onPasteMarkdownSegments}
      onDeleteBlock={onDeleteBlock}
      onRegisterEditor={onRegisterEditor}
      onSelectBlock={onSelectBlock}
      onSlash={onSlash}
      onImageFilesDrop={onImageFilesDrop}
    />
  );
}

function RowDropTarget({
  rowId,
  activeId,
  dropState,
  children,
}: {
  rowId: string;
  activeId: string | null;
  dropState: DropState | null;
  children: React.ReactNode;
}) {
  const { setNodeRef } = useDroppable({ id: rowId });
  const showIndicator = dropState?.overId === rowId && activeId !== rowId;
  return (
    <div ref={setNodeRef} data-droppable-id={rowId} className="relative my-1">
      {showIndicator && dropState ? <DragIndicator zone={dropState.zone} /> : null}
      {children}
    </div>
  );
}

function LeafBlockNode({
  droppableId,
  block,
  activeId,
  dropState,
  selected,
  editorRef,
  onUpdate,
  onContextAction,
  onAddBelow,
  onNewBlock,
  onPasteMarkdownSegments,
  onDeleteBlock,
  onRegisterEditor,
  onSelectBlock,
  onSlash,
  onImageFilesDrop,
}: {
  droppableId: string;
  block: EditorLeafBlock;
  activeId: string | null;
  dropState: DropState | null;
  selected: boolean;
  editorRef?: React.MutableRefObject<import("@tiptap/core").Editor | null>;
  onUpdate: (leaf: EditorLeafBlock) => void;
  onContextAction: (action: BlockContextMenuAction) => void;
  onAddBelow: () => void;
  onNewBlock: (afterBlockId: string, payload?: NewBlockPayload) => void;
  onPasteMarkdownSegments: (afterBlockId: string, segments: MarkdownEditorSegment[]) => void;
  onDeleteBlock: (blockId: string) => boolean;
  onRegisterEditor: (blockId: string, editor: Editor | null) => void;
  onSelectBlock: (blockId: string, event: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }) => void;
  onSlash: (
    blockId: string,
    state: { query: string } | null,
    rect: (() => DOMRect | null) | null,
  ) => void;
  onImageFilesDrop: (files: File[], blockId: string) => void;
}) {
  const { setNodeRef: setDropRef } = useDroppable({ id: droppableId });
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({ id: droppableId });

  const setRef = (el: HTMLDivElement | null) => {
    setDropRef(el);
    setDragRef(el);
  };

  const showIndicator = dropState?.overId === droppableId && activeId !== droppableId;

  return (
    <div ref={setRef} data-droppable-id={droppableId} className="relative">
      {showIndicator && dropState ? <DragIndicator zone={dropState.zone} /> : null}
      <BlockWrapper
        blockId={block.id}
        selected={selected}
        isDragging={isDragging}
        dragAttributes={attributes}
        dragListeners={listeners}
        onAddBelow={onAddBelow}
        onContextAction={onContextAction}
        onSelect={(event) => onSelectBlock(block.id, event)}
      >
        <BlockContent
          block={block}
          editorRef={editorRef}
          onUpdate={onUpdate}
          onNewBlock={(payload) => onNewBlock(block.id, payload)}
          onPasteMarkdownSegments={(segments) => onPasteMarkdownSegments(block.id, segments)}
          onDeleteBlock={() => onDeleteBlock(block.id)}
          onRegisterEditor={onRegisterEditor}
          onSlash={onSlash}
          onImageFilesDrop={(files) => onImageFilesDrop(files, block.id)}
        />
      </BlockWrapper>
    </div>
  );
}

function BlockContent({
  block,
  editorRef,
  onUpdate,
  onNewBlock,
  onPasteMarkdownSegments,
  onDeleteBlock,
  onRegisterEditor,
  onSlash,
  onImageFilesDrop,
}: {
  block: EditorLeafBlock;
  editorRef?: React.MutableRefObject<import("@tiptap/core").Editor | null>;
  onUpdate: (leaf: EditorLeafBlock) => void;
  onNewBlock: (payload?: NewBlockPayload) => void;
  onPasteMarkdownSegments: (segments: MarkdownEditorSegment[]) => void;
  onDeleteBlock: () => boolean;
  onRegisterEditor: (blockId: string, editor: Editor | null) => void;
  onSlash: (
    blockId: string,
    state: { query: string } | null,
    rect: (() => DOMRect | null) | null,
  ) => void;
  onImageFilesDrop: (files: File[]) => void;
}) {
  if (block.type === "text") {
    return (
      <NotionEditor
        value={block.data.markdown}
        onChange={(markdown) => onUpdate({ ...block, data: { ...block.data, markdown } })}
        editorRef={editorRef}
        blockMode
        blockId={block.id}
        onRegisterEditor={onRegisterEditor}
        onNewBlock={(payload) => onNewBlock(payload)}
        onPasteMarkdownSegments={onPasteMarkdownSegments}
        onDeleteBlock={onDeleteBlock}
        onSlashTrigger={(state, rect) => onSlash(block.id, state, rect)}
        onImageFilesDrop={onImageFilesDrop}
      />
    );
  }
  if (block.type === "image") {
    return <ImageBlock block={block} onChange={onUpdate} onFilesDrop={onImageFilesDrop} />;
  }
  if (block.type === "divider") {
    return <hr className="my-4 border-stone-200 dark:border-stone-700" />;
  }
  if (block.type === "quote") {
    return (
      <textarea
        value={block.data.text}
        onChange={(e) => onUpdate({ ...block, data: { ...block.data, text: e.target.value } })}
        placeholder="Quote…"
        rows={2}
        className="w-full resize-none border-0 bg-transparent text-xl font-medium italic text-stone-800 outline-none dark:text-stone-200"
      />
    );
  }
  return null;
}

function applySlashItem(
  item: SlashItem,
  blockId: string,
  editorsByBlockId: Map<string, Editor>,
  updateBlock: (id: string, updater: (b: EditorLeafBlock) => EditorLeafBlock) => void,
) {
  const editor = editorsByBlockId.get(blockId);

  if (item.id === "image") {
    if (editor) deleteSlashCommand(editor);
    updateBlock(blockId, () => createEmptyLeaf("image"));
    return;
  }

  if (item.id === "divider") {
    if (editor) deleteSlashCommand(editor);
    updateBlock(blockId, () => createEmptyLeaf("divider"));
    return;
  }

  if (editor) {
    applySlashToEditor(editor, item, {
      onOpenImageDialog: () => updateBlock(blockId, () => createEmptyLeaf("image")),
    });
  }
}

export { focusNotionEditor };
