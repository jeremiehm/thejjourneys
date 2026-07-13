"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Editor } from "@tiptap/core";
import { createManualRevision, createCompanionArticles, restoreArticleRevision, restoreLatestRevisionByLabel } from "@/app/admin/actions";
import { applyArticlePatches, validatePatches } from "@/lib/ai/apply-article-patches";
import { isBodyEnhancementSafe } from "@/lib/ai/validate-enhancement";
import type {
  AiAgent,
  AiEditAction,
  ArticleEditChatResponse,
  ArticleStructure,
  AuditReport,
  EnhanceSeoOutcome,
  PendingAiEdit,
  SiblingArticle,
  StructureChatMessage,
} from "@/lib/ai/types";
import { serializeArticleBlocksForAi } from "@/lib/ai/article-serializer";
import type { ArticleBlock } from "@/lib/blocks/types";
import { structureSectionsToBlocks } from "@/lib/ai/structure-to-blocks";
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
  setBlocks: (b: ArticleBlock[]) => void;
};

export type PublishContext = {
  collectionId: string;
  authorId: string;
  collectionSlug: string;
  currentSlug?: string;
};

type AiEditorContextValue = {
  articleState: ArticleEditorState;
  siblingArticles: SiblingArticle[];
  agents: AiAgent[];
  selectedAgentId: string;
  setSelectedAgentId: (id: string) => void;
  pendingEdit: PendingAiEdit | null;
  streaming: boolean;
  streamError: string | null;
  audit: AuditReport | null;
  auditLoading: boolean;
  auditError: string | null;
  enhanceSeoLoading: boolean;
  enhanceSeoError: string | null;
  enhanceSeoOutcome: EnhanceSeoOutcome | null;
  undoEnhanceSeo: () => Promise<void>;
  startInlineEdit: (action: AiEditAction, editor: Editor, blockId?: string) => Promise<void>;
  regenerateEdit: () => Promise<void>;
  acceptEdit: () => void;
  rejectEdit: () => void;
  runAudit: () => Promise<void>;
  runEnhanceSeo: () => Promise<void>;
  applyMetaDescription: (text: string) => void;
  applyTitleSuggestion: (text: string) => void;
  registerEditor: (blockId: string, editor: Editor | null) => void;
  registerUpdaters: (updaters: ArticleUpdaters) => void;
  registerPublishContext: (ctx: PublishContext) => void;
  scrollToBlock: (blockId: string) => void;
  draftMessages: StructureChatMessage[];
  draftLoading: boolean;
  draftError: string | null;
  sendDraftPrompt: (prompt: string) => Promise<void>;
  applyDraft: (draft: ArticleStructure) => void;
  clearDraftChat: () => void;
};

const AiEditorContext = createContext<AiEditorContextValue | null>(null);

function chatStorageKey(articleId: string) {
  return `ai-chat-${articleId || "new"}`;
}

function loadChatMessages(articleId: string): StructureChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(chatStorageKey(articleId));
    if (!raw) return [];
    return JSON.parse(raw) as StructureChatMessage[];
  } catch {
    return [];
  }
}

function saveChatMessages(articleId: string, messages: StructureChatMessage[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(chatStorageKey(articleId), JSON.stringify(messages));
  } catch {
    /* ignore quota */
  }
}

export function useAiEditor() {
  const ctx = useContext(AiEditorContext);
  if (!ctx) throw new Error("useAiEditor must be used within AiEditorProvider");
  return ctx;
}

export function useAiEditorOptional() {
  return useContext(AiEditorContext);
}

type AiEditorProviderProps = {
  children: ReactNode;
  articleState: ArticleEditorState;
  siblingArticles: SiblingArticle[];
  agents?: AiAgent[];
};

function defaultAgentId(agents: AiAgent[]): string {
  return agents.find((a) => a.is_default)?.id ?? agents[0]?.id ?? "";
}

export function AiEditorProvider({ children, articleState, siblingArticles, agents = [] }: AiEditorProviderProps) {
  const [selectedAgentId, setSelectedAgentId] = useState(() => defaultAgentId(agents));
  const [pendingEdit, setPendingEdit] = useState<PendingAiEdit | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [audit, setAudit] = useState<AuditReport | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [enhanceSeoLoading, setEnhanceSeoLoading] = useState(false);
  const [enhanceSeoError, setEnhanceSeoError] = useState<string | null>(null);
  const [enhanceSeoOutcome, setEnhanceSeoOutcome] = useState<EnhanceSeoOutcome | null>(null);
  const [draftMessages, setDraftMessages] = useState<StructureChatMessage[]>(() =>
    loadChatMessages(articleState.articleId),
  );
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  const editorsRef = useRef(new Map<string, Editor>());
  const updatersRef = useRef<ArticleUpdaters | null>(null);
  const publishContextRef = useRef<PublishContext | null>(null);
  const lastActionRef = useRef<{ action: AiEditAction; editorKey: string; from: number; to: number; blockId?: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fullArticleText = useMemo(
    () => serializeArticleBlocksForAi(articleState.blocks),
    [articleState.blocks],
  );

  const hasSubstantialContent = useMemo(
    () => articleState.blocks.some((b) => b.type === "text" && b.data.markdown.trim().length > 80),
    [articleState.blocks],
  );

  useEffect(() => {
    setDraftMessages(loadChatMessages(articleState.articleId));
  }, [articleState.articleId]);

  useEffect(() => {
    saveChatMessages(articleState.articleId, draftMessages);
  }, [articleState.articleId, draftMessages]);

  const registerEditor = useCallback((blockId: string, editor: Editor | null) => {
    if (editor) editorsRef.current.set(blockId, editor);
    else editorsRef.current.delete(blockId);
  }, []);

  const registerUpdaters = useCallback((updaters: ArticleUpdaters) => {
    updatersRef.current = updaters;
  }, []);

  const registerPublishContext = useCallback((ctx: PublishContext) => {
    publishContextRef.current = ctx;
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
          throw new Error((err as { error?: string }).error ?? `Error ${res.status}`);
        }

        if (!res.body) throw new Error("Empty stream");

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
        setStreamError(error instanceof Error ? error.message : "Network error");
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
        `AI: ${pendingEdit.action}`,
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
      if (!res.ok) {
        const err = data as { error?: string; details?: { fieldErrors?: Record<string, string[]> } };
        const fieldHint = err.details?.fieldErrors
          ? Object.entries(err.details.fieldErrors)
              .flatMap(([k, v]) => v.map((m) => `${k}: ${m}`))
              .slice(0, 2)
              .join("; ")
          : "";
        throw new Error([err.error ?? "Audit error", fieldHint].filter(Boolean).join(" — "));
      }
      setAudit(data as AuditReport);
      setEnhanceSeoOutcome(null);
      setEnhanceSeoError(null);
    } catch (error) {
      setAuditError(error instanceof Error ? error.message : "Network error");
    } finally {
      setAuditLoading(false);
    }
  }, [articleState, fullArticleText, siblingArticles]);

  const applyEnhancement = useCallback(
    (enhanced: ArticleStructure, label: string) => {
      const blocks = structureSectionsToBlocks(enhanced.sections);
      if (enhanced.title) updatersRef.current?.setTitle(enhanced.title);
      if (enhanced.excerpt) updatersRef.current?.setExcerpt(enhanced.excerpt);
      if (enhanced.metaDescription) updatersRef.current?.setMetaDescription(enhanced.metaDescription);
      updatersRef.current?.setBlocks(blocks);

      if (articleState.articleId) {
        void createManualRevision(
          articleState.articleId,
          {
            title: enhanced.title ?? articleState.title,
            excerpt: (enhanced.excerpt ?? articleState.excerpt) || null,
            meta_description: (enhanced.metaDescription ?? articleState.metaDescription) || null,
            content: blocks,
          },
          label,
        );
      }
    },
    [articleState],
  );

  const runEnhanceSeo = useCallback(async () => {
    if (!audit) return;

    const publishCtx = publishContextRef.current;
    if (!publishCtx?.collectionId || !publishCtx.authorId || !publishCtx.collectionSlug) {
      setEnhanceSeoError("Select a collection and author before enhancing SEO.");
      return;
    }

    const newArticleCount = audit.internalLinks.filter(
      (link) =>
        !siblingArticles.some(
          (s) =>
            s.slug === link.targetSlug ||
            s.title.toLowerCase().includes(link.anchor.toLowerCase()) ||
            link.anchor.toLowerCase().includes(s.title.toLowerCase().slice(0, 20)),
        ),
    ).length;

    const confirmMessage =
      newArticleCount > 0
        ? `Enhance SEO will rewrite this article and create up to ${Math.min(newArticleCount, 3)} companion draft(s) for missing internal links. Continue?`
        : "Enhance SEO will rewrite this article applying audit recommendations. Continue?";

    if (!window.confirm(confirmMessage)) return;

    setEnhanceSeoLoading(true);
    setEnhanceSeoError(null);

    let backupRevisionId: string | undefined;
    if (articleState.articleId) {
      const backup = await createManualRevision(
        articleState.articleId,
        {
          title: articleState.title,
          excerpt: articleState.excerpt || null,
          meta_description: articleState.metaDescription || null,
          content: articleState.blocks,
        },
        "Before SEO enhance",
      );
      if (backup.ok) backupRevisionId = backup.revisionId;
    }

    try {
      const res = await fetch("/api/ai/enhance-seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audit,
          title: articleState.title,
          excerpt: articleState.excerpt || null,
          metaDescription: articleState.metaDescription || null,
          content: fullArticleText,
          lang: articleState.lang,
          collectionSlug: publishCtx.collectionSlug,
          currentSlug: publishCtx.currentSlug,
          siblingArticles,
          agentId: selectedAgentId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const err = data as { error?: string; details?: { fieldErrors?: Record<string, string[]> } };
        const fieldHint = err.details?.fieldErrors
          ? Object.entries(err.details.fieldErrors)
              .flatMap(([k, v]) => v.map((m) => `${k}: ${m}`))
              .slice(0, 2)
              .join("; ")
          : "";
        throw new Error([err.error ?? "Enhancement error", fieldHint].filter(Boolean).join(" — "));
      }

      const result = data as EnhanceSeoOutcome["result"];

      const bodyCheck = isBodyEnhancementSafe(articleState.blocks, result.currentArticle.sections);
      if (!bodyCheck.safe) {
        throw new Error(bodyCheck.reason ?? "SEO enhancement was blocked to protect your content.");
      }

      applyEnhancement(
        {
          title: result.currentArticle.title,
          excerpt: result.currentArticle.excerpt,
          metaDescription: result.currentArticle.metaDescription,
          sections: result.currentArticle.sections,
        },
        "AI: SEO enhance",
      );

      let createdArticles: EnhanceSeoOutcome["createdArticles"] = [];
      if (result.newArticles.length > 0) {
        const created = await createCompanionArticles({
          collectionId: publishCtx.collectionId,
          authorId: publishCtx.authorId,
          lang: articleState.lang,
          articles: result.newArticles.map((a) => ({
            title: a.title,
            slug: a.slug,
            excerpt: a.excerpt,
            metaDescription: a.metaDescription,
            sections: a.sections,
            linkAnchor: a.linkAnchor,
          })),
        });
        if (!created.ok) throw new Error(created.error);
        createdArticles = created.articles;
      }

      setEnhanceSeoOutcome({ result, createdArticles, backupRevisionId });
    } catch (error) {
      setEnhanceSeoError(error instanceof Error ? error.message : "Network error");
    } finally {
      setEnhanceSeoLoading(false);
    }
  }, [
    applyEnhancement,
    articleState,
    audit,
    fullArticleText,
    selectedAgentId,
    siblingArticles,
  ]);

  const undoEnhanceSeo = useCallback(async () => {
    if (!articleState.articleId) return;
    const revisionId = enhanceSeoOutcome?.backupRevisionId;
    const result = revisionId
      ? await restoreArticleRevision(revisionId)
      : await restoreLatestRevisionByLabel(articleState.articleId, "Before SEO enhance");
    if (!result.ok) {
      setEnhanceSeoError(result.error);
      return;
    }
    setEnhanceSeoOutcome(null);
    setEnhanceSeoError(null);
    window.location.reload();
  }, [articleState.articleId, enhanceSeoOutcome?.backupRevisionId]);

  const applyMetaDescription = useCallback((text: string) => {
    updatersRef.current?.setMetaDescription(text);
  }, []);

  const applyTitleSuggestion = useCallback((text: string) => {
    updatersRef.current?.setTitle(text);
  }, []);

  const applyEditResponse = useCallback(
    (response: ArticleEditChatResponse) => {
      const patchError = validatePatches(response.patches);
      if (patchError) throw new Error(patchError);

      const nextBlocks =
        response.patches.length > 0
          ? applyArticlePatches(articleState.blocks, response.patches)
          : articleState.blocks;

      if (response.title) updatersRef.current?.setTitle(response.title);
      if (response.excerpt) updatersRef.current?.setExcerpt(response.excerpt);
      if (response.metaDescription) updatersRef.current?.setMetaDescription(response.metaDescription);
      if (response.patches.length > 0) updatersRef.current?.setBlocks(nextBlocks);

      if (articleState.articleId && response.patches.length > 0) {
        void createManualRevision(
          articleState.articleId,
          {
            title: response.title ?? articleState.title,
            excerpt: (response.excerpt ?? articleState.excerpt) || null,
            meta_description: (response.metaDescription ?? articleState.metaDescription) || null,
            content: nextBlocks,
          },
          "AI: chat edit",
        );
      }

      return response.patches.length;
    },
    [articleState],
  );

  const sendDraftPrompt = useCallback(
    async (prompt: string) => {
      const userMsg: StructureChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: prompt,
      };

      let history: Array<{ role: "user" | "assistant"; content: string }> = [];
      setDraftMessages((prev) => {
        history = prev.map((m) => ({ role: m.role, content: m.content }));
        return [...prev, userMsg];
      });

      setDraftLoading(true);
      setDraftError(null);

      const useEditMode = hasSubstantialContent;

      try {
        if (useEditMode) {
          const res = await fetch("/api/ai/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt,
              history,
              lang: articleState.lang,
              agentId: selectedAgentId || undefined,
              title: articleState.title,
              excerpt: articleState.excerpt || undefined,
              metaDescription: articleState.metaDescription || undefined,
              content: fullArticleText,
              mode: "edit",
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error((data as { error?: string }).error ?? "Edit error");

          const edit = data as ArticleEditChatResponse;
          let patchesApplied = 0;
          try {
            patchesApplied = applyEditResponse(edit);
          } catch (applyError) {
            throw new Error(applyError instanceof Error ? applyError.message : "Could not apply edits");
          }

          setDraftMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: edit.reply,
              patchesApplied,
            },
          ]);
        } else {
          const res = await fetch("/api/ai/draft", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt,
              history,
              lang: articleState.lang,
              agentId: selectedAgentId || undefined,
              currentTitle: articleState.title || undefined,
              currentExcerpt: articleState.excerpt || undefined,
              hasExistingContent: false,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error((data as { error?: string }).error ?? "Writing error");

          const draft = data as ArticleStructure;
          setDraftMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: draft.summary ?? `Article written (${draft.sections.length} blocks).`,
              structure: draft,
            },
          ]);
        }
      } catch (error) {
        setDraftError(error instanceof Error ? error.message : "Network error");
      } finally {
        setDraftLoading(false);
      }
    },
    [applyEditResponse, articleState, fullArticleText, hasSubstantialContent, selectedAgentId],
  );

  const applyDraft = useCallback(
    (draft: ArticleStructure) => {
      const blocks = structureSectionsToBlocks(draft.sections);
      if (draft.title) updatersRef.current?.setTitle(draft.title);
      if (draft.excerpt) updatersRef.current?.setExcerpt(draft.excerpt);
      if (draft.metaDescription) updatersRef.current?.setMetaDescription(draft.metaDescription);
      updatersRef.current?.setBlocks(blocks);

      if (articleState.articleId) {
        void createManualRevision(
          articleState.articleId,
          {
            title: draft.title ?? articleState.title,
            excerpt: (draft.excerpt ?? articleState.excerpt) || null,
            meta_description: (draft.metaDescription ?? articleState.metaDescription) || null,
            content: blocks,
          },
          "AI: draft",
        );
      }
    },
    [articleState],
  );

  const clearDraftChat = useCallback(() => {
    setDraftMessages([]);
    setDraftError(null);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(chatStorageKey(articleState.articleId));
    }
  }, [articleState.articleId]);

  const value: AiEditorContextValue = {
    articleState,
    siblingArticles,
    agents,
    selectedAgentId,
    setSelectedAgentId,
    pendingEdit,
    streaming,
    streamError,
    audit,
    auditLoading,
    auditError,
    enhanceSeoLoading,
    enhanceSeoError,
    enhanceSeoOutcome,
    undoEnhanceSeo,
    startInlineEdit,
    regenerateEdit,
    acceptEdit,
    rejectEdit,
    runAudit,
    runEnhanceSeo,
    applyMetaDescription,
    applyTitleSuggestion,
    registerEditor,
    registerUpdaters,
    registerPublishContext,
    scrollToBlock,
    draftMessages,
    draftLoading,
    draftError,
    sendDraftPrompt,
    applyDraft,
    clearDraftChat,
  };

  return <AiEditorContext.Provider value={value}>{children}</AiEditorContext.Provider>;
}
