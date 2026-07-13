"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { filterSlashItems, groupSlashItems, type SlashItem } from "@/components/admin/NotionEditor/slash-items";
import { cn } from "@/lib/utils";

export type SlashMenuRef = {
  onKeyDown: (event: KeyboardEvent) => boolean;
};

type SlashMenuProps = {
  query: string;
  onSelect: (item: SlashItem) => void;
  clientRect: (() => DOMRect | null) | null;
};

export const SlashMenu = forwardRef<SlashMenuRef, SlashMenuProps>(function SlashMenu(
  { query, onSelect, clientRect },
  ref,
) {
  const items = filterSlashItems(query);
  const groups = groupSlashItems(items);
  const flatItems = groups.flatMap((g) => g.items);
  const [selected, setSelected] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setSelected(0);
    setVisible(false);
    const t = window.setTimeout(() => setVisible(true), 80);
    return () => window.clearTimeout(t);
  }, [query]);

  useImperativeHandle(ref, () => ({
    onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowUp") {
        setSelected((index) => (index + flatItems.length - 1) % Math.max(flatItems.length, 1));
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelected((index) => (index + 1) % Math.max(flatItems.length, 1));
        return true;
      }
      if (event.key === "Enter") {
        const item = flatItems[selected];
        if (item) onSelect(item);
        return true;
      }
      return false;
    },
  }));

  const rect = clientRect?.();
  if (!rect) return null;

  let itemIndex = 0;

  return (
    <div
      className={cn(
        "notion-slash-menu fixed z-[100] w-[280px] max-h-[320px] overflow-y-auto rounded-lg border border-stone-200 bg-white py-1 shadow-xl transition-opacity duration-[80ms] ease-out dark:border-stone-700 dark:bg-[#252525]",
        visible ? "opacity-100" : "opacity-0",
      )}
      style={{ top: rect.bottom + 8, left: rect.left }}
    >
      {flatItems.length === 0 ? (
        <p className="px-3 py-2 text-sm text-stone-500">No results</p>
      ) : (
        groups.map((group) => (
          <div key={group.label}>
            <p className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-stone-400">
              {group.label}
            </p>
            {group.items.map((item) => {
              const index = itemIndex++;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    "flex w-full items-start gap-3 px-3 py-2 text-left transition-colors",
                    index === selected ? "bg-stone-100 dark:bg-white/10" : "hover:bg-stone-50 dark:hover:bg-white/5",
                  )}
                  onMouseEnter={() => setSelected(index)}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onSelect(item);
                  }}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center text-xs">{item.icon}</span>
                  <span>
                    <span className="block text-sm font-medium text-stone-900 dark:text-stone-100">{item.title}</span>
                    <span className="block text-xs text-stone-500">{item.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
});
