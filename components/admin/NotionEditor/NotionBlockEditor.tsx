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
  removeBlockAt,
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
import { BlockWrapper, type BlockContextMenuAction } from "@/components/admin/NotionEditor/BlockWrapper";
import { DragIndicator } from "@/components/admin/NotionEditor/DragIndicator";
import { FlexRowWrapper } from "@/components/admin/NotionEditor/FlexRowWrapper";
import { ImageBlock } from "@/components/admin/NotionEditor/ImageBlock";
import { NotionEditor, focusNotionEditor } from "@/components/admin/NotionEditor/NotionEditor";
import { SlashMenu, type SlashMenuRef } from "@/components/admin/NotionEditor/SlashMenu";
import {
  applySlashToEditor,
  deleteSlashCommand,
  getSlashMenuRect,
} from "@/components/admin/NotionEditor/slash-command";
import type { SlashItem } from "@/components/admin/NotionEditor/slash-items";
import { cn } from "@/lib/utils";

type NotionBlockEditorProps = {
  blocks: ArticleBlock[];
  onChange: (blocks: ArticleBlock[]) => void;
  editorRef?: React.MutableRefObject<import("@tiptap/core").Editor | null>;
  onExternalRegisterEditor?: (blockId: string, editor: Editor | null) => void;
};

type DropState = { overId: string; zone: DropZone };

export function NotionBlockEditor({ blocks, onChange, editorRef, onExternalRegisterEditor }: NotionBlockEditorProps) {
  const editorBlocks = useMemo(() => normalizeEditorBlocks(blocks), [blocks]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dropState, setDropState] = useState<DropState | null>(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );
  const slashRef = useRef<SlashMenuRef>(null);
  const editorsByBlockId = useRef(new Map<string, Editor>());
  const [slashState, setSlashState] = useState<{
    blockId: string;
    query: string;
    rect: () => DOMRect | null;
  } | null>(null);

  const setEditorBlocks = useCallback(
    (next: EditorBlock[]) => onChange(serializeEditorBlocks(next)),
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

  const updateBlock = useCallback(
    (id: string, updater: (block: EditorLeafBlock) => EditorLeafBlock) => {
      const next = editorBlocks.map((block) => {
        if (isRowBlock(block)) {
          return {
            ...block,
            data: {
              ...block.data,
              children: block.data.children.map((slot) =>
                slot.block.id === id ? { ...slot, block: updater(slot.block) } : slot,
              ),
            },
          };
        }
        if (block.id === id && isLeafBlock(block)) return updater(block);
        return block;
      });
      setEditorBlocks(next);
    },
    [editorBlocks, setEditorBlocks],
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

    setEditorBlocks(applyDrop(editorBlocks, active, over, dropState.zone));
  }

  function handleContextAction(blockId: string, action: BlockContextMenuAction) {
    if (action.type === "delete") {
      const loc = findBlockLocation(editorBlocks, blockId);
      if (loc) setEditorBlocks(removeBlockAt(editorBlocks, loc));
      return;
    }
    if (action.type === "duplicate") {
      setEditorBlocks(duplicateBlock(editorBlocks, blockId));
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
    requestAnimationFrame(() => {
      const editor = editorsByBlockId.current.get(blockId);
      if (editor) {
        editor.chain().focus("end").run();
        return;
      }
      focusNotionEditor(editorRef?.current ?? null);
    });
  }, [editorRef]);

  function insertAfter(blockId: string, leaf: EditorLeafBlock, options?: { focus?: boolean }) {
    const loc = findBlockLocation(editorBlocks, blockId);
    if (!loc) return;
    const next = [...editorBlocks];
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
    setEditorBlocks(next);
    if (options?.focus !== false && leaf.type === "text") {
      setTimeout(() => focusBlock(leaf.id), 0);
    }
  }

  const deleteLeafBlock = useCallback(
    (blockId: string) => {
      if (countLeafBlocks(editorBlocks) <= 1) return false;
      const loc = findBlockLocation(editorBlocks, blockId);
      if (!loc) return false;
      const previousId = getPreviousLeafBlockId(editorBlocks, blockId);
      setEditorBlocks(removeBlockAt(editorBlocks, loc));
      if (previousId) setTimeout(() => focusBlock(previousId), 0);
      return true;
    },
    [editorBlocks, focusBlock, setEditorBlocks],
  );

  const insertTextBlockAfter = useCallback(
    (afterBlockId: string, markdown = "") => {
      const leaf = createEmptyLeaf("text");
      if (markdown && leaf.type === "text") leaf.data.markdown = markdown;
      const loc = findBlockLocation(editorBlocks, afterBlockId);
      if (!loc) return;
      const next = [...editorBlocks];
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
      setEditorBlocks(next);
      setTimeout(() => focusBlock(leaf.id), 0);
    },
    [editorBlocks, focusBlock, setEditorBlocks],
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

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      <div className="notion-block-editor space-y-1">
        {editorBlocks.map((block, index) => (
          <RootBlockNode
            key={block.id}
            block={block}
            index={index}
            activeId={activeId}
            dropState={dropState}
            editorRef={index === 0 && block.type === "text" ? editorRef : undefined}
            onUpdateLeaf={(id, leaf) => updateBlock(id, () => leaf)}
            onContextAction={handleContextAction}
            onAddBelow={openSlashForNewBlock}
            onNewBlock={insertTextBlockAfter}
            onDeleteBlock={deleteLeafBlock}
            onRegisterEditor={registerEditor}
            onRowFlexChange={(rowId, flexes) => setEditorBlocks(updateRowFlexes(editorBlocks, rowId, flexes))}
            onSlash={(blockId, state, rect) => {
              if (!state) setSlashState(null);
              else setSlashState({ blockId, query: state.query, rect: rect ?? (() => null) });
            }}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeId ? (
          <div className="rounded-md bg-stone-100/80 px-4 py-2 text-sm text-stone-500 shadow-sm">Déplacer…</div>
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
  editorRef,
  onUpdateLeaf,
  onContextAction,
  onAddBelow,
  onNewBlock,
  onDeleteBlock,
  onRegisterEditor,
  onRowFlexChange,
  onSlash,
}: {
  block: EditorBlock;
  index: number;
  activeId: string | null;
  dropState: DropState | null;
  editorRef?: React.MutableRefObject<import("@tiptap/core").Editor | null>;
  onUpdateLeaf: (id: string, leaf: EditorLeafBlock) => void;
  onContextAction: (id: string, action: BlockContextMenuAction) => void;
  onAddBelow: (id: string) => void;
  onNewBlock: (afterBlockId: string, markdown?: string) => void;
  onDeleteBlock: (blockId: string) => boolean;
  onRegisterEditor: (blockId: string, editor: Editor | null) => void;
  onRowFlexChange: (rowId: string, flexes: number[]) => void;
  onSlash: (
    blockId: string,
    state: { query: string } | null,
    rect: (() => DOMRect | null) | null,
  ) => void;
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
              onUpdate={(leaf) => onUpdateLeaf(slot.block.id, leaf)}
              onContextAction={(action) => onContextAction(slot.block.id, action)}
              onAddBelow={() => onAddBelow(slot.block.id)}
              onNewBlock={onNewBlock}
              onDeleteBlock={onDeleteBlock}
              onRegisterEditor={onRegisterEditor}
              onSlash={onSlash}
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
      editorRef={editorRef}
      onUpdate={(leaf) => onUpdateLeaf(block.id, leaf)}
      onContextAction={(action) => onContextAction(block.id, action)}
      onAddBelow={() => onAddBelow(block.id)}
      onNewBlock={onNewBlock}
      onDeleteBlock={onDeleteBlock}
      onRegisterEditor={onRegisterEditor}
      onSlash={onSlash}
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
  editorRef,
  onUpdate,
  onContextAction,
  onAddBelow,
  onNewBlock,
  onDeleteBlock,
  onRegisterEditor,
  onSlash,
}: {
  droppableId: string;
  block: EditorLeafBlock;
  activeId: string | null;
  dropState: DropState | null;
  editorRef?: React.MutableRefObject<import("@tiptap/core").Editor | null>;
  onUpdate: (leaf: EditorLeafBlock) => void;
  onContextAction: (action: BlockContextMenuAction) => void;
  onAddBelow: () => void;
  onNewBlock: (afterBlockId: string, markdown?: string) => void;
  onDeleteBlock: (blockId: string) => boolean;
  onRegisterEditor: (blockId: string, editor: Editor | null) => void;
  onSlash: (
    blockId: string,
    state: { query: string } | null,
    rect: (() => DOMRect | null) | null,
  ) => void;
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
        isDragging={isDragging}
        dragAttributes={attributes}
        dragListeners={listeners}
        onAddBelow={onAddBelow}
        onContextAction={onContextAction}
      >
        <BlockContent
          block={block}
          editorRef={editorRef}
          onUpdate={onUpdate}
          onNewBlock={(markdown) => onNewBlock(block.id, markdown)}
          onDeleteBlock={() => onDeleteBlock(block.id)}
          onRegisterEditor={onRegisterEditor}
          onSlash={onSlash}
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
  onDeleteBlock,
  onRegisterEditor,
  onSlash,
}: {
  block: EditorLeafBlock;
  editorRef?: React.MutableRefObject<import("@tiptap/core").Editor | null>;
  onUpdate: (leaf: EditorLeafBlock) => void;
  onNewBlock: (markdown?: string) => void;
  onDeleteBlock: () => boolean;
  onRegisterEditor: (blockId: string, editor: Editor | null) => void;
  onSlash: (
    blockId: string,
    state: { query: string } | null,
    rect: (() => DOMRect | null) | null,
  ) => void;
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
        onNewBlock={(payload) => onNewBlock(payload.markdown)}
        onDeleteBlock={onDeleteBlock}
        onSlashTrigger={(state, rect) => onSlash(block.id, state, rect)}
      />
    );
  }
  if (block.type === "image") {
    return <ImageBlock block={block} onChange={onUpdate} />;
  }
  if (block.type === "divider") {
    return <hr className="my-4 border-stone-200 dark:border-stone-700" />;
  }
  if (block.type === "quote") {
    return (
      <textarea
        value={block.data.text}
        onChange={(e) => onUpdate({ ...block, data: { ...block.data, text: e.target.value } })}
        placeholder="Citation…"
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
