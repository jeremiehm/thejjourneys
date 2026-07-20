import type { Metadata } from "next";
import { CollectionCard } from "@/components/public/collection-card";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { getArticles, getCollections } from "@/lib/data";

export const metadata: Metadata = { title: "Collections", description: "All journeys published by JJourneys." };

export default async function CollectionsPage() {
  const [collections, articles] = await Promise.all([getCollections(), getArticles()]);
  return <><SiteHeader /><main className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8"><p className="text-sm uppercase tracking-[0.25em] text-amber-700">Collections</p><h1 className="mt-3 text-5xl font-semibold tracking-tight text-stone-950">All our journeys</h1><p className="mt-4 max-w-2xl text-lg leading-8 text-stone-600">Each collection brings together an itinerary, its articles, and a custom homepage.</p><div className="mt-10 grid gap-6 md:grid-cols-2">{collections.map((collection) => <CollectionCard key={collection.id} collection={collection} articles={articles} />)}</div></main><SiteFooter /></>;
}
