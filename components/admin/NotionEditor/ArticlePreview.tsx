"use client";

import { ArticleBlockView } from "@/components/public/article-block-view";
import { ArticleCover } from "@/components/public/article-cover";
import type { ArticleBlock, Author, CoverType } from "@/lib/blocks/types";
import { cn } from "@/lib/utils";

type ArticlePreviewProps = {
  title: string;
  excerpt: string;
  coverUrl: string;
  coverType: CoverType;
  blocks: ArticleBlock[];
  author?: Author | null;
  viewport: "desktop" | "mobile";
};

export function ArticlePreview({
  title,
  excerpt,
  coverUrl,
  coverType,
  blocks,
  author,
  viewport,
}: ArticlePreviewProps) {
  const isMobile = viewport === "mobile";

  return (
    <div
      className={cn(
        "mx-auto w-full transition-all duration-200",
        isMobile ? "max-w-[390px]" : "max-w-3xl",
      )}
    >
      <div
        className={cn(
          "overflow-hidden bg-white text-stone-900 shadow-sm ring-1 ring-stone-200 dark:bg-[#fafaf9] dark:ring-stone-300",
          isMobile ? "rounded-[2rem]" : "rounded-xl",
        )}
      >
        {isMobile ? (
          <div className="flex justify-center bg-stone-100 py-2">
            <div className="h-1 w-16 rounded-full bg-stone-300" />
          </div>
        ) : null}

        <div className={cn("px-4 py-8 sm:px-8", isMobile && "px-5 py-6 text-[15px]")}>
          {coverUrl && (coverType === "banner" || coverType === "above_title") ? (
            <div className="mb-6">
              <ArticleCover
                url={coverUrl}
                type={coverType === "banner" ? "banner" : "above_title"}
                title={title}
              />
            </div>
          ) : null}

          <h1
            className={cn(
              "font-semibold tracking-tight text-stone-950",
              isMobile ? "text-2xl leading-tight" : "text-4xl sm:text-5xl",
            )}
          >
            {title || "Untitled article"}
          </h1>

          {author ? (
            <p className="mt-3 text-sm text-stone-500">{author.name}</p>
          ) : null}

          {excerpt ? (
            <p className={cn("mt-4 text-stone-600", isMobile ? "text-base leading-7" : "text-xl leading-8")}>
              {excerpt}
            </p>
          ) : null}

          {coverUrl && coverType === "below_title" ? (
            <div className="mt-6">
              <ArticleCover url={coverUrl} type="below_title" title={title} />
            </div>
          ) : null}

          <div className={cn("mt-8 space-y-6", isMobile && "prose-sm")}>
            {blocks.map((block) => (
              <ArticleBlockView key={block.id} block={block} />
            ))}
          </div>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-stone-400">
        {isMobile ? "Mobile preview (~390px)" : "Desktop preview"}
      </p>
    </div>
  );
}
