"use client";

import type { Article, Collection } from "@/lib/blocks/types";
import { saveCollection } from "@/app/admin/actions";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { LayoutBuilder } from "@/components/admin/layout-builder";
import { AdminPageHeader, type BreadcrumbItem } from "@/components/admin/admin-page-header";
import { AdminField, AdminTextarea, StatusBadge, adminFieldLabelClass } from "@/components/admin/form-fields";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useState } from "react";

type CollectionFormProps = {
  collection?: Collection | null;
  articles: Article[];
  breadcrumbs: BreadcrumbItem[];
};

export function CollectionForm({ collection, articles, breadcrumbs }: CollectionFormProps) {
  const [status, setStatus] = useState<"draft" | "published">(collection?.status ?? "draft");

  function handleSubmit() {
    sessionStorage.setItem(
      "admin-toast",
      collection?.id ? "Collection mise à jour" : "Collection enregistrée",
    );
  }

  return (
    <form action={saveCollection} onSubmit={handleSubmit} className="pb-12">
      <input type="hidden" name="id" value={collection?.id ?? ""} />

      <AdminPageHeader
        breadcrumbs={breadcrumbs}
        actions={
          <Button type="submit" className="rounded-xl bg-amber-500 text-stone-950 hover:bg-amber-400">
            Enregistrer la collection
          </Button>
        }
      />

      <div className="grid gap-5 rounded-xl border border-stone-200 bg-white p-6 shadow-sm md:grid-cols-2">
        <AdminField label="Titre" name="title" required defaultValue={collection?.title ?? ""} />
        <AdminField label="Slug" name="slug" defaultValue={collection?.slug ?? ""} placeholder="auto si vide" />
        <AdminTextarea
          label="Description"
          name="description"
          defaultValue={collection?.description ?? ""}
          rows={4}
          className="md:col-span-2"
        />
        <ImageUploadField name="cover_image_url" label="Image de couverture" defaultValue={collection?.cover_image_url} />
        <div className="space-y-2">
          <Label className={adminFieldLabelClass}>Statut</Label>
          <div className="flex items-center gap-3">
            <StatusBadge status={status} />
            <select
              name="status"
              value={status}
              onChange={(event) => setStatus(event.target.value as "draft" | "published")}
              className="h-11 flex-1 appearance-none rounded-xl border border-stone-200 bg-stone-50/80 bg-[length:16px] bg-[position:right_12px_center] bg-no-repeat px-3 text-sm outline-none focus-visible:border-amber-400 focus-visible:ring-[3px] focus-visible:ring-amber-400/30 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%2378716c%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpath d=%27m6 9 6 6 6-6%27/%3E%3C/svg%3E')]"
            >
              <option value="draft">Brouillon</option>
              <option value="published">Publié</option>
            </select>
          </div>
        </div>
      </div>

      <section className="mt-8 space-y-4 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-stone-950">Mise en page de la collection</h2>
          <p className="mt-1 text-sm text-stone-500">
            Blocs réordonnables, enregistrés dans <code className="text-xs">collections.layout</code>.
          </p>
        </div>
        <LayoutBuilder name="layout" defaultValue={collection?.layout ?? []} articles={articles} />
      </section>
    </form>
  );
}
