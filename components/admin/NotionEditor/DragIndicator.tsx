"use client";

import type { DropZone } from "@/lib/blocks/editor-types";
import { cn } from "@/lib/utils";

type DragIndicatorProps = {
  zone: DropZone;
  className?: string;
};

export function DragIndicator({ zone, className }: DragIndicatorProps) {
  const isHorizontal = zone === "before" || zone === "after";

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute z-50 bg-[#2383e2]",
        isHorizontal ? "left-0 right-0 h-0.5" : "top-0 bottom-0 w-0.5",
        zone === "before" && "top-0 -translate-y-1/2",
        zone === "after" && "bottom-0 translate-y-1/2",
        zone === "left" && "left-0 -translate-x-1/2",
        zone === "right" && "right-0 translate-x-1/2",
        className,
      )}
    />
  );
}
