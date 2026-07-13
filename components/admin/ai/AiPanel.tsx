"use client";

import { Loader2, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ArticleRevision } from "@/lib/article-revisions";
import { useAiEditor } from "./AiEditorContext";
import { AuditReportView } from "./AuditReport";
import { DiffView } from "./DiffView";
import { RevisionHistory } from "./RevisionHistory";
import { DraftChat } from "./DraftChat";
import { Button } from "@/components/ui/button";

type AiPanelProps = {
  articleId: string;
  revisions: ArticleRevision[];
  excerpt: string;
  metaDescription: string;
  onExcerptChange: (v: string) => void;
  onMetaDescriptionChange: (v: string) => void;
  onRevisionsRefresh: () => void;
};

export function AiPanel({
  articleId,
  revisions,
  excerpt,
  metaDescription,
  onExcerptChange,
  onMetaDescriptionChange,
  onRevisionsRefresh,
}: AiPanelProps) {
  const {
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
    runAudit,
    runEnhanceSeo,
    acceptEdit,
    rejectEdit,
    regenerateEdit,
  } = useAiEditor();

  return (
    <aside className="flex h-full w-full flex-col border-l border-stone-200 bg-white dark:border-stone-800 dark:bg-[#1a1a1a]">
      <div className="border-b border-stone-200 px-4 py-3 dark:border-stone-800">
        <div className="flex items-center gap-2 font-semibold text-stone-900 dark:text-stone-100">
          <Sparkles className="size-4 text-amber-500" />
          AI Assistant
        </div>
        <p className="mt-1 text-xs text-stone-500">Chat edits, inline actions, and SEO audit.</p>
      </div>

      <Tabs defaultValue="draft" className="flex flex-1 flex-col overflow-hidden">
        <TabsList className="mx-4 mt-3 grid w-auto grid-cols-4">
          <TabsTrigger value="draft">Chat</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <TabsContent value="draft" className="mt-0 flex h-full flex-col">
            <DraftChat />
          </TabsContent>

          <TabsContent value="actions" className="mt-0 space-y-4">
            {pendingEdit ? (
              <DiffView
                original={pendingEdit.originalText}
                proposed={pendingEdit.proposedText}
                streaming={streaming}
                error={streamError}
                onAccept={acceptEdit}
                onReject={rejectEdit}
                onRegenerate={regenerateEdit}
              />
            ) : (
              <p className="text-sm text-stone-500">
                Select text in the editor, then choose an action from the floating menu.
              </p>
            )}

            <div className="space-y-3 border-t border-stone-100 pt-4 dark:border-stone-800">
              <label className="block text-xs font-medium text-stone-500">Excerpt (cards)</label>
              <textarea
                value={excerpt}
                onChange={(e) => onExcerptChange(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900"
              />
              <label className="block text-xs font-medium text-stone-500">SEO meta description</label>
              <textarea
                value={metaDescription}
                onChange={(e) => onMetaDescriptionChange(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900"
              />
              <p className="text-xs text-stone-400">{metaDescription.length} characters (target 140-155)</p>
            </div>
          </TabsContent>

          <TabsContent value="audit" className="mt-0 space-y-4">
            <Button
              type="button"
              className="w-full bg-amber-500 text-stone-950 hover:bg-amber-400"
              disabled={auditLoading}
              onClick={() => void runAudit()}
            >
              {auditLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Running audit…
                </>
              ) : (
                "Run SEO audit"
              )}
            </Button>
            {auditError && <p className="text-sm text-red-600">{auditError}</p>}
            {audit && (
              <Button
                type="button"
                variant="outline"
                className="w-full border-amber-300 text-amber-900 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-950/30"
                disabled={enhanceSeoLoading || auditLoading}
                onClick={() => void runEnhanceSeo()}
              >
                {enhanceSeoLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Enhancing SEO…
                  </>
                ) : (
                  <>
                    <Zap className="size-4 text-amber-500" />
                    Enhance SEO
                  </>
                )}
              </Button>
            )}
            {enhanceSeoError && <p className="text-sm text-red-600">{enhanceSeoError}</p>}
            {enhanceSeoOutcome && (
              <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50/80 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/20">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-emerald-900 dark:text-emerald-200">{enhanceSeoOutcome.result.summary}</p>
                  {enhanceSeoOutcome.backupRevisionId || articleId ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0 border-red-200 text-red-700 hover:bg-red-50"
                      onClick={() => void undoEnhanceSeo()}
                    >
                      Undo
                    </Button>
                  ) : null}
                </div>
                {enhanceSeoOutcome.result.improvements.length > 0 && (
                  <ul className="list-disc space-y-1 pl-4 text-stone-700 dark:text-stone-300">
                    {enhanceSeoOutcome.result.improvements.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
                {enhanceSeoOutcome.createdArticles.length > 0 && (
                  <div className="space-y-2 border-t border-emerald-200/80 pt-2 dark:border-emerald-900">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                      New draft articles
                    </p>
                    <ul className="space-y-1.5">
                      {enhanceSeoOutcome.createdArticles.map((created) => (
                        <li key={created.id}>
                          <Link
                            href={`/admin/articles/${created.id}/edit`}
                            className="font-medium text-amber-700 hover:text-amber-800 dark:text-amber-400"
                          >
                            {created.title}
                          </Link>
                          <span className="text-stone-500"> · link as &ldquo;{created.linkAnchor}&rdquo;</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            {audit && <AuditReportView report={audit} />}
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            <p className="mb-3 text-xs text-stone-500">
              Every autosave and publish creates a snapshot. Restore any version below.
            </p>
            <RevisionHistory articleId={articleId} revisions={revisions} onRestored={onRevisionsRefresh} />
          </TabsContent>
        </div>
      </Tabs>
    </aside>
  );
}
