import Link from "next/link";
import type { Article, Collection } from "@/lib/blocks/types";
import { AppImage } from "@/components/ui/app-image";

export function CollectionCard({ collection, articles }: { collection: Collection; articles: Article[] }) {
  const count = articles.filter((article) => article.collection_id === collection.id).length;

  return (
    <Link href={`/collections/${collection.slug}`} className="group block overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-[16/10] overflow-hidden">
        <AppImage src={collection.cover_image_url} alt={collection.title} />
      </div>
      <div className="space-y-3 p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-amber-700">{count} article{count > 1 ? "s" : ""}</p>
        <h2 className="text-2xl font-semibold text-stone-950 group-hover:text-amber-700">{collection.title}</h2>
        {collection.description ? <p className="leading-7 text-stone-600">{collection.description}</p> : null}
      </div>
    </Link>
  );
}
