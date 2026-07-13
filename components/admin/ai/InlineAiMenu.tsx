"use client";

import type { Editor } from "@tiptap/react";
import { Wand2 } from "lucide-react";
import type { AiEditAction } from "@/lib/ai/types";
import { useAiEditorOptional } from "./AiEditorContext";
import { cn } from "@/lib/utils";

const AI_ACTIONS: { action: AiEditAction; label: string }[] = [
  { action: "rewrite", label: "Rewrite" },
  { action: "humanize", label: "Humanize" },
  { action: "shorten", label: "Shorten" },
  { action: "expand", label: "Expand" },
  { action: "add_experience", label: "Add experience" },
  { action: "fix_grammar", label: "Fix grammar" },
];

type InlineAiMenuProps = {
  editor: Editor;
  blockId?: string;
};

function AiMenuBtn({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "whitespace-nowrap rounded px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-50 disabled:opacity-50 dark:text-amber-300 dark:hover:bg-amber-950/40",
      )}
    >
      {label}
    </button>
  );
}

export function InlineAiMenu({ editor, blockId }: InlineAiMenuProps) {
  const ai = useAiEditorOptional();
  if (!ai) return null;

  const { from, to } = editor.state.selection;
  const hasSelection = from !== to;

  return (
    <>
      <span className="mx-1 h-5 w-px bg-stone-200 dark:bg-stone-600" />
      <Wand2 className="size-3.5 text-amber-500" aria-hidden />
      {AI_ACTIONS.map(({ action, label }) => (
        <AiMenuBtn
          key={action}
          label={label}
          disabled={!hasSelection || ai.streaming}
          onClick={() => void ai.startInlineEdit(action, editor, blockId)}
        />
      ))}
    </>
  );
}
