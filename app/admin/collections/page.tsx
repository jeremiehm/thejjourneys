import Link from "next/link";
import { DeleteCollectionButton } from "@/components/admin/delete-collection-button";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StatusBadge } from "@/components/admin/form-fields";
import { getArticles, getCollections } from "@/lib/data";

export default async function AdminCollectionsPage() {
  const [collections, articles] = await Promise.all([
    getCollections({ includeDrafts: true }),
    getArticles({ includeDrafts: true }),
  ]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        breadcrumbs={[{ label: "Collections" }]}
        actions={
          <Link
            href="/admin/collections/new"
            className="inline-flex h-9 items-center rounded-xl bg-amber-500 px-4 text-sm font-semibold text-stone-950 transition hover:bg-amber-400"
          >
            Nouvelle collection
          </Link>
        }
      />
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-stone-100 bg-stone-50/80 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
            <tr>
              <th className="px-4 py-3">Titre</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Articles</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {collections.map((collection) => (
              <tr key={collection.id} className="transition hover:bg-stone-50/50">
                <td className="px-4 py-3.5 font-medium text-stone-900">{collection.title}</td>
                <td className="px-4 py-3.5 text-stone-600">{collection.slug}</td>
                <td className="px-4 py-3.5 text-stone-600">
                  {articles.filter((article) => article.collection_id === collection.id).length}
                </td>
                <td className="px-4 py-3.5">
                  <StatusBadge status={collection.status} />
                </td>
                <td className="flex gap-3 px-4 py-3.5">
                  <Link
                    href={`/admin/collections/${collection.id}`}
                    className="font-medium text-amber-600 hover:text-amber-700"
                  >
                    Éditer
                  </Link>
                  <DeleteCollectionButton id={collection.id} title={collection.title} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
