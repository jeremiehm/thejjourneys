"use client";

import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type TitleInputProps = {
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
  onArrowDown?: () => void;
  className?: string;
};

export function TitleInput({ value, onChange, onEnter, onArrowDown, className }: TitleInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [value, resize]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={(event) => {
        onChange(event.target.value);
        resize();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          onEnter?.();
        }
        if (event.key === "ArrowDown") {
          event.preventDefault();
          onArrowDown?.();
        }
      }}
      placeholder="Untitled"
      className={cn(
        "notion-title w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-[2.75rem] font-bold leading-tight text-stone-900 outline-none placeholder:text-stone-400 dark:text-stone-100 dark:placeholder:text-stone-600",
        className,
      )}
    />
  );
}
