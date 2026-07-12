"use client";

import { useState } from "react";
import type { Article, Author, Collection } from "@/lib/blocks/types";
import { saveArticle } from "@/app/admin/actions";
import { BlockEditor } from "@/components/admin/block-editor";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { AdminPageHeader, type BreadcrumbItem } from "@/components/admin/admin-page-header";
import {
  AdminField,
  AdminNativeSelect,
  AdminTextarea,
  StatusBadge,
  adminFieldLabelClass,
} from "@/components/admin/form-fields";
import { createArticleBlock } from "@/lib/blocks/defaults";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type ArticleFormProps = {
  article?: Article | null;
  collections: Collection[];
  authors: Author[];
  breadcrumbs: BreadcrumbItem[];
};

export function ArticleForm({ article, collections, authors, breadcrumbs }: ArticleFormProps) {
  const defaultContent = article?.content?.length ? article.content : [createArticleBlock("text")];
  const [status, setStatus] = useState<"draft" | "published">(article?.status ?? "draft");

  function handleSubmit() {
    sessionStorage.setItem("admin-toast", article?.id ? "Article mis à jour" : "Article enregistré");
  }

  return (
    <form action={saveArticle} onSubmit={handleSubmit} className="pb-24">
      <input type="hidden" name="id" value={article?.id ?? ""} />

      <AdminPageHeader
        breadcrumbs={breadcrumbs}
        actions={
          <>
            <Button type="submit" name="intent" value="save" variant="outline" className="rounded-xl">
              Enregistrer le brouillon
            </Button>
            <Button
              type="submit"
              name="intent"
              value="publish"
              className="rounded-xl bg-amber-500 text-stone-950 hover:bg-amber-400"
            >
              Publier
            </Button>
          </>
        }
      />

      <div className="grid gap-5 rounded-xl border border-stone-200 bg-white p-6 shadow-sm md:grid-cols-2">
        <AdminField label="Title" name="title" required defaultValue={article?.title ?? ""} />
        <AdminField label="Slug" name="slug" defaultValue={article?.slug ?? ""} placeholder="auto if empty" />
        <AdminNativeSelect
          label="Collection"
          name="collection_id"
          defaultValue={article?.collection_id ?? collections[0]?.id ?? ""}
          options={collections.map((collection) => ({ value: collection.id, label: collection.title }))}
        />
        <AdminNativeSelect
          label="Author"
          name="author_id"
          defaultValue={article?.author_id ?? authors[0]?.id ?? ""}
          options={authors.map((author) => ({ value: author.id, label: author.name }))}
        />
        <AdminTextarea
          label="Short excerpt"
          name="excerpt"
          defaultValue={article?.excerpt ?? ""}
          className="md:col-span-2"
        />
        <ImageUploadField name="cover_image_url" label="Cover image" defaultValue={article?.cover_image_url} />
        <div className="space-y-2">
          <Label className={adminFieldLabelClass}>Status</Label>
          <div className="flex items-center gap-3">
            <StatusBadge status={status} />
            <select
              name="status"
              value={status}
              onChange={(event) => setStatus(event.target.value as "draft" | "published")}
              className={cn(
                "h-11 flex-1 appearance-none rounded-xl border border-stone-200 bg-stone-50/80 px-3 text-sm outline-none focus-visible:border-amber-400 focus-visible:ring-[3px] focus-visible:ring-amber-400/30",
              )}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>
        <AdminField
          label="Publish date"
          name="published_at"
          type="datetime-local"
          defaultValue={article?.published_at ? article.published_at.slice(0, 16) : ""}
        />
        <AdminField
          label="Ordre dans la collection"
          name="position"
          type="number"
          defaultValue={article?.position ?? 0}
          tooltip="Les numéros les plus bas apparaissent en premier dans la collection."
        />
      </div>

      <section className="mt-8 space-y-4 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-stone-950">Article content</h2>
          <p className="mt-1 text-sm text-stone-500">
            Reorderable blocks with rich text editing. Saved to <code className="text-xs">articles.content</code>.
          </p>
        </div>
        <BlockEditor name="content" defaultValue={defaultContent} />
      </section>
    </form>
  );
}
