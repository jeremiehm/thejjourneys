import Link from "next/link";
import { FileText, FolderOpen, Layers } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getDashboardStats } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export default async function AdminDashboard() {
  const stats = await getDashboardStats();

  const cards = [
    { label: "Articles", value: stats.totalArticles, icon: FileText },
    { label: "Collections", value: stats.totalCollections, icon: FolderOpen },
    { label: "Drafts", value: stats.drafts, icon: Layers },
  ];

  return (
    <div className="space-y-8">
      <AdminPageHeader breadcrumbs={[{ label: "Dashboard" }]} />

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">{item.label}</p>
                <Icon className="size-4 text-amber-500" />
              </div>
              <p className="mt-3 text-4xl font-semibold tracking-tight text-stone-950">{item.value}</p>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/articles/new"
          className="inline-flex h-9 items-center rounded-xl bg-amber-500 px-4 text-sm font-semibold text-stone-950 hover:bg-amber-400"
        >
          New article
        </Link>
        <Link
          href="/admin/collections/new"
          className="inline-flex h-9 items-center rounded-xl border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-800 hover:bg-stone-50"
        >
          New collection
        </Link>
      </div>

      <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-950">Recent activity</h2>
        <div className="mt-4 divide-y divide-stone-100">
          {stats.recentArticles.map((article) => (
            <div key={article.id} className="flex items-center justify-between py-4">
              <div>
                <p className="font-medium text-stone-900">{article.title}</p>
                <p className="text-sm text-stone-500">{article.collection?.title ?? "Collection"}</p>
              </div>
              <p className="text-sm text-stone-500">{formatDate(article.updated_at)}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
