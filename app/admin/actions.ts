"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isUuid } from "@/lib/admin/ids";
import { createArticleRevision } from "@/lib/article-revisions";
import { parseArticleContent, parseCollectionLayout } from "@/lib/blocks/validation";
import { slugify } from "@/lib/utils";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function value(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function parseJson(value: string) {
  try { return JSON.parse(value); } catch { return []; }
}

function redirectWithFlash(path: string, type: "error" | "success", message: string): never {
  redirect(`${path}?${type}=${encodeURIComponent(message)}`);
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase?.auth.signOut();
  redirect("/admin/login");
}

export async function saveCollection(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirectWithFlash("/admin/collections", "error", "Supabase non configuré.");
  const id = value(formData, "id");
  const title = value(formData, "title");
  const payload = {
    title,
    slug: value(formData, "slug") || slugify(title),
    description: value(formData, "description") || null,
    cover_image_url: value(formData, "cover_image_url") || null,
    status: value(formData, "status") === "published" ? "published" as const : "draft" as const,
    layout: parseCollectionLayout(parseJson(value(formData, "layout"))),
  };

  if (id) {
    const { error } = await supabase.from("collections").update(payload).eq("id", id);
    if (error) redirectWithFlash(`/admin/collections/${id}`, "error", error.message);
  } else {
    const { error } = await supabase.from("collections").insert(payload);
    if (error) redirectWithFlash("/admin/collections/new", "error", error.message);
  }
  revalidatePath("/admin/collections");
  revalidatePath("/collections");
  redirectWithFlash("/admin/collections", "success", id ? "Collection mise à jour." : "Collection créée.");
}

export async function deleteCollection(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const id = value(formData, "id");
  if (!supabase) redirectWithFlash("/admin/collections", "error", "Supabase non configuré.");
  if (!id) redirectWithFlash("/admin/collections", "error", "Identifiant de collection manquant.");
  if (!isUuid(id)) {
    redirectWithFlash(
      "/admin/collections",
      "error",
      "Cette entrée provient des données de démo et ne peut pas être supprimée.",
    );
  }

  const { error, count } = await supabase.from("collections").delete({ count: "exact" }).eq("id", id);
  if (error) redirectWithFlash("/admin/collections", "error", error.message);
  if (!count) {
    redirectWithFlash(
      "/admin/collections",
      "error",
      "Aucune collection supprimée. Vérifiez que vous êtes connecté et réessayez.",
    );
  }

  revalidatePath("/admin/collections");
  revalidatePath("/collections");
  redirectWithFlash("/admin/collections", "success", "Collection supprimée.");
}

const COVER_TYPES = ["banner", "above_title", "below_title"] as const;

async function uniqueArticleSlug(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  baseSlug: string,
  excludeId?: string,
) {
  let slug = baseSlug || "sans-titre";
  for (let attempt = 0; attempt < 20; attempt += 1) {
    let query = supabase.from("articles").select("id").eq("slug", slug).limit(1);
    if (excludeId) query = query.neq("id", excludeId);
    const { data } = await query.maybeSingle();
    if (!data) return slug;
    slug = `${baseSlug || "sans-titre"}-${attempt + 2}`;
  }
  return `${baseSlug || "sans-titre"}-${Date.now()}`;
}

async function nextArticlePosition(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  collectionId: string,
) {
  const { data } = await supabase
    .from("articles")
    .select("position")
    .eq("collection_id", collectionId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.position ?? -1) + 1;
}

function buildArticlePayload(formData: FormData, options?: { isUpdate?: boolean }) {
  const rawTitle = value(formData, "title");
  const title = rawTitle || "Sans titre";
  const intent = value(formData, "intent");
  const status =
    intent === "publish"
      ? "published"
      : value(formData, "status") === "published"
        ? "published"
        : "draft";
  const existingPublishedAt = value(formData, "existing_published_at");
  const previousStatus = value(formData, "previous_status");
  const coverTypeRaw = value(formData, "cover_type");

  let published_at: string | null = null;
  if (status === "published") {
    if (existingPublishedAt) {
      published_at = new Date(existingPublishedAt).toISOString();
    } else if (intent === "publish" || previousStatus !== "published") {
      published_at = new Date().toISOString();
    }
  }

  const payload = {
    title,
    slug: slugify(title) || "sans-titre",
    collection_id: value(formData, "collection_id"),
    author_id: value(formData, "author_id"),
    excerpt: value(formData, "excerpt") || null,
    meta_description: value(formData, "meta_description") || null,
    lang: value(formData, "lang") || "fr",
    cover_image_url: value(formData, "cover_image_url") || null,
    cover_type: COVER_TYPES.includes(coverTypeRaw as (typeof COVER_TYPES)[number])
      ? (coverTypeRaw as (typeof COVER_TYPES)[number])
      : "banner",
    status: status as "draft" | "published",
    published_at,
    content: parseArticleContent(parseJson(value(formData, "content"))),
  };

  return payload;
}

export async function autosaveArticle(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false as const, error: "Supabase is not configured." };

  const collectionId = value(formData, "collection_id");
  const authorId = value(formData, "author_id");
  if (!collectionId || !authorId) {
    return { ok: false as const, error: "Sélectionnez une collection et un auteur." };
  }

  const id = value(formData, "id");
  const basePayload = buildArticlePayload(formData, { isUpdate: Boolean(id) });

  if (id) {
    const payload = basePayload;
    const { data, error } = await supabase
      .from("articles")
      .update(payload)
      .eq("id", id)
      .select("id, updated_at, published_at")
      .single();
    if (error) return { ok: false as const, error: error.message };
    await createArticleRevision(
      id,
      {
        title: payload.title,
        excerpt: payload.excerpt,
        meta_description: payload.meta_description,
        content: payload.content,
      },
      "Autosave",
      { throttleAutosave: true },
    );
    revalidatePath("/admin/articles");
    revalidatePath("/collections");
    return {
      ok: true as const,
      id,
      updatedAt: data?.updated_at,
      publishedAt: data?.published_at,
    };
  }

  const position = await nextArticlePosition(supabase, collectionId);
  const slug = await uniqueArticleSlug(supabase, basePayload.slug);
  const payload = { ...basePayload, position, slug };

  const { data, error } = await supabase
    .from("articles")
    .insert(payload)
    .select("id, updated_at, published_at")
    .single();
  if (error || !data) {
    const message = error?.message ?? "Insert failed.";
    if (message.includes("cover_type")) {
      return {
        ok: false as const,
        error: "Colonne cover_type manquante en base. Exécutez la migration Supabase (supabase db push).",
      };
    }
    return { ok: false as const, error: message };
  }
  revalidatePath("/admin/articles");
  revalidatePath("/collections");
  return {
    ok: true as const,
    id: data.id,
    updatedAt: data.updated_at,
    publishedAt: data.published_at,
  };
}

export async function saveArticle(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirectWithFlash("/admin/articles", "error", "Supabase non configuré.");
  const id = value(formData, "id");
  const collectionId = value(formData, "collection_id");
  const basePayload = buildArticlePayload(formData, { isUpdate: Boolean(id) });

  if (id) {
    const { error } = await supabase.from("articles").update(basePayload).eq("id", id);
    if (error) redirectWithFlash(`/admin/articles/${id}/edit`, "error", error.message);
    await createArticleRevision(
      id,
      {
        title: basePayload.title,
        excerpt: basePayload.excerpt,
        meta_description: basePayload.meta_description,
        content: basePayload.content,
      },
      value(formData, "intent") === "publish" ? "Publication" : "Sauvegarde",
    );
  } else {
    const position = collectionId ? await nextArticlePosition(supabase, collectionId) : 0;
    const slug = await uniqueArticleSlug(supabase, basePayload.slug);
    const { error } = await supabase.from("articles").insert({ ...basePayload, position, slug });
    if (error) redirectWithFlash("/admin/articles/new", "error", error.message);
  }
  revalidatePath("/admin/articles");
  revalidatePath("/collections");
  redirectWithFlash("/admin/articles", "success", id ? "Article mis à jour." : "Article créé.");
}

export async function restoreArticleRevision(revisionId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false as const, error: "Supabase non configuré." };

  const { data: revision, error: fetchError } = await supabase
    .from("article_revisions")
    .select("*")
    .eq("id", revisionId)
    .maybeSingle();

  if (fetchError || !revision) {
    return { ok: false as const, error: "Révision introuvable." };
  }

  await createArticleRevision(
    revision.article_id,
    {
      title: revision.title,
      excerpt: revision.excerpt,
      meta_description: revision.meta_description,
      content: revision.content as import("@/lib/blocks/types").ArticleBlock[],
    },
    "Avant restauration",
  );

  const { error } = await supabase
    .from("articles")
    .update({
      title: revision.title,
      excerpt: revision.excerpt,
      meta_description: revision.meta_description,
      content: revision.content,
    })
    .eq("id", revision.article_id);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/articles");
  revalidatePath("/collections");
  return { ok: true as const, articleId: revision.article_id };
}

export async function createManualRevision(
  articleId: string,
  snapshot: {
    title: string;
    excerpt: string | null;
    meta_description: string | null;
    content: import("@/lib/blocks/types").ArticleBlock[];
  },
  label: string,
) {
  if (!isUuid(articleId)) return { ok: false as const, error: "Article non enregistré." };
  await createArticleRevision(articleId, snapshot, label);
  return { ok: true as const };
}

export async function deleteArticle(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const id = value(formData, "id");
  if (!supabase) redirectWithFlash("/admin/articles", "error", "Supabase non configuré.");
  if (!id) redirectWithFlash("/admin/articles", "error", "Identifiant d'article manquant.");
  if (!isUuid(id)) {
    redirectWithFlash("/admin/articles", "error", "Cette entrée provient des données de démo et ne peut pas être supprimée.");
  }

  const { error, count } = await supabase.from("articles").delete({ count: "exact" }).eq("id", id);
  if (error) redirectWithFlash("/admin/articles", "error", error.message);
  if (!count) {
    redirectWithFlash("/admin/articles", "error", "Aucun article supprimé. Vérifiez que vous êtes connecté et réessayez.");
  }

  revalidatePath("/admin/articles");
  revalidatePath("/collections");
  redirectWithFlash("/admin/articles", "success", "Article supprimé.");
}
