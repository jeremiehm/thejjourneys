"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isUuid } from "@/lib/admin/ids";
import { createArticleRevision } from "@/lib/article-revisions";
import { structureSectionsToBlocks } from "@/lib/ai/structure-to-blocks";
import type { StructureSection } from "@/lib/ai/types";
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
  if (!supabase) redirectWithFlash("/admin/collections", "error", "Supabase is not configured.");
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
  redirectWithFlash("/admin/collections", "success", id ? "Collection updated." : "Collection created.");
}

export async function deleteCollection(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const id = value(formData, "id");
  if (!supabase) redirectWithFlash("/admin/collections", "error", "Supabase is not configured.");
  if (!id) redirectWithFlash("/admin/collections", "error", "Missing collection ID.");
  if (!isUuid(id)) {
    redirectWithFlash(
      "/admin/collections",
      "error",
      "This entry comes from demo data and cannot be deleted.",
    );
  }

  const { error, count } = await supabase.from("collections").delete({ count: "exact" }).eq("id", id);
  if (error) redirectWithFlash("/admin/collections", "error", error.message);
  if (!count) {
    redirectWithFlash(
      "/admin/collections",
      "error",
      "No collection was deleted. Check that you are signed in and try again.",
    );
  }

  revalidatePath("/admin/collections");
  revalidatePath("/collections");
  redirectWithFlash("/admin/collections", "success", "Collection deleted.");
}

const COVER_TYPES = ["banner", "above_title", "below_title"] as const;

async function uniqueArticleSlug(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  baseSlug: string,
  excludeId?: string,
) {
  let slug = baseSlug || "untitled";
  for (let attempt = 0; attempt < 20; attempt += 1) {
    let query = supabase.from("articles").select("id").eq("slug", slug).limit(1);
    if (excludeId) query = query.neq("id", excludeId);
    const { data } = await query.maybeSingle();
    if (!data) return slug;
    slug = `${baseSlug || "untitled"}-${attempt + 2}`;
  }
  return `${baseSlug || "untitled"}-${Date.now()}`;
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
  const title = rawTitle || "Untitled";
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
    slug: slugify(title) || "untitled",
    collection_id: value(formData, "collection_id"),
    author_id: value(formData, "author_id"),
    excerpt: value(formData, "excerpt") || null,
    meta_description: value(formData, "meta_description") || null,
    lang: value(formData, "lang") || "en",
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
    return { ok: false as const, error: "Select a collection and an author." };
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
        error: "Missing cover_type column in database. Run the Supabase migration (supabase db push).",
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
  if (!supabase) redirectWithFlash("/admin/articles", "error", "Supabase is not configured.");
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
      value(formData, "intent") === "publish" ? "Publish" : "Save",
    );
    revalidatePath("/admin/articles");
    revalidatePath("/collections");
    revalidatePath(`/admin/articles/${id}/edit`);
    redirect(`/admin/articles/${id}/edit`);
  }

  const position = collectionId ? await nextArticlePosition(supabase, collectionId) : 0;
  const slug = await uniqueArticleSlug(supabase, basePayload.slug);
  const { data, error } = await supabase
    .from("articles")
    .insert({ ...basePayload, position, slug })
    .select("id")
    .single();
  if (error || !data) redirectWithFlash("/admin/articles/new", "error", error?.message ?? "Insert failed.");
  revalidatePath("/admin/articles");
  revalidatePath("/collections");
  redirect(`/admin/articles/${data.id}/edit`);
}

export async function restoreArticleRevision(revisionId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false as const, error: "Supabase is not configured." };

  const { data: revision, error: fetchError } = await supabase
    .from("article_revisions")
    .select("*")
    .eq("id", revisionId)
    .maybeSingle();

  if (fetchError || !revision) {
    return { ok: false as const, error: "Revision not found." };
  }

  await createArticleRevision(
    revision.article_id,
    {
      title: revision.title,
      excerpt: revision.excerpt,
      meta_description: revision.meta_description,
      content: revision.content as import("@/lib/blocks/types").ArticleBlock[],
    },
    "Before restore",
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
  if (!isUuid(articleId)) return { ok: false as const, error: "Article not saved yet." };
  const revisionId = await createArticleRevision(articleId, snapshot, label);
  if (!revisionId) return { ok: false as const, error: "Could not save revision." };
  return { ok: true as const, revisionId };
}

export async function restoreLatestRevisionByLabel(articleId: string, label: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false as const, error: "Supabase is not configured." };
  if (!isUuid(articleId)) return { ok: false as const, error: "Invalid article ID." };

  const { data: revision, error } = await supabase
    .from("article_revisions")
    .select("id")
    .eq("article_id", articleId)
    .eq("label", label)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !revision) {
    return { ok: false as const, error: `No "${label}" revision found.` };
  }

  return restoreArticleRevision(revision.id);
}

export async function createCompanionArticles(input: {
  collectionId: string;
  authorId: string;
  lang: string;
  articles: Array<{
    title: string;
    slug?: string;
    excerpt: string;
    metaDescription: string;
    sections: StructureSection[];
    linkAnchor: string;
  }>;
}) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false as const, error: "Supabase is not configured." };

  const user = await supabase.auth.getUser();
  if (!user.data.user) return { ok: false as const, error: "Unauthorized." };

  if (!input.collectionId || !input.authorId) {
    return { ok: false as const, error: "Select a collection and an author first." };
  }

  if (!input.articles.length) {
    return { ok: true as const, articles: [] as Array<{ id: string; title: string; slug: string; linkAnchor: string }> };
  }

  const created: Array<{ id: string; title: string; slug: string; linkAnchor: string }> = [];

  for (const article of input.articles) {
    const baseSlug = slugify(article.slug ?? article.title) || "untitled";
    const slug = await uniqueArticleSlug(supabase, baseSlug);
    const position = await nextArticlePosition(supabase, input.collectionId);
    const content = structureSectionsToBlocks(article.sections);

    const { data, error } = await supabase
      .from("articles")
      .insert({
        title: article.title,
        slug,
        collection_id: input.collectionId,
        author_id: input.authorId,
        excerpt: article.excerpt,
        meta_description: article.metaDescription,
        lang: input.lang || "en",
        cover_image_url: null,
        cover_type: "banner",
        status: "draft",
        published_at: null,
        position,
        content,
      })
      .select("id, title, slug")
      .single();

    if (error || !data) {
      return { ok: false as const, error: error?.message ?? `Failed to create "${article.title}".` };
    }

    await createArticleRevision(
      data.id,
      {
        title: article.title,
        excerpt: article.excerpt,
        meta_description: article.metaDescription,
        content,
      },
      "AI: SEO companion",
    );

    created.push({
      id: data.id,
      title: data.title,
      slug: data.slug,
      linkAnchor: article.linkAnchor,
    });
  }

  revalidatePath("/admin/articles");
  revalidatePath("/collections");

  return { ok: true as const, articles: created };
}

export async function deleteArticle(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const id = value(formData, "id");
  if (!supabase) redirectWithFlash("/admin/articles", "error", "Supabase is not configured.");
  if (!id) redirectWithFlash("/admin/articles", "error", "Missing article ID.");
  if (!isUuid(id)) {
    redirectWithFlash("/admin/articles", "error", "This entry comes from demo data and cannot be deleted.");
  }

  const { error, count } = await supabase.from("articles").delete({ count: "exact" }).eq("id", id);
  if (error) redirectWithFlash("/admin/articles", "error", error.message);
  if (!count) {
    redirectWithFlash("/admin/articles", "error", "No article was deleted. Check that you are signed in and try again.");
  }

  revalidatePath("/admin/articles");
  revalidatePath("/collections");
  redirectWithFlash("/admin/articles", "success", "Article deleted.");
}

export async function saveAiAgent(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirectWithFlash("/admin/agents", "error", "Supabase is not configured.");

  const id = value(formData, "id");
  const name = value(formData, "name");
  const isDefault = value(formData, "is_default") === "on";
  const context = value(formData, "context");

  if (!name) redirectWithFlash(id ? `/admin/agents/${id}` : "/admin/agents/new", "error", "Name is required.");
  if (!context) redirectWithFlash(id ? `/admin/agents/${id}` : "/admin/agents/new", "error", "Travel context is required.");

  const payload = {
    name,
    slug: value(formData, "slug") || slugify(name),
    description: value(formData, "description") || null,
    context,
    tone: value(formData, "tone") || null,
    is_default: isDefault,
  };

  if (isDefault) {
    await supabase.from("ai_agents").update({ is_default: false }).eq("is_default", true);
  }

  if (id) {
    const { error } = await supabase.from("ai_agents").update(payload).eq("id", id);
    if (error) redirectWithFlash(`/admin/agents/${id}`, "error", error.message);
  } else {
    const { error } = await supabase.from("ai_agents").insert(payload);
    if (error) redirectWithFlash("/admin/agents/new", "error", error.message);
  }

  revalidatePath("/admin/agents");
  redirectWithFlash("/admin/agents", "success", id ? "Agent updated." : "Agent created.");
}

export async function deleteAiAgent(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const id = value(formData, "id");
  if (!supabase) redirectWithFlash("/admin/agents", "error", "Supabase is not configured.");
  if (!id) redirectWithFlash("/admin/agents", "error", "Missing ID.");
  if (!isUuid(id)) redirectWithFlash("/admin/agents", "error", "Invalid ID.");

  const { error, count } = await supabase.from("ai_agents").delete({ count: "exact" }).eq("id", id);
  if (error) redirectWithFlash("/admin/agents", "error", error.message);
  if (!count) redirectWithFlash("/admin/agents", "error", "No agent was deleted.");

  revalidatePath("/admin/agents");
  redirectWithFlash("/admin/agents", "success", "Agent deleted.");
}
