import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LayoutRenderer } from "@/components/public/layout-renderer";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { getArticles, getCollectionBySlug } from "@/lib/data";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const collection = await getCollectionBySlug(slug);
  if (!collection) return { title: "Collection not found" };
  return { title: collection.title, description: collection.description ?? undefined, openGraph: { title: collection.title, description: collection.description ?? undefined, images: collection.cover_image_url ? [collection.cover_image_url] : undefined } };
}

export default async function CollectionPage({ params }: PageProps) {
  const { slug } = await params;
  const collection = await getCollectionBySlug(slug);
  if (!collection) notFound();
  const articles = await getArticles({ collectionId: collection.id });

  return <><SiteHeader /><main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8"><LayoutRenderer blocks={collection.layout} articles={articles} /></main><SiteFooter /></>;
}
