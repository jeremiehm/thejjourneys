"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DiffViewProps = {
  original: string;
  proposed: string;
  streaming?: boolean;
  error?: string | null;
  onAccept: () => void;
  onReject: () => void;
  onRegenerate: () => void;
};

export function DiffView({
  original,
  proposed,
  streaming,
  error,
  onAccept,
  onReject,
  onRegenerate,
}: DiffViewProps) {
  return (
    <div className="space-y-3">
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <div className="grid gap-3">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-stone-500">Avant</p>
          <div className="max-h-40 overflow-y-auto rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700 whitespace-pre-wrap">
            {original}
          </div>
        </div>
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-amber-600">Après</p>
          <div
            className={cn(
              "max-h-48 overflow-y-auto rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-sm text-stone-800 whitespace-pre-wrap",
              streaming && "animate-pulse",
            )}
          >
            {proposed || (streaming ? "Génération en cours…" : "—")}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          className="bg-amber-500 text-stone-950 hover:bg-amber-400"
          disabled={streaming || !proposed.trim()}
          onClick={onAccept}
        >
          Accepter
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onReject}>
          Rejeter
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={streaming} onClick={onRegenerate}>
          Régénérer
        </Button>
      </div>
    </div>
  );
}
