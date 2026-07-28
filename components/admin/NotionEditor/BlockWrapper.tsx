"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import type { EditorLeafBlock } from "@/lib/blocks/editor-types";
import { measureBlockActionsAlign } from "@/components/admin/NotionEditor/block-actions-align";
import { cn } from "@/lib/utils";

export type BlockContextMenuAction =
  | { type: "delete" }
  | { type: "duplicate" }
  | { type: "transform"; blockType: EditorLeafBlock["type"] }
  | { type: "copyLink" };

type BlockWrapperProps = {
  blockId: string;
  children: React.ReactNode;
  onAddBelow: () => void;
  dragAttributes?: DraggableAttributes;
  dragListeners?: SyntheticListenerMap;
  onContextAction: (action: BlockContextMenuAction) => void;
  onSelect?: (event: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }) => void;
  selected?: boolean;
  isDragging?: boolean;
  className?: string;
};

const TRANSFORM_OPTIONS: { type: EditorLeafBlock["type"]; label: string }[] = [
  { type: "text", label: "Text" },
  { type: "image", label: "Image" },
];

const CHROME_HIDE_DELAY_MS = 220;

export function BlockWrapper({
  blockId,
  children,
  onAddBelow,
  dragAttributes,
  dragListeners,
  onContextAction,
  onSelect,
  selected,
  isDragging,
  className,
}: BlockWrapperProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [chromeHovered, setChromeHovered] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const blockRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dragClicked = useRef(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const chromeVisible = chromeHovered || menuOpen || isDragging;

  function showChrome() {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setChromeHovered(true);
  }

  function scheduleHideChrome() {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setChromeHovered(false);
      hideTimerRef.current = null;
    }, CHROME_HIDE_DELAY_MS);
  }

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  useLayoutEffect(() => {
    const block = blockRef.current;
    const content = contentRef.current;
    if (!block || !content) return;

    const apply = () => {
      const metrics = measureBlockActionsAlign(content, block);
      block.style.setProperty("--block-actions-top", `${metrics.top}px`);
      block.style.setProperty("--block-actions-height", `${metrics.height}px`);
      block.style.setProperty("--block-actions-cap-offset", `${metrics.capOffset}px`);
      block.dataset.actionsAlign = metrics.align;
    };

    apply();
    const resizeObserver = new ResizeObserver(apply);
    resizeObserver.observe(content);
    resizeObserver.observe(block);

    const mutationObserver = new MutationObserver(apply);
    mutationObserver.observe(content, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
    });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [children]);

  useEffect(() => {
    if (!menuOpen) return;
    function close(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  return (
    <div
      ref={blockRef}
      className={cn(
        "notion-block",
        chromeVisible && "is-chrome-visible",
        menuOpen && "is-chrome-active",
        selected && "is-selected",
        isDragging && "opacity-40",
        className,
      )}
      data-block-id={blockId}
      data-actions-align="default"
      onMouseEnter={showChrome}
      onMouseLeave={scheduleHideChrome}
    >
      <div
        className="block-actions"
        onMouseEnter={showChrome}
        onMouseLeave={scheduleHideChrome}
      >
        <button type="button" aria-label="Add below" onClick={onAddBelow} className="btn-add notion-chrome-btn">
          +
        </button>
        <button
          type="button"
          aria-label="Move or menu"
          className={cn("btn-drag notion-chrome-btn", selected && "is-selected-handle")}
          {...dragAttributes}
          {...dragListeners}
          onPointerDown={(event) => {
            dragClicked.current = true;
            dragListeners?.onPointerDown?.(event);
          }}
          onPointerUp={(event) => {
            if (dragClicked.current && !isDragging) {
              event.preventDefault();
              event.stopPropagation();
              onSelect?.({
                shiftKey: event.shiftKey,
                metaKey: event.metaKey,
                ctrlKey: event.ctrlKey,
              });
              if (!event.shiftKey && !event.metaKey && !event.ctrlKey) {
                setMenuOpen((open) => !open);
              } else {
                setMenuOpen(false);
              }
            }
            dragClicked.current = false;
          }}
        >
          ⠿
        </button>

        {menuOpen ? (
          <div
            ref={menuRef}
            className="block-context-menu absolute right-full top-0 z-50 mr-2 min-w-[180px] rounded-lg border border-stone-200 bg-white py-1 shadow-lg dark:border-stone-700 dark:bg-[#252525]"
          >
            <MenuItem
              onClick={() => {
                onContextAction({ type: "delete" });
                setMenuOpen(false);
              }}
            >
              🗑 Delete
            </MenuItem>
            <MenuItem
              onClick={() => {
                onContextAction({ type: "duplicate" });
                setMenuOpen(false);
              }}
            >
              📋 Duplicate
            </MenuItem>
            <div className="my-1 border-t border-stone-100 dark:border-stone-700" />
            <p className="px-3 py-1 text-[10px] uppercase tracking-wider text-stone-400">Turn into</p>
            {TRANSFORM_OPTIONS.map((opt) => (
              <MenuItem
                key={opt.type}
                onClick={() => {
                  onContextAction({ type: "transform", blockType: opt.type });
                  setMenuOpen(false);
                }}
              >
                {opt.label}
              </MenuItem>
            ))}
            <MenuItem
              onClick={() => {
                onContextAction({ type: "copyLink" });
                setMenuOpen(false);
              }}
            >
              🔗 Copy block link
            </MenuItem>
          </div>
        ) : null}
      </div>

      <div className="block-row">
        <div ref={contentRef} className="block-content">
          {children}
        </div>
      </div>
    </div>
  );
}

function MenuItem({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full px-3 py-1.5 text-left text-sm text-stone-700 hover:bg-stone-50 dark:text-stone-200 dark:hover:bg-white/5"
    >
      {children}
    </button>
  );
}
