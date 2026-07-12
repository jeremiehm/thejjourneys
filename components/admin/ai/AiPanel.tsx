"use client";

import { Loader2, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ArticleRevision } from "@/lib/article-revisions";
import { useAiEditor } from "./AiEditorContext";
import { AuditReportView } from "./AuditReport";
import { DiffView } from "./DiffView";
import { RevisionHistory } from "./RevisionHistory";
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
    runAudit,
    acceptEdit,
    rejectEdit,
    regenerateEdit,
    articleState,
  } = useAiEditor();

  return (
    <aside className="flex h-full w-full flex-col border-l border-stone-200 bg-white dark:border-stone-800 dark:bg-[#1a1a1a]">
      <div className="border-b border-stone-200 px-4 py-3 dark:border-stone-800">
        <div className="flex items-center gap-2 font-semibold text-stone-900 dark:text-stone-100">
          <Sparkles className="size-4 text-amber-500" />
          Assistant IA
        </div>
        <p className="mt-1 text-xs text-stone-500">Sélectionnez du texte pour les actions inline.</p>
      </div>

      <Tabs defaultValue="actions" className="flex flex-1 flex-col overflow-hidden">
        <TabsList className="mx-4 mt-3 grid w-auto grid-cols-3">
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
          <TabsTrigger value="history">Historique</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto px-4 py-4">
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
                Sélectionnez un passage dans l&apos;éditeur, puis choisissez une action dans le menu flottant.
              </p>
            )}

            <div className="space-y-3 border-t border-stone-100 pt-4 dark:border-stone-800">
              <label className="block text-xs font-medium text-stone-500">Excerpt (cartes)</label>
              <textarea
                value={excerpt}
                onChange={(e) => onExcerptChange(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900"
              />
              <label className="block text-xs font-medium text-stone-500">Meta description SEO</label>
              <textarea
                value={metaDescription}
                onChange={(e) => onMetaDescriptionChange(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900"
              />
              <p className="text-xs text-stone-400">{metaDescription.length} caractères (cible 140-155)</p>
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
                  Analyse en cours…
                </>
              ) : (
                "Lancer l'audit SEO"
              )}
            </Button>
            {auditError && <p className="text-sm text-red-600">{auditError}</p>}
            {audit && <AuditReportView report={audit} />}
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            <RevisionHistory articleId={articleId} revisions={revisions} onRestored={onRevisionsRefresh} />
          </TabsContent>
        </div>
      </Tabs>
    </aside>
  );
}
