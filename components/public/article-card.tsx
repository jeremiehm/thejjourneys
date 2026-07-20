import Link from "next/link";
import type { Article } from "@/lib/blocks/types";
import { getArticleCoverUrl } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import { AppImage } from "@/components/ui/app-image";

export function ArticleCard({ article }: { article: Article }) {
  const href =
    article.collection?.status === "published"
      ? `/collections/${article.collection.slug}/${article.slug}`
      : "#";

  return (
    <article className="group overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <Link href={href} className="block">
        <div className="relative aspect-[4/3] overflow-hidden">
          <AppImage src={getArticleCoverUrl(article)} alt={article.title} />
        </div>
        <div className="space-y-3 p-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-stone-500">
            <span>{article.author?.name ?? "JJourneys"}</span>
            <span>•</span>
            <time>{formatDate(article.published_at)}</time>
          </div>
          <h3 className="text-xl font-semibold text-stone-950 group-hover:text-amber-700">{article.title}</h3>
          {article.excerpt ? <p className="line-clamp-3 text-sm leading-6 text-stone-600">{article.excerpt}</p> : null}
        </div>
      </Link>
    </article>
  );
}
