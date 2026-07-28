"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type Dispatch, type SetStateAction } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Editor } from "@tiptap/core";
import { Calendar, CircleDot, Clock, ExternalLink, FolderOpen, Monitor, Smartphone, Sparkles, User } from "lucide-react";
import { autosaveArticle, saveArticle } from "@/app/admin/actions";
import { AiEditorProvider, useAiEditor } from "@/components/admin/ai/AiEditorContext";
import { AiPanel } from "@/components/admin/ai/AiPanel";
import {
  ArticleCoverAddButton,
  ArticleCoverDialog,
  ArticleCoverDisplay,
} from "@/components/admin/NotionEditor/ArticleCover";
import { NotionBlockEditor, focusNotionEditor } from "@/components/admin/NotionEditor/NotionBlockEditor";
import { ArticlePreview } from "@/components/admin/NotionEditor/ArticlePreview";
import { PropertyRow } from "@/components/admin/NotionEditor/PropertyRow";
import { TitleInput } from "@/components/admin/NotionEditor/TitleInput";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import type { Article, ArticleBlock, Author, Collection, CoverType } from "@/lib/blocks/types";
import { createArticleBlock } from "@/lib/blocks/defaults";
import type { ArticleRevision } from "@/lib/article-revisions";
import type { AiAgent, SiblingArticle } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

type DisplayStatus = "draft" | "published" | "archived";

type NotionArticlePageProps = {
  article?: Article | null;
  collections: Collection[];
  authors: Author[];
  siblingArticles?: SiblingArticle[];
  revisions?: ArticleRevision[];
  agents?: AiAgent[];
};

function formatDateEn(iso: string | null) {
  if (!iso) return null;
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

function autosaveLabel(savedAt: Date | null, state: "idle" | "saving" | "saved" | "error") {
  if (state === "saving") return "Saving…";
  if (state === "error") return "⚠ Save failed";
  if (!savedAt) return "";
  const seconds = Math.floor((Date.now() - savedAt.getTime()) / 1000);
  if (seconds < 10) return "Edited just now";
  if (seconds < 60) return `Edited ${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Edited ${minutes} min ago`;
  return "Edited recently";
}

function initialBlocks(article?: Article | null): ArticleBlock[] {
  if (article?.content?.length) return article.content;
  return [createArticleBlock("text")];
}

function ArticleEditorInner({
  article,
  collections,
  authors,
  revisions,
  articleId,
  setArticleId,
  title,
  setTitle,
  excerpt,
  setExcerpt,
  metaDescription,
  setMetaDescription,
  blocks,
  setBlocks,
}: {
  article?: Article | null;
  collections: Collection[];
  authors: Author[];
  revisions: ArticleRevision[];
  articleId: string;
  setArticleId: (id: string) => void;
  title: string;
  setTitle: (v: string) => void;
  excerpt: string;
  setExcerpt: (v: string) => void;
  metaDescription: string;
  setMetaDescription: (v: string) => void;
  blocks: ArticleBlock[];
  setBlocks: Dispatch<SetStateAction<ArticleBlock[]>>;
}) {
  const ai = useAiEditor();
  const router = useRouter();
  const editorRef = useRef<Editor | null>(null);
  const propertiesRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mobileAiOpen, setMobileAiOpen] = useState(false);

  const [collectionId, setCollectionId] = useState(article?.collection_id ?? collections[0]?.id ?? "");
  const [authorId, setAuthorId] = useState(article?.author_id ?? authors[0]?.id ?? "");
  const [coverUrl, setCoverUrl] = useState(article?.cover_image_url ?? "");
  const [coverType, setCoverType] = useState<CoverType>(article?.cover_type ?? "banner");
  const [coverDialogOpen, setCoverDialogOpen] = useState(false);
  const [status, setStatus] = useState<DisplayStatus>(article?.status === "published" ? "published" : "draft");
  const [publishedAt, setPublishedAt] = useState(article?.published_at ?? null);
  const [updatedAt, setUpdatedAt] = useState(article?.updated_at ?? null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [titleHovered, setTitleHovered] = useState(false);
  const [editorView, setEditorView] = useState<"edit" | "desktop" | "mobile">("edit");
  const [, startTransition] = useTransition();

  useEffect(() => {
    ai.registerUpdaters({ setTitle, setExcerpt, setMetaDescription, setBlocks });
  }, [ai, setTitle, setExcerpt, setMetaDescription, setBlocks]);

  const selectedCollection = collections.find((c) => c.id === collectionId);

  useEffect(() => {
    ai.registerPublishContext({
      collectionId,
      authorId,
      collectionSlug: selectedCollection?.slug ?? "",
      currentSlug: article?.slug,
    });
  }, [ai, collectionId, authorId, selectedCollection?.slug, article?.slug]);

  const contentJson = useMemo(() => JSON.stringify(blocks), [blocks]);
  const dbStatus = status === "published" ? "published" : "draft";
  const [lastSavedStatus, setLastSavedStatus] = useState<"draft" | "published">(article?.status ?? "draft");

  const buildFormData = useCallback(
    (intent?: string) => {
      const fd = new FormData();
      if (articleId) fd.set("id", articleId);
      fd.set("title", title);
      fd.set("collection_id", collectionId);
      fd.set("author_id", authorId);
      fd.set("excerpt", excerpt);
      fd.set("meta_description", metaDescription);
      fd.set("lang", article?.lang ?? "en");
      fd.set("cover_image_url", coverUrl);
      fd.set("cover_type", coverType);
      fd.set("status", dbStatus);
      fd.set("previous_status", lastSavedStatus);
      if (publishedAt) fd.set("existing_published_at", publishedAt);
      fd.set("content", contentJson);
      if (intent) fd.set("intent", intent);
      return fd;
    },
    [
      articleId,
      article?.lang,
      authorId,
      collectionId,
      contentJson,
      coverType,
      coverUrl,
      dbStatus,
      excerpt,
      lastSavedStatus,
      metaDescription,
      publishedAt,
      title,
    ],
  );

  const runAutosave = useCallback(() => {
    if (!collectionId || !authorId) return;
    setSaveState("saving");
    setSaveError(null);
    startTransition(async () => {
      const result = await autosaveArticle(buildFormData());
      if (!result.ok) {
        setSaveState("error");
        setSaveError(result.error);
        return;
      }
      if (result.id && result.id !== articleId) {
        setArticleId(result.id);
        window.history.replaceState(null, "", `/admin/articles/${result.id}/edit`);
      }
      if (result.updatedAt) setUpdatedAt(result.updatedAt);
      if (result.publishedAt) setPublishedAt(result.publishedAt);
      setLastSavedStatus(dbStatus);
      setSaveState("saved");
      setSavedAt(new Date());
    });
  }, [articleId, authorId, buildFormData, collectionId, dbStatus]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(runAutosave, 1500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [title, excerpt, metaDescription, collectionId, authorId, coverUrl, coverType, status, blocks, runAutosave]);

  const selectedAuthor = authors.find((a) => a.id === authorId);

  const publicArticleUrl =
    status === "published" && selectedCollection?.slug && article?.slug
      ? `/collections/${selectedCollection.slug}/${article.slug}`
      : null;

  const refreshRevisions = useCallback(() => {
    router.refresh();
  }, [router]);

  function handlePublishSubmit() {
    sessionStorage.setItem("admin-toast", articleId ? "Article updated" : "Article saved");
  }

  const showCoverAbove = coverUrl && (coverType === "banner" || coverType === "above_title");
  const showCoverBelow = coverUrl && coverType === "below_title";

  return (
    <div className="flex min-h-screen bg-white dark:bg-[#191919]">
      <div className="notion-page min-w-0 flex-1 text-stone-900 dark:text-stone-100">
        <header className="sticky top-0 z-30 flex h-11 items-center justify-between border-b border-stone-200/80 bg-white/95 px-4 backdrop-blur-sm dark:border-stone-800 dark:bg-[#191919]/95">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/articles"
              className="text-sm text-stone-500 transition-colors hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
            >
              ← Articles
            </Link>
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-1 text-sm text-stone-500 transition-colors hover:text-stone-800 sm:inline-flex dark:text-stone-400 dark:hover:text-stone-200"
            >
              <ExternalLink className="size-3.5" />
              View site
            </Link>
            {publicArticleUrl ? (
              <Link
                href={publicArticleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden items-center gap-1 text-sm text-amber-700 transition-colors hover:text-amber-800 sm:inline-flex"
              >
                <ExternalLink className="size-3.5" />
                View article
              </Link>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="lg:hidden"
              onClick={() => setMobileAiOpen(true)}
            >
              <Sparkles className="size-4 text-amber-500" />
              AI
            </Button>
            <span
              className={cn("max-w-[240px] truncate text-[13px]", saveState === "error" ? "text-red-500" : "text-stone-400")}
              title={saveError ?? undefined}
            >
              {saveState === "error" && saveError ? saveError : autosaveLabel(savedAt, saveState)}
            </span>
            <div className="hidden items-center rounded-md border border-stone-200 p-0.5 sm:flex dark:border-stone-700">
              <button
                type="button"
                onClick={() => setEditorView("edit")}
                className={cn(
                  "rounded px-2 py-1 text-xs font-medium transition-colors",
                  editorView === "edit"
                    ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
                    : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200",
                )}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setEditorView("desktop")}
                title="Desktop preview"
                className={cn(
                  "rounded px-2 py-1 transition-colors",
                  editorView === "desktop"
                    ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
                    : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200",
                )}
              >
                <Monitor className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setEditorView("mobile")}
                title="Mobile preview"
                className={cn(
                  "rounded px-2 py-1 transition-colors",
                  editorView === "mobile"
                    ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
                    : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200",
                )}
              >
                <Smartphone className="size-3.5" />
              </button>
            </div>
            <form action={saveArticle} onSubmit={handlePublishSubmit}>
              <input type="hidden" name="id" value={articleId} />
              <input type="hidden" name="title" value={title} />
              <input type="hidden" name="collection_id" value={collectionId} />
              <input type="hidden" name="author_id" value={authorId} />
              <input type="hidden" name="excerpt" value={excerpt} />
              <input type="hidden" name="meta_description" value={metaDescription} />
              <input type="hidden" name="lang" value={article?.lang ?? "en"} />
              <input type="hidden" name="cover_image_url" value={coverUrl} />
              <input type="hidden" name="cover_type" value={coverType} />
              <input type="hidden" name="status" value={dbStatus} />
              <input type="hidden" name="previous_status" value={lastSavedStatus} />
              {publishedAt ? <input type="hidden" name="existing_published_at" value={publishedAt} /> : null}
              <input type="hidden" name="content" value={contentJson} />
              <Button
                type="submit"
                name="intent"
                value="publish"
                size="sm"
                className="h-8 rounded-md bg-stone-900 text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900"
              >
                {status === "published" ? "Update" : "Publish"}
              </Button>
            </form>
          </div>
        </header>

        <div className="mx-auto max-w-[900px] px-6 pb-32 pt-8 sm:px-24">
          {editorView === "edit" ? (
            <>
          {showCoverAbove && coverType === "banner" ? (
            <ArticleCoverDisplay
              coverUrl={coverUrl}
              coverType="banner"
              onEdit={() => setCoverDialogOpen(true)}
              onRemove={() => setCoverUrl("")}
            />
          ) : null}

          <div
            className="group/title-zone relative"
            onMouseEnter={() => setTitleHovered(true)}
            onMouseLeave={() => setTitleHovered(false)}
          >
            {titleHovered && !coverUrl ? (
              <div className="mb-2 opacity-0 transition-opacity group-hover/title-zone:opacity-100">
                <ArticleCoverAddButton onClick={() => setCoverDialogOpen(true)} />
              </div>
            ) : null}

            {showCoverAbove && coverType === "above_title" ? (
              <ArticleCoverDisplay
                coverUrl={coverUrl}
                coverType="above_title"
                onEdit={() => setCoverDialogOpen(true)}
                onRemove={() => setCoverUrl("")}
              />
            ) : null}

            <TitleInput
              value={title}
              onChange={setTitle}
              onEnter={() => focusNotionEditor(editorRef.current)}
              onArrowDown={() => propertiesRef.current?.querySelector("button")?.focus()}
            />

            {showCoverBelow ? (
              <ArticleCoverDisplay
                coverUrl={coverUrl}
                coverType="below_title"
                onEdit={() => setCoverDialogOpen(true)}
                onRemove={() => setCoverUrl("")}
              />
            ) : null}
          </div>

          <div ref={propertiesRef} className="mt-3 space-y-0.5">
            <PropertyRow
              icon={<CircleDot className="h-4 w-4" />}
              label="Status"
              empty={false}
              valueDisplay={
                <span
                  className={cn(
                    "inline-flex rounded px-2 py-0.5 text-xs font-medium",
                    status === "published" && "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
                    status === "draft" && "bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-200",
                    status === "archived" && "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
                  )}
                >
                  {status === "published" ? "Published" : status === "archived" ? "Archived" : "Draft"}
                </span>
              }
            >
              {(["draft", "published", "archived"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  className="flex w-full rounded-md px-2 py-1.5 text-left text-sm capitalize hover:bg-stone-100 dark:hover:bg-white/10"
                  onClick={() => setStatus(option)}
                >
                  {option === "published" ? "Published" : option === "archived" ? "Archived" : "Draft"}
                </button>
              ))}
            </PropertyRow>

            <PropertyRow
              icon={<FolderOpen className="h-4 w-4" />}
              label="Collection"
              empty={!selectedCollection}
              valueDisplay={selectedCollection?.title ?? "Empty"}
            >
              {collections.map((collection) => (
                <button
                  key={collection.id}
                  type="button"
                  className="flex w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-stone-100 dark:hover:bg-white/10"
                  onClick={() => setCollectionId(collection.id)}
                >
                  {collection.title}
                </button>
              ))}
            </PropertyRow>

            <PropertyRow
              icon={<User className="h-4 w-4" />}
              label="Author"
              empty={!selectedAuthor}
              valueDisplay={
                selectedAuthor ? (
                  <span className="inline-flex items-center gap-2">
                    {selectedAuthor.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={selectedAuthor.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-stone-200 text-[10px] dark:bg-stone-700">
                        {selectedAuthor.name.slice(0, 1)}
                      </span>
                    )}
                    {selectedAuthor.name}
                  </span>
                ) : (
                  "Empty"
                )
              }
            >
              {authors.map((author) => (
                <button
                  key={author.id}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-stone-100 dark:hover:bg-white/10"
                  onClick={() => setAuthorId(author.id)}
                >
                  {author.name}
                </button>
              ))}
            </PropertyRow>

            <PropertyRow
              icon={<Calendar className="h-4 w-4" />}
              label="Published date"
              empty={!publishedAt}
              valueDisplay={formatDateEn(publishedAt) ?? "—"}
            >
              <p className="px-2 py-1.5 text-sm text-stone-500">Set automatically when you publish.</p>
            </PropertyRow>

            <PropertyRow
              icon={<Clock className="h-4 w-4" />}
              label="Last updated"
              empty={!updatedAt}
              valueDisplay={formatDateEn(updatedAt) ?? "—"}
            >
              <p className="px-2 py-1.5 text-sm text-stone-500">Updated on every save.</p>
            </PropertyRow>
          </div>

          <div className="notion-editor-wrap mt-6 border-t border-transparent pt-2">
            <NotionBlockEditor
              blocks={blocks}
              onChange={setBlocks}
              editorRef={editorRef}
              onExternalRegisterEditor={ai.registerEditor}
            />
          </div>
            </>
          ) : (
            <div className="mt-6 rounded-xl bg-stone-50 py-8 dark:bg-stone-900/40">
              <ArticlePreview
                title={title}
                excerpt={excerpt}
                coverUrl={coverUrl}
                coverType={coverType}
                blocks={blocks}
                author={selectedAuthor}
                viewport={editorView === "mobile" ? "mobile" : "desktop"}
              />
            </div>
          )}
        </div>

        <ArticleCoverDialog
          open={coverDialogOpen}
          onOpenChange={setCoverDialogOpen}
          coverUrl={coverUrl}
          coverType={coverType}
          onApply={(url, type) => {
            setCoverUrl(url);
            setCoverType(type);
          }}
        />
      </div>

      <div className="sticky top-0 hidden h-screen w-80 shrink-0 lg:block">
        <AiPanel
          articleId={articleId}
          revisions={revisions}
          excerpt={excerpt}
          metaDescription={metaDescription}
          onExcerptChange={setExcerpt}
          onMetaDescriptionChange={setMetaDescription}
          onRevisionsRefresh={refreshRevisions}
        />
      </div>

      <Sheet open={mobileAiOpen} onOpenChange={setMobileAiOpen}>
        <SheetContent side="right" className="w-full p-0 sm:max-w-md">
          <AiPanel
            articleId={articleId}
            revisions={revisions}
            excerpt={excerpt}
            metaDescription={metaDescription}
            onExcerptChange={setExcerpt}
            onMetaDescriptionChange={setMetaDescription}
            onRevisionsRefresh={refreshRevisions}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ArticleEditorShell({
  article,
  collections,
  authors,
  siblingArticles,
  revisions,
  agents = [],
}: NotionArticlePageProps & { siblingArticles: SiblingArticle[]; revisions: ArticleRevision[]; agents?: AiAgent[] }) {
  const [articleId, setArticleId] = useState(article?.id ?? "");
  const [title, setTitle] = useState(article?.title ?? "");
  const [excerpt, setExcerpt] = useState(article?.excerpt ?? "");
  const [metaDescription, setMetaDescription] = useState(article?.meta_description ?? "");
  const [blocks, setBlocks] = useState<ArticleBlock[]>(() => initialBlocks(article));

  const articleState = useMemo(
    () => ({
      articleId,
      title,
      excerpt,
      metaDescription,
      lang: article?.lang ?? "en",
      blocks,
    }),
    [articleId, title, excerpt, metaDescription, article?.lang, blocks],
  );

  return (
    <AiEditorProvider articleState={articleState} siblingArticles={siblingArticles} agents={agents}>
      <ArticleEditorInner
        article={article}
        collections={collections}
        authors={authors}
        revisions={revisions}
        articleId={articleId}
        setArticleId={setArticleId}
        title={title}
        setTitle={setTitle}
        excerpt={excerpt}
        setExcerpt={setExcerpt}
        metaDescription={metaDescription}
        setMetaDescription={setMetaDescription}
        blocks={blocks}
        setBlocks={setBlocks}
      />
    </AiEditorProvider>
  );
}

export function NotionArticlePage({
  article,
  collections,
  authors,
  siblingArticles = [],
  revisions = [],
  agents = [],
}: NotionArticlePageProps) {
  return (
    <ArticleEditorShell
      article={article}
      collections={collections}
      authors={authors}
      siblingArticles={siblingArticles}
      revisions={revisions}
      agents={agents}
    />
  );
}
