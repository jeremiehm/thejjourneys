"use client";

import { ChevronRight } from "lucide-react";
import type { AuditReport } from "@/lib/ai/types";
import { useAiEditor } from "./AiEditorContext";
import { cn } from "@/lib/utils";

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 75 ? "bg-emerald-100 text-emerald-800" : score >= 50 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800";
  return <span className={cn("rounded-full px-3 py-1 text-sm font-bold", color)}>{score}/100</span>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">{title}</h3>
      {children}
    </section>
  );
}

export function AuditReportView({ report }: { report: AuditReport }) {
  const { applyMetaDescription, applyTitleSuggestion, scrollToBlock } = useAiEditor();

  return (
    <div className="space-y-5 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium text-stone-800">Score SEO</span>
        <ScoreBadge score={report.score} />
      </div>

      <Section title="Titre">
        {!report.title.ok && report.title.suggestions.length > 0 ? (
          <ul className="space-y-1">
            {report.title.suggestions.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  className="flex w-full items-start gap-1 rounded-md px-2 py-1.5 text-left hover:bg-stone-100"
                  onClick={() => applyTitleSuggestion(s)}
                >
                  <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
                  {s}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-stone-600">OK</p>
        )}
      </Section>

      <Section title="Meta description">
        {report.metaDescription.suggested ? (
          <button
            type="button"
            className="w-full rounded-lg border border-stone-200 bg-stone-50 p-3 text-left hover:border-amber-300"
            onClick={() => applyMetaDescription(report.metaDescription.suggested)}
          >
            <p className="text-xs text-stone-500 mb-1">Cliquer pour appliquer ({report.metaDescription.suggested.length} car.)</p>
            <p className="text-stone-800">{report.metaDescription.suggested}</p>
          </button>
        ) : null}
      </Section>

      <Section title="Information gain">
        <p className={cn("font-medium", report.informationGain.addsValue ? "text-emerald-700" : "text-red-700")}>
          {report.informationGain.addsValue ? "Apporte de la valeur" : "Valeur ajoutée faible"}
        </p>
        <p className="text-stone-600">{report.informationGain.verdict}</p>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-stone-600">
          {report.informationGain.suggestions.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </Section>

      {report.structure.issues.length > 0 && (
        <Section title="Structure">
          <ul className="list-disc space-y-1 pl-4 text-stone-600">
            {report.structure.issues.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </Section>
      )}

      {report.eeat.weakPassages.length > 0 && (
        <Section title="E-E-A-T (vécu)">
          <ul className="space-y-2">
            {report.eeat.weakPassages.map((p) => (
              <li key={p.excerpt}>
                <button
                  type="button"
                  className="w-full rounded-md border border-stone-200 p-2 text-left hover:bg-stone-50"
                  onClick={() => p.blockId && scrollToBlock(p.blockId)}
                >
                  <p className="italic text-stone-700">&ldquo;{p.excerpt.slice(0, 120)}…&rdquo;</p>
                  {p.reason && <p className="mt-1 text-xs text-stone-500">{p.reason}</p>}
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {report.internalLinks.length > 0 && (
        <Section title="Maillage interne">
          <ul className="space-y-2">
            {report.internalLinks.map((link) => (
              <li key={`${link.anchor}-${link.targetSlug}`} className="rounded-md bg-stone-50 px-2 py-1.5 text-stone-700">
                <span className="font-medium">{link.anchor}</span>
                <span className="text-stone-500"> → /{link.collectionSlug}/{link.targetSlug}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {report.readability.issues.length > 0 && (
        <Section title="Lisibilité">
          <ul className="list-disc space-y-1 pl-4 text-stone-600">
            {report.readability.issues.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
