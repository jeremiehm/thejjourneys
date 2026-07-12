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
  isDragging?: boolean;
  className?: string;
};

const TRANSFORM_OPTIONS: { type: EditorLeafBlock["type"]; label: string }[] = [
  { type: "text", label: "Texte" },
  { type: "image", label: "Image" },
];

export function BlockWrapper({
  blockId,
  children,
  onAddBelow,
  dragAttributes,
  dragListeners,
  onContextAction,
  isDragging,
  className,
}: BlockWrapperProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dragClicked = useRef(false);

  useLayoutEffect(() => {
    const row = rowRef.current;
    const content = contentRef.current;
    if (!row || !content) return;

    const apply = () => {
      const metrics = measureBlockActionsAlign(content, row);
      row.style.setProperty("--block-actions-top", `${metrics.top}px`);
      row.style.setProperty("--block-actions-height", `${metrics.height}px`);
      row.style.setProperty("--block-actions-cap-offset", `${metrics.capOffset}px`);
      row.dataset.actionsAlign = metrics.align;
    };

    apply();
    const resizeObserver = new ResizeObserver(apply);
    resizeObserver.observe(content);
    resizeObserver.observe(row);

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
      className={cn("notion-block", isDragging && "opacity-40", className)}
      data-block-id={blockId}
    >
      <div ref={rowRef} className="block-row" data-actions-align="default">
        <div className="block-actions">
          <button type="button" aria-label="Ajouter en dessous" onClick={onAddBelow} className="btn-add notion-chrome-btn">
            +
          </button>
          <button
            type="button"
            aria-label="Déplacer ou menu"
            className="btn-drag notion-chrome-btn"
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
                setMenuOpen((open) => !open);
              }
              dragClicked.current = false;
            }}
          >
            ⠿
          </button>
        </div>

        <div ref={contentRef} className="block-content">
          {children}
        </div>

        {menuOpen ? (
          <div
            ref={menuRef}
            className="block-context-menu absolute left-[-200px] z-50 min-w-[180px] rounded-lg border border-stone-200 bg-white py-1 shadow-lg dark:border-stone-700 dark:bg-[#252525]"
            style={{ top: "var(--block-actions-top, 0)" }}
          >
            <MenuItem
              onClick={() => {
                onContextAction({ type: "delete" });
                setMenuOpen(false);
              }}
            >
              🗑 Supprimer
            </MenuItem>
            <MenuItem
              onClick={() => {
                onContextAction({ type: "duplicate" });
                setMenuOpen(false);
              }}
            >
              📋 Dupliquer
            </MenuItem>
            <div className="my-1 border-t border-stone-100 dark:border-stone-700" />
            <p className="px-3 py-1 text-[10px] uppercase tracking-wider text-stone-400">Transformer en</p>
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
              🔗 Copier le lien du bloc
            </MenuItem>
          </div>
        ) : null}
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
