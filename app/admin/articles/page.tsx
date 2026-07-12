import Link from "next/link";
import { DeleteArticleButton } from "@/components/admin/delete-article-button";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StatusBadge } from "@/components/admin/form-fields";
import { getArticles } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export default async function AdminArticlesPage() {
  const articles = await getArticles({ includeDrafts: true });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        breadcrumbs={[{ label: "Articles" }]}
        actions={
          <Link
            href="/admin/articles/new"
            className="inline-flex h-9 items-center rounded-xl bg-amber-500 px-4 text-sm font-semibold text-stone-950 transition hover:bg-amber-400"
          >
            New article
          </Link>
        }
      />
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-stone-100 bg-stone-50/80 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Collection</th>
              <th className="px-4 py-3">Author</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last edited</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {articles.map((article) => (
              <tr key={article.id} className="transition hover:bg-stone-50/50">
                <td className="px-4 py-3.5 font-medium text-stone-900">{article.title}</td>
                <td className="px-4 py-3.5 text-stone-600">{article.collection?.title ?? "—"}</td>
                <td className="px-4 py-3.5 text-stone-600">{article.author?.name ?? "—"}</td>
                <td className="px-4 py-3.5">
                  <StatusBadge status={article.status} />
                </td>
                <td className="px-4 py-3.5 text-stone-500">{formatDate(article.updated_at)}</td>
                <td className="flex gap-3 px-4 py-3.5">
                  <Link href={`/admin/articles/${article.id}/edit`} className="font-medium text-amber-600 hover:text-amber-700">
                    Edit
                  </Link>
                  <DeleteArticleButton id={article.id} title={article.title} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
