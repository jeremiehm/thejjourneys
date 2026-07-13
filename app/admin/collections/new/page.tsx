import { CollectionForm } from "@/components/admin/collection-form";
import { getArticles } from "@/lib/data";

export default async function NewCollectionPage() {
  const articles = await getArticles({ includeDrafts: true });

  return (
    <CollectionForm
      articles={articles}
      breadcrumbs={[
        { label: "Collections", href: "/admin/collections" },
        { label: "New collection" },
      ]}
    />
  );
}
