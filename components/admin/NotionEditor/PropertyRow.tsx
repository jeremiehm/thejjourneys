"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type PropertyRowProps = {
  icon: ReactNode;
  label: string;
  children: ReactNode;
  valueDisplay: ReactNode;
  empty?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function PropertyRow({
  icon,
  label,
  children,
  valueDisplay,
  empty,
  open: controlledOpen,
  onOpenChange,
}: PropertyRowProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      if (rowRef.current && !rowRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, setOpen]);

  return (
    <div
      ref={rowRef}
      className="group relative flex min-h-[34px] items-center rounded-md px-1 py-0.5 hover:bg-stone-100/80 dark:hover:bg-white/[0.04]"
    >
      <div className="flex w-[160px] shrink-0 items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
        <span className="flex h-5 w-5 items-center justify-center opacity-80">{icon}</span>
        <span>{label}</span>
      </div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "min-w-0 flex-1 rounded px-2 py-1 text-left text-sm transition-colors",
          empty ? "text-stone-400 dark:text-stone-500" : "text-stone-800 dark:text-stone-200",
        )}
      >
        {valueDisplay}
      </button>
      {open ? (
        <div className="absolute left-[168px] top-full z-50 mt-1 min-w-[220px] rounded-lg border border-stone-200 bg-white p-2 shadow-lg dark:border-stone-700 dark:bg-[#252525]">
          {children}
        </div>
      ) : null}
    </div>
  );
}
