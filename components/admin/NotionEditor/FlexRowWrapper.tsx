"use client";

import { Children, useRef, useState } from "react";
import type { RowBlock } from "@/lib/blocks/types";
import { snapRowFlexes } from "@/lib/blocks/content-ops";
import { cn } from "@/lib/utils";

type FlexRowWrapperProps = {
  row: RowBlock;
  onFlexChange: (flexes: number[]) => void;
  children: React.ReactNode;
};

export function FlexRowWrapper({ row, onFlexChange, children }: FlexRowWrapperProps) {
  const [hovered, setHovered] = useState(false);
  const [resizingIndex, setResizingIndex] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<string | null>(null);
  const startX = useRef(0);
  const startFlexes = useRef<number[]>([]);

  const flexes = row.data.children.map((c) => c.flex);
  const showResize = hovered || resizingIndex !== null;
  const childArray = Children.toArray(children);

  function startResize(index: number, clientX: number) {
    setResizingIndex(index);
    startX.current = clientX;
    startFlexes.current = [...flexes];
  }

  function onMove(clientX: number) {
    if (resizingIndex === null) return;
    const container = document.getElementById(`row-${row.id}`);
    if (!container) return;
    const width = container.clientWidth;
    const delta = (clientX - startX.current) / width;
    const left = resizingIndex;
    const right = left + 1;
    if (right >= startFlexes.current.length) return;

    const next = [...startFlexes.current];
    let leftFlex = next[left]! + delta;
    let rightFlex = next[right]! - delta;
    const min = 0.15;
    if (leftFlex < min) {
      rightFlex -= min - leftFlex;
      leftFlex = min;
    }
    if (rightFlex < min) {
      leftFlex -= min - rightFlex;
      rightFlex = min;
    }
    next[left] = leftFlex;
    next[right] = rightFlex;
    const total = next.reduce((a, b) => a + b, 0);
    const normalized = next.map((f) => f / total);
    const snapped = snapRowFlexes(normalized.length, normalized);
    setTooltip(
      snapped
        .map((f) => `${Math.round(f * 100)}%`)
        .slice(left, right + 1)
        .join(" · "),
    );
    onFlexChange(snapped);
  }

  function endResize() {
    setResizingIndex(null);
    setTooltip(null);
  }

  return (
    <div
      id={`row-${row.id}`}
      className="notion-flex-row relative flex w-full gap-6"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        if (resizingIndex === null) setHovered(false);
      }}
    >
      {row.data.children.map((slot, index) => (
        <div
          key={slot.slotId}
          className="relative min-w-0"
          style={{ flex: slot.flex }}
        >
          {childArray[index]}
          {index < row.data.children.length - 1 && showResize ? (
            <div
              className={cn(
                "absolute -right-3 top-0 bottom-0 z-20 flex w-6 items-center justify-center transition-opacity duration-[120ms] ease-out",
                showResize ? "opacity-100" : "opacity-0",
              )}
            >
              <div className="absolute top-0 bottom-0 w-px bg-black/[0.08]" />
              <button
                type="button"
                aria-label="Redimensionner les colonnes"
                className="relative z-10 h-2 w-2 cursor-col-resize rounded-full bg-stone-400 shadow-sm"
                onPointerDown={(e) => {
                  e.preventDefault();
                  startResize(index, e.clientX);
                }}
              />
            </div>
          ) : null}
        </div>
      ))}
      {resizingIndex !== null ? (
        <div
          className="fixed inset-0 z-[100] cursor-col-resize"
          onPointerMove={(e) => onMove(e.clientX)}
          onPointerUp={endResize}
          onPointerCancel={endResize}
        />
      ) : null}
      {tooltip && resizingIndex !== null ? (
        <span className="pointer-events-none absolute -bottom-7 left-1/2 z-30 -translate-x-1/2 rounded bg-stone-800 px-2 py-0.5 text-xs text-white">
          {tooltip}
        </span>
      ) : null}
    </div>
  );
}
