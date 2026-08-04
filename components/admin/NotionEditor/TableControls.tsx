"use client";

import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  Columns2,
  Rows2,
  Table2,
  Trash2,
} from "lucide-react";

type TableControlsProps = {
  editor: Editor;
};

export function TableControls({ editor }: TableControlsProps) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const sync = () => setActive(editor.isActive("table"));
    sync();
    editor.on("selectionUpdate", sync);
    editor.on("transaction", sync);
    return () => {
      editor.off("selectionUpdate", sync);
      editor.off("transaction", sync);
    };
  }, [editor]);

  if (!active) return null;

  return (
    <div
      className="notion-table-controls mb-1 flex flex-wrap items-center gap-0.5"
      contentEditable={false}
    >
      <button
        type="button"
        className="notion-chrome-btn"
        title="Add row"
        aria-label="Add row"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => editor.chain().focus().addRowAfter().run()}
      >
        <Rows2 className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className="notion-chrome-btn"
        title="Add column"
        aria-label="Add column"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => editor.chain().focus().addColumnAfter().run()}
      >
        <Columns2 className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className="notion-chrome-btn"
        title="Delete row"
        aria-label="Delete row"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => editor.chain().focus().deleteRow().run()}
      >
        <span className="text-[10px] font-medium leading-none">−R</span>
      </button>
      <button
        type="button"
        className="notion-chrome-btn"
        title="Delete column"
        aria-label="Delete column"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => editor.chain().focus().deleteColumn().run()}
      >
        <span className="text-[10px] font-medium leading-none">−C</span>
      </button>
      <button
        type="button"
        className="notion-chrome-btn"
        title="Delete table"
        aria-label="Delete table"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => editor.chain().focus().deleteTable().run()}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      <span className="ml-1 flex items-center gap-1 text-[10px] text-stone-400">
        <Table2 className="h-3 w-3" />
        Table
      </span>
    </div>
  );
}
