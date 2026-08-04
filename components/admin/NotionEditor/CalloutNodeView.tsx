"use client";

import { useEffect, useRef, useState } from "react";
import { NodeViewWrapper, NodeViewContent, type NodeViewProps } from "@tiptap/react";
import {
  CALLOUT_VARIANT_META,
  CALLOUT_VARIANTS,
  normalizeCalloutVariant,
  type CalloutVariant,
} from "@/lib/callout-variants";
import { cn } from "@/lib/utils";

export function CalloutNodeView({ node, updateAttributes, selected }: NodeViewProps) {
  const variant = normalizeCalloutVariant(node.attrs.variant);
  const meta = CALLOUT_VARIANT_META[variant];
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function selectVariant(next: CalloutVariant) {
    updateAttributes({ variant: next });
    setOpen(false);
  }

  return (
    <NodeViewWrapper
      ref={rootRef}
      as="div"
      className={cn("notion-callout", selected && "is-selected")}
      data-type="callout"
      data-variant={variant}
    >
      <div className="notion-callout-chrome" contentEditable={false}>
        <button
          type="button"
          className="notion-callout-icon"
          aria-label={`Callout type: ${meta.label}`}
          onClick={() => setOpen((value) => !value)}
        >
          {meta.icon}
        </button>
        {open ? (
          <div className="notion-callout-variant-menu absolute left-2 top-10 z-50 min-w-[160px] rounded-lg border border-stone-200 bg-white p-1 shadow-lg dark:border-stone-700 dark:bg-[#252525]">
            {CALLOUT_VARIANTS.map((item) => {
              const itemMeta = CALLOUT_VARIANT_META[item];
              return (
                <button
                  key={item}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-white/10",
                    item === variant && "bg-stone-100 dark:bg-white/10",
                  )}
                  onClick={() => selectVariant(item)}
                >
                  <span aria-hidden>{itemMeta.icon}</span>
                  {itemMeta.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
      <NodeViewContent className="notion-callout-body" />
    </NodeViewWrapper>
  );
}
