"use client";

import { useEffect, useState, useTransition } from "react";
import { restoreArticleRevision } from "@/app/admin/actions";
import type { ArticleRevision } from "@/lib/article-revisions";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type RevisionHistoryProps = {
  articleId: string;
  revisions: ArticleRevision[];
  onRestored: () => void;
};

export function RevisionHistory({ articleId, revisions, onRestored }: RevisionHistoryProps) {
  const [items, setItems] = useState(revisions);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setItems(revisions);
  }, [revisions]);

  if (!articleId) {
    return <p className="text-sm text-stone-500">Enregistrez l&apos;article pour activer l&apos;historique.</p>;
  }

  if (items.length === 0) {
    return <p className="text-sm text-stone-500">Aucune révision pour le moment.</p>;
  }

  const handleRestore = (revisionId: string) => {
    if (!confirm("Restaurer cette version ? L'état actuel sera sauvegardé avant.")) return;
    startTransition(async () => {
      const result = await restoreArticleRevision(revisionId);
      if (result.ok) {
        onRestored();
        window.location.reload();
      }
    });
  };

  return (
    <ul className="space-y-2">
      {items.map((rev) => (
        <li key={rev.id} className="flex items-center justify-between gap-2 rounded-lg border border-stone-200 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-stone-800">{rev.label ?? "Révision"}</p>
            <p className="text-xs text-stone-500">{formatDate(rev.created_at)}</p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => handleRestore(rev.id)}
          >
            Restaurer
          </Button>
        </li>
      ))}
    </ul>
  );
}
