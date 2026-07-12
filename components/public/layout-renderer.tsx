import type { Article, LayoutBlock } from "@/lib/blocks/types";
import { ArticleCard } from "@/components/public/article-card";
import { AppImage } from "@/components/ui/app-image";

export function LayoutRenderer({ blocks, articles }: { blocks: LayoutBlock[]; articles: Article[] }) {
  if (blocks.length === 0) {
    return <DefaultArticleGrid articles={articles} />;
  }

  return (
    <div className="space-y-12">
      {blocks.map((block) => {
        switch (block.type) {
          case "hero":
            return (
              <section key={block.id} className="relative overflow-hidden rounded-[2.5rem] bg-stone-950 text-white">
                <div className="absolute inset-0 opacity-65"><AppImage src={block.data.imageUrl} alt={block.data.title} priority /></div>
                <div className={`relative flex min-h-[420px] flex-col justify-end p-8 sm:p-12 ${block.data.align === "center" ? "items-center text-center" : "items-start"}`}>
                  <p className="text-sm uppercase tracking-[0.3em] text-amber-100">Collection</p>
                  <h1 className="mt-4 max-w-3xl text-5xl font-semibold tracking-tight sm:text-7xl">{block.data.title}</h1>
                  {block.data.subtitle ? <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-100">{block.data.subtitle}</p> : null}
                </div>
              </section>
            );
          case "text":
            return (
              <section key={block.id} className="mx-auto max-w-3xl text-center">
                {block.data.heading ? <h2 className="text-3xl font-semibold text-stone-950">{block.data.heading}</h2> : null}
                <p className="mt-4 text-lg leading-8 text-stone-600">{block.data.body}</p>
              </section>
            );
          case "article_grid":
            return <DefaultArticleGrid key={block.id} title={block.data.title} articles={articles} columns={block.data.columns} />;
          case "article_list":
            return (
              <section key={block.id} className="space-y-5">
                {block.data.title ? <h2 className="text-3xl font-semibold text-stone-950">{block.data.title}</h2> : null}
                {articles.map((article) => <ArticleCard key={article.id} article={article} />)}
              </section>
            );
          case "featured_article": {
            const article = articles.find((item) => item.id === block.data.articleId) ?? articles[0];
            return article ? <section key={block.id} className="space-y-5"><h2 className="text-3xl font-semibold text-stone-950">{block.data.title ?? "Featured article"}</h2><ArticleCard article={article} /></section> : null;
          }
          case "image":
            return <figure key={block.id} className="space-y-3"><div className="relative aspect-[16/8] overflow-hidden rounded-[2rem]"><AppImage src={block.data.url} alt={block.data.alt ?? block.data.caption ?? "Image"} /></div>{block.data.caption ? <figcaption className="text-center text-sm text-stone-500">{block.data.caption}</figcaption> : null}</figure>;
          case "gallery":
            return <div key={block.id} className="grid gap-4 sm:grid-cols-3">{block.data.images.map((image) => <div key={image.url} className="relative aspect-square overflow-hidden rounded-3xl"><AppImage src={image.url} alt={image.alt ?? image.caption ?? "Photo"} /></div>)}</div>;
          case "quote":
            return <blockquote key={block.id} className="mx-auto max-w-3xl text-center text-3xl font-medium leading-10 text-stone-900">“{block.data.text}”{block.data.attribution ? <cite className="mt-4 block text-sm not-italic uppercase tracking-[0.2em] text-stone-500">{block.data.attribution}</cite> : null}</blockquote>;
          case "divider":
            return <hr key={block.id} className="border-stone-200" />;
          case "spacer":
            return <div key={block.id} className={block.data.size === "lg" ? "h-24" : block.data.size === "sm" ? "h-8" : "h-14"} />;
        }
      })}
    </div>
  );
}

function DefaultArticleGrid({ articles, title = "Articles", columns = 3 }: { articles: Article[]; title?: string; columns?: 2 | 3 }) {
  return (
    <section className="space-y-6">
      <h2 className="text-3xl font-semibold text-stone-950">{title}</h2>
      <div className={`grid gap-6 ${columns === 2 ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3"}`}>
        {articles.map((article) => <ArticleCard key={article.id} article={article} />)}
      </div>
    </section>
  );
}
