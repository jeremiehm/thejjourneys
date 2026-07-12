"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import type { Editor } from "@tiptap/core";
import { createManualRevision } from "@/app/admin/actions";
import { serializeArticleBlocksForAi } from "@/lib/ai/article-serializer";
import type { AiEditAction, AuditReport, PendingAiEdit, SiblingArticle } from "@/lib/ai/types";
import type { ArticleBlock } from "@/lib/blocks/types";
import { markdownToHtml } from "@/lib/markdown-editor";
import { sliceToMarkdown } from "@/components/admin/NotionEditor/slice-markdown";

export type ArticleEditorState = {
  articleId: string;
  title: string;
  excerpt: string;
  metaDescription: string;
  lang: string;
  blocks: ArticleBlock[];
};

type ArticleUpdaters = {
  setTitle: (v: string) => void;
  setExcerpt: (v: string) => void;
  setMetaDescription: (v: string) => void;
};

type AiEditorContextValue = {
  articleState: ArticleEditorState;
  siblingArticles: SiblingArticle[];
  pendingEdit: PendingAiEdit | null;
  streaming: boolean;
  streamError: string | null;
  audit: AuditReport | null;
  auditLoading: boolean;
  auditError: string | null;
  startInlineEdit: (action: AiEditAction, editor: Editor, blockId?: string) => Promise<void>;
  regenerateEdit: () => Promise<void>;
  acceptEdit: () => void;
  rejectEdit: () => void;
  runAudit: () => Promise<void>;
  applyMetaDescription: (text: string) => void;
  applyTitleSuggestion: (text: string) => void;
  registerEditor: (blockId: string, editor: Editor | null) => void;
  registerUpdaters: (updaters: ArticleUpdaters) => void;
  scrollToBlock: (blockId: string) => void;
};

const AiEditorContext = createContext<AiEditorContextValue | null>(null);

export function useAiEditor() {
  const ctx = useContext(AiEditorContext);
  if (!ctx) throw new Error("useAiEditor doit être utilisé dans AiEditorProvider");
  return ctx;
}

export function useAiEditorOptional() {
  return useContext(AiEditorContext);
}

type AiEditorProviderProps = {
  children: ReactNode;
  articleState: ArticleEditorState;
  siblingArticles: SiblingArticle[];
};

export function AiEditorProvider({ children, articleState, siblingArticles }: AiEditorProviderProps) {
  const [pendingEdit, setPendingEdit] = useState<PendingAiEdit | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [audit, setAudit] = useState<AuditReport | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  const editorsRef = useRef(new Map<string, Editor>());
  const updatersRef = useRef<ArticleUpdaters | null>(null);
  const lastActionRef = useRef<{ action: AiEditAction; editorKey: string; from: number; to: number; blockId?: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fullArticleText = useMemo(
    () => serializeArticleBlocksForAi(articleState.blocks),
    [articleState.blocks],
  );

  const registerEditor = useCallback((blockId: string, editor: Editor | null) => {
    if (editor) editorsRef.current.set(blockId, editor);
    else editorsRef.current.delete(blockId);
  }, []);

  const registerUpdaters = useCallback((updaters: ArticleUpdaters) => {
    updatersRef.current = updaters;
  }, []);

  const scrollToBlock = useCallback((blockId: string) => {
    document.querySelector(`[data-block-id="${blockId}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const runStream = useCallback(
    async (action: AiEditAction, selectedText: string, editorKey: string, from: number, to: number, blockId?: string) => {
      abortRef.current?.abort();
      const abort = new AbortController();
      abortRef.current = abort;

      setStreaming(true);
      setStreamError(null);
      setPendingEdit({
        action,
        originalText: selectedText,
        proposedText: "",
        blockId,
        editorFrom: from,
        editorTo: to,
        editorKey,
      });

      lastActionRef.current = { action, editorKey, from, to, blockId };

      try {
        const res = await fetch("/api/ai/edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            selectedText,
            fullArticle: fullArticleText,
            lang: articleState.lang,
            blockId,
          }),
          signal: abort.signal,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error ?? `Erreur ${res.status}`);
        }

        if (!res.body) throw new Error("Flux vide");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          if (chunk.startsWith("[ERROR]")) throw new Error(chunk.replace("[ERROR] ", ""));
          accumulated += chunk;
          setPendingEdit((prev) => (prev ? { ...prev, proposedText: accumulated } : prev));
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setStreamError(error instanceof Error ? error.message : "Erreur réseau");
      } finally {
        setStreaming(false);
      }
    },
    [fullArticleText, articleState.lang],
  );

  const startInlineEdit = useCallback(
    async (action: AiEditAction, editor: Editor, blockId?: string) => {
      const { from, to } = editor.state.selection;
      if (from === to) return;
      const selectedText = sliceToMarkdown(editor, from, to);
      if (!selectedText.trim()) return;
      await runStream(action, selectedText, blockId ?? "default", from, to, blockId);
    },
    [runStream],
  );

  const regenerateEdit = useCallback(async () => {
    const last = lastActionRef.current;
    if (!last || !pendingEdit) return;
    await runStream(last.action, pendingEdit.originalText, last.editorKey, last.from, last.to, last.blockId);
  }, [pendingEdit, runStream]);

  const acceptEdit = useCallback(() => {
    if (!pendingEdit) return;
    const editor = editorsRef.current.get(pendingEdit.editorKey);
    if (editor) {
      editor
        .chain()
        .focus()
        .deleteRange({ from: pendingEdit.editorFrom, to: pendingEdit.editorTo })
        .insertContent(markdownToHtml(pendingEdit.proposedText))
        .run();
    }
    if (articleState.articleId) {
      void createManualRevision(
        articleState.articleId,
        {
          title: articleState.title,
          excerpt: articleState.excerpt || null,
          meta_description: articleState.metaDescription || null,
          content: articleState.blocks,
        },
        `IA : ${pendingEdit.action}`,
      );
    }
    setPendingEdit(null);
    setStreamError(null);
  }, [pendingEdit, articleState]);

  const rejectEdit = useCallback(() => {
    abortRef.current?.abort();
    setPendingEdit(null);
    setStreamError(null);
    setStreaming(false);
  }, []);

  const runAudit = useCallback(async () => {
    setAuditLoading(true);
    setAuditError(null);
    try {
      const res = await fetch("/api/ai/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: articleState.title,
          excerpt: articleState.excerpt || null,
          metaDescription: articleState.metaDescription || null,
          content: fullArticleText,
          lang: articleState.lang,
          siblingArticles,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Erreur audit");
      setAudit(data as AuditReport);
    } catch (error) {
      setAuditError(error instanceof Error ? error.message : "Erreur réseau");
    } finally {
      setAuditLoading(false);
    }
  }, [articleState, fullArticleText, siblingArticles]);

  const applyMetaDescription = useCallback((text: string) => {
    updatersRef.current?.setMetaDescription(text);
  }, []);

  const applyTitleSuggestion = useCallback((text: string) => {
    updatersRef.current?.setTitle(text);
  }, []);

  const value: AiEditorContextValue = {
    articleState,
    siblingArticles,
    pendingEdit,
    streaming,
    streamError,
    audit,
    auditLoading,
    auditError,
    startInlineEdit,
    regenerateEdit,
    acceptEdit,
    rejectEdit,
    runAudit,
    applyMetaDescription,
    applyTitleSuggestion,
    registerEditor,
    registerUpdaters,
    scrollToBlock,
  };

  return <AiEditorContext.Provider value={value}>{children}</AiEditorContext.Provider>;
}
