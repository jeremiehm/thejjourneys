"use client";

import { useRef, useState } from "react";
import { Search } from "lucide-react";
import { PropertyRow } from "@/components/admin/NotionEditor/PropertyRow";
import { uploadAdminImage } from "@/lib/admin/upload-image";
import { SITE_URL } from "@/lib/env";
import { cn, slugify } from "@/lib/utils";

export type SeoFieldsValue = {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  ogImageUrl: string;
  canonicalUrl: string;
  noindex: boolean;
  excerpt: string;
};

type SeoFieldsPanelProps = {
  value: SeoFieldsValue;
  onChange: (patch: Partial<SeoFieldsValue>) => void;
  title: string;
  collectionSlug: string;
  publishedAt: string | null;
  onSlugChangeRequest?: (nextSlug: string) => boolean;
};

function CharCounter({ length, limit }: { length: number; limit: number }) {
  return (
    <span className={cn("text-[11px]", length > limit ? "text-amber-600" : "text-stone-400")}>
      {length}/{limit}
    </span>
  );
}

export function SeoFieldsPanel({
  value,
  onChange,
  title,
  collectionSlug,
  publishedAt,
  onSlugChangeRequest,
}: SeoFieldsPanelProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [ogWarning, setOgWarning] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fallbackTitle = value.metaTitle.trim() || title.trim() || "Untitled";
  const fallbackDescription =
    value.metaDescription.trim() || value.excerpt.trim() || "No description yet.";
  const publicPath =
    collectionSlug && value.slug
      ? `${SITE_URL}/collections/${collectionSlug}/${value.slug}`
      : `${SITE_URL}/collections/…/${value.slug || slugify(title) || "…"}`;

  async function handleOgUpload(file: File) {
    setUploading(true);
    setOgWarning(null);
    const result = await uploadAdminImage(file);
    setUploading(false);
    if (!result.ok) {
      setOgWarning(result.error);
      return;
    }
    onChange({ ogImageUrl: result.url });

    const bitmap = await createImageBitmap(file).catch(() => null);
    if (bitmap) {
      const ratio = bitmap.width / bitmap.height;
      if (Math.abs(ratio - 1.91) > 0.25) {
        setOgWarning(
          `Uploaded ${bitmap.width}×${bitmap.height} (ratio ${ratio.toFixed(2)}). Target is ~1200×630 (1.91:1).`,
        );
      }
      bitmap.close();
    }
  }

  function handleSlugInput(next: string) {
    const cleaned = slugify(next) || next.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    if (publishedAt && cleaned !== value.slug) {
      const ok = onSlugChangeRequest?.(cleaned) ?? window.confirm(
        `This article is published. Changing the slug will create a 301 redirect from “${value.slug}” to “${cleaned}”. Continue?`,
      );
      if (!ok) return;
    }
    onChange({ slug: cleaned });
  }

  return (
    <PropertyRow
      icon={<Search className="h-4 w-4" />}
      label="SEO"
      empty={!value.metaTitle && !value.metaDescription && !value.ogImageUrl}
      valueDisplay={
        value.noindex ? (
          <span className="text-amber-700 dark:text-amber-300">noindex · {fallbackTitle.slice(0, 40)}</span>
        ) : (
          fallbackTitle.slice(0, 48) || "Empty"
        )
      }
    >
      <div className="max-h-[70vh] space-y-3 overflow-y-auto p-1">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-stone-500">Slug</span>
          <input
            type="text"
            value={value.slug}
            onChange={(event) => handleSlugInput(event.target.value)}
            className="w-full rounded-md border border-stone-200 bg-white px-2 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-900"
          />
          <p className="break-all text-[11px] text-stone-400">{publicPath}</p>
          {publishedAt ? (
            <p className="text-[11px] text-stone-500">Published — slug changes create a 301 redirect.</p>
          ) : (
            <p className="text-[11px] text-stone-500">Draft — slug can be edited freely.</p>
          )}
        </label>

        <label className="block space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Meta title</span>
            <CharCounter length={value.metaTitle.length} limit={60} />
          </div>
          <input
            type="text"
            value={value.metaTitle}
            onChange={(event) => onChange({ metaTitle: event.target.value })}
            placeholder={title || "Falls back to article title"}
            className="w-full rounded-md border border-stone-200 bg-white px-2 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-900"
          />
        </label>

        <label className="block space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Meta description</span>
            <CharCounter length={value.metaDescription.length} limit={155} />
          </div>
          <textarea
            value={value.metaDescription}
            onChange={(event) => onChange({ metaDescription: event.target.value })}
            rows={3}
            placeholder="Falls back to excerpt, then first text block"
            className="w-full rounded-md border border-stone-200 bg-white px-2 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-900"
          />
        </label>

        <div className="rounded-md border border-stone-200 bg-stone-50 p-2 dark:border-stone-700 dark:bg-stone-900/50">
          <p className="mb-1 text-[10px] uppercase tracking-wide text-stone-400">Google preview</p>
          <p className="truncate text-sm text-[#1a0dab] dark:text-blue-300">{fallbackTitle}</p>
          <p className="truncate text-[11px] text-emerald-700 dark:text-emerald-400">{publicPath}</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-stone-600 dark:text-stone-400">{fallbackDescription}</p>
        </div>

        <div className="space-y-1">
          <span className="text-xs font-medium text-stone-500">OG image (1200×630)</span>
          <div className="flex gap-2">
            <input
              type="text"
              value={value.ogImageUrl}
              onChange={(event) => onChange({ ogImageUrl: event.target.value })}
              placeholder="https://…"
              className="min-w-0 flex-1 rounded-md border border-stone-200 bg-white px-2 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-900"
            />
            <button
              type="button"
              className="rounded-md border border-stone-200 px-2 text-xs dark:border-stone-700"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? "…" : "Upload"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleOgUpload(file);
              }}
            />
          </div>
          {ogWarning ? <p className="text-[11px] text-amber-600">{ogWarning}</p> : null}
        </div>

        <label className="flex items-center justify-between gap-3 rounded-md border border-stone-200 px-2 py-2 dark:border-stone-700">
          <span className="text-sm text-stone-700 dark:text-stone-200">
            noindex
            {value.noindex ? (
              <span className="mt-0.5 block text-[11px] font-medium text-amber-600">
                Warning: this page will be excluded from search and the sitemap.
              </span>
            ) : null}
          </span>
          <input
            type="checkbox"
            checked={value.noindex}
            onChange={(event) => onChange({ noindex: event.target.checked })}
            className="size-4"
          />
        </label>

        <button
          type="button"
          className="text-xs font-medium text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
          onClick={() => setAdvancedOpen((open) => !open)}
        >
          {advancedOpen ? "Hide advanced" : "Advanced"}
        </button>

        {advancedOpen ? (
          <div className="space-y-2 border-t border-stone-200 pt-2 dark:border-stone-700">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-stone-500">Canonical URL</span>
              <input
                type="url"
                value={value.canonicalUrl}
                onChange={(event) => onChange({ canonicalUrl: event.target.value })}
                placeholder="Leave empty for self-canonical"
                className="w-full rounded-md border border-stone-200 bg-white px-2 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-900"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-stone-500">Excerpt</span>
              <textarea
                value={value.excerpt}
                onChange={(event) => onChange({ excerpt: event.target.value })}
                rows={2}
                className="w-full rounded-md border border-stone-200 bg-white px-2 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-900"
              />
            </label>
          </div>
        ) : null}
      </div>
    </PropertyRow>
  );
}
