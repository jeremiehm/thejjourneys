"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";

type LinkInputFloatingProps = {
  editor: Editor;
  onClose: () => void;
};

export function LinkInputFloating({ editor, onClose }: LinkInputFloatingProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(() => (editor.getAttributes("link").href as string | undefined) ?? "");
  const [top, setTop] = useState(0);
  const [left, setLeft] = useState(0);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    function updatePosition() {
      const { from } = editor.state.selection;
      const coords = editor.view.coordsAtPos(from);
      setTop(coords.bottom + 8);
      setLeft(coords.left);
    }
    updatePosition();
    editor.on("selectionUpdate", updatePosition);
    return () => {
      editor.off("selectionUpdate", updatePosition);
    };
  }, [editor]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [onClose]);

  function applyLink() {
    const trimmed = url.trim();
    if (!trimmed) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      onClose();
      return;
    }
    const href = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const { empty } = editor.state.selection;
    if (empty) {
      editor.chain().focus().insertContent(`<a href="${href}">${href}</a>`).run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }
    onClose();
  }

  return (
    <div
      className="fixed z-[100] flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-2 py-1.5 shadow-lg dark:border-stone-700 dark:bg-[#252525]"
      style={{ top, left }}
      onMouseDown={(event) => event.preventDefault()}
    >
      <input
        ref={inputRef}
        type="url"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            applyLink();
          }
        }}
        placeholder="Paste or type a link…"
        className="w-56 bg-transparent text-sm text-stone-900 outline-none placeholder:text-stone-400 dark:text-stone-100"
      />
      <button
        type="button"
        onClick={applyLink}
        className="rounded px-2 py-0.5 text-xs font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-white/10"
      >
        Apply
      </button>
    </div>
  );
}
