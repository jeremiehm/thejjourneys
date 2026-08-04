"use client";

import { runSeoChecks, type SeoCheckResult } from "@/lib/seo/checks";
import type { ArticleBlock } from "@/lib/blocks/types";
import { cn } from "@/lib/utils";

type SeoChecksPanelProps = {
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  ogImageUrl: string;
  coverImageUrl: string;
  noindex: boolean;
  content: ArticleBlock[];
};

function StatusDot({ status }: { status: SeoCheckResult["status"] }) {
  return (
    <span
      className={cn(
        "mt-1 size-2 shrink-0 rounded-full",
        status === "pass" && "bg-emerald-500",
        status === "warn" && "bg-amber-500",
        status === "fail" && "bg-red-500",
      )}
    />
  );
}

export function SeoChecksPanel(props: SeoChecksPanelProps) {
  const results = runSeoChecks({
    title: props.title,
    slug: props.slug,
    metaTitle: props.metaTitle || null,
    metaDescription: props.metaDescription || null,
    ogImageUrl: props.ogImageUrl || null,
    coverImageUrl: props.coverImageUrl || null,
    noindex: props.noindex,
    content: props.content,
  });

  const fails = results.filter((r) => r.status === "fail").length;
  const warns = results.filter((r) => r.status === "warn").length;

  return (
    <div className="space-y-3 p-4">
      <p className="text-xs text-stone-500">
        Deterministic checks only — no AI score.
        {fails ? ` ${fails} blocking.` : ""}
        {warns ? ` ${warns} warning(s).` : ""}
      </p>
      <ul className="space-y-2">
        {results.map((result) => (
          <li key={result.id} className="flex gap-2 text-sm">
            <StatusDot status={result.status} />
            <div>
              <p
                className={cn(
                  "font-medium capitalize",
                  result.status === "fail" && "text-red-700 dark:text-red-300",
                  result.status === "warn" && "text-amber-700 dark:text-amber-300",
                  result.status === "pass" && "text-stone-700 dark:text-stone-300",
                )}
              >
                {result.id.replaceAll("_", " ")}
              </p>
              <p className="text-xs text-stone-500">{result.message}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
