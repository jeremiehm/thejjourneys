"use client";

import { useEffect, useState, useTransition } from "react";
import { restoreArticleRevision } from "@/app/admin/actions";
import { revisionBlockCount } from "@/lib/article-revision-utils";
import type { ArticleRevision } from "@/lib/article-revisions";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
    return <p className="text-sm text-stone-500">Save the article to enable revision history.</p>;
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-stone-500">
        A version is saved on every autosave, publish, and AI action.
      </p>
    );
  }

  const handleRestore = (revisionId: string) => {
    if (!confirm("Restore this version? The current state will be saved first.")) return;
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
        <li
          key={rev.id}
          className={cn(
            "flex items-center justify-between gap-2 rounded-lg border px-3 py-2",
            rev.label === "Before SEO enhance"
              ? "border-amber-300 bg-amber-50/80"
              : "border-stone-200",
          )}
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-stone-800">{rev.label ?? "Revision"}</p>
            <p className="text-xs text-stone-500">
              {formatDate(rev.created_at)} · {revisionBlockCount(rev)} blocks
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => handleRestore(rev.id)}
          >
            Restore
          </Button>
        </li>
      ))}
    </ul>
  );
}
