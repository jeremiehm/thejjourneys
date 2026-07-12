import { notFound } from "next/navigation";
import { CollectionForm } from "@/components/admin/collection-form";
import { getArticles, getCollectionById } from "@/lib/data";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditCollectionPage({ params }: PageProps) {
  const { id } = await params;
  const [collection, articles] = await Promise.all([
    getCollectionById(id),
    getArticles({ includeDrafts: true }),
  ]);
  if (!collection) notFound();

  return (
    <CollectionForm
      collection={collection}
      articles={articles}
      breadcrumbs={[
        { label: "Collections", href: "/admin/collections" },
        { label: collection.title },
      ]}
    />
  );
}
