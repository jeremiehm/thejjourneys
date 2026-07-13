"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAiEditor } from "./AiEditorContext";
import type { ArticleStructure } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

function DraftPreview({ draft }: { draft: ArticleStructure }) {
  return (
    <div className="mt-2 space-y-2 rounded-lg border border-amber-200/60 bg-amber-50/50 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
      {draft.title ? (
        <p className="text-xs text-stone-500">
          <span className="font-medium text-stone-700 dark:text-stone-300">Title:</span> {draft.title}
        </p>
      ) : null}
      {draft.excerpt ? (
        <p className="text-xs text-stone-500">
          <span className="font-medium text-stone-700 dark:text-stone-300">Excerpt:</span> {draft.excerpt}
        </p>
      ) : null}
      <ul className="space-y-1.5">
        {draft.sections.map((section, i) => (
          <li key={i} className="flex gap-2 text-xs text-stone-600 dark:text-stone-400">
            <span className="shrink-0 rounded bg-stone-200 px-1.5 py-0.5 font-mono text-[10px] uppercase dark:bg-stone-800">
              {section.type}
            </span>
            <span className="line-clamp-3">
              {section.type === "text"
                ? section.markdown.replace(/^#+\s*/gm, "").slice(0, 160)
                : section.type === "tip_card"
                  ? section.body.slice(0, 120)
                  : section.type === "quote"
                    ? section.text
                    : section.type === "divider"
                      ? section.label || "—"
                      : section.type === "image"
                        ? section.caption || section.alt || "Image"
                        : `${section.items.length} step(s)`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DraftChat() {
  const {
    draftMessages,
    draftLoading,
    draftError,
    sendDraftPrompt,
    applyDraft,
    clearDraftChat,
    articleState,
    agents,
    selectedAgentId,
    setSelectedAgentId,
  } = useAiEditor();

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const latestDraft = [...draftMessages].reverse().find((m) => m.structure)?.structure;

  const hasSubstantialContent = articleState.blocks.some(
    (b) => b.type === "text" && b.data.markdown.trim().length > 80,
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [draftMessages, draftLoading]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || draftLoading) return;
    setInput("");
    void sendDraftPrompt(trimmed);
  }

  function handleApply() {
    if (!latestDraft) return;
    const hasContent = articleState.blocks.some(
      (b) => b.type === "text" && b.data.markdown.trim().length > 20,
    );
    if (hasContent && !window.confirm("Replace the current content with this generated article?")) return;
    applyDraft(latestDraft);
  }

  return (
    <div className="flex h-full min-h-[320px] flex-col">
      {agents.length > 0 ? (
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-stone-500">Agent (travel context)</label>
          <select
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900"
          >
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
                {agent.is_default ? " (default)" : ""}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p className="mb-3 text-xs text-stone-400">
          Create an agent in{" "}
          <a href="/admin/agents" className="text-amber-600 hover:underline">
            Admin → AI Agents
          </a>{" "}
          to inject your travel context.
        </p>
      )}

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto pr-1">
        {draftMessages.length === 0 ? (
          <div className="space-y-2 text-sm text-stone-500">
            {hasSubstantialContent ? (
              <>
                <p>Comment on your article — the AI applies targeted edits directly in the editor.</p>
                <p className="text-xs text-stone-400">
                  E.g.: &quot;Shorten the intro&quot;, &quot;Add a tip about metro tickets&quot;, &quot;Fix the tone in the Gràcia section&quot;
                </p>
              </>
            ) : (
              <>
                <p>Describe the article you want. The AI writes developed content, not just an outline.</p>
                <p className="text-xs text-stone-400">
                  E.g.: &quot;Article on the best neighborhoods to live in Barcelona when you first arrive&quot;
                </p>
              </>
            )}
          </div>
        ) : (
          draftMessages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "rounded-lg px-3 py-2 text-sm",
                msg.role === "user"
                  ? "ml-6 bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-100"
                  : "mr-2 bg-white text-stone-700 shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:text-stone-200 dark:ring-stone-700",
              )}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.patchesApplied !== undefined && msg.patchesApplied > 0 ? (
                <p className="mt-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  ✓ {msg.patchesApplied} block{msg.patchesApplied > 1 ? "s" : ""} updated in the editor
                </p>
              ) : null}
              {msg.patchesApplied === 0 && msg.role === "assistant" && !msg.structure ? (
                <p className="mt-1 text-xs text-stone-400">No content changes</p>
              ) : null}
              {msg.structure ? <DraftPreview draft={msg.structure} /> : null}
            </div>
          ))
        )}

        {draftLoading ? (
          <div className="flex items-center gap-2 text-sm text-stone-500">
            <Loader2 className="size-4 animate-spin" />
            {hasSubstantialContent ? "Applying edits…" : "Writing…"}
          </div>
        ) : null}

        {draftError ? <p className="text-sm text-red-600">{draftError}</p> : null}
      </div>

      {latestDraft && !draftLoading && !hasSubstantialContent ? (
        <div className="mt-3 flex gap-2 border-t border-stone-100 pt-3 dark:border-stone-800">
          <Button
            type="button"
            size="sm"
            className="flex-1 bg-amber-500 text-stone-950 hover:bg-amber-400"
            onClick={handleApply}
          >
            Apply to editor
          </Button>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-3 space-y-2 border-t border-stone-100 pt-3 dark:border-stone-800">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={3}
          placeholder={
            hasSubstantialContent
              ? "Your comment or edit request…"
              : "Describe your article…"
          }
          disabled={draftLoading}
          className="w-full resize-none rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={draftLoading || !input.trim()} className="flex-1">
            {draftLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Send
          </Button>
          {draftMessages.length > 0 ? (
            <Button type="button" size="sm" variant="outline" onClick={clearDraftChat} title="Clear chat">
              <Trash2 className="size-4" />
            </Button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
