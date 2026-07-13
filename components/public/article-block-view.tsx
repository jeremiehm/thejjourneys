import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ArticleBlock, ColumnContentBlock } from "@/lib/blocks/types";
import { BlockLayoutShell } from "@/components/public/block-layout-shell";
import { isBlockFullWidth } from "@/lib/blocks/block-layout";
import { spanToColClass } from "@/lib/blocks/layout-presets";
import { AppImage } from "@/components/ui/app-image";
import { cn } from "@/lib/utils";

function embedUrl(url: string) {
  if (url.includes("youtube.com/watch")) {
    const id = new URL(url).searchParams.get("v");
    return id ? `https://www.youtube.com/embed/${id}` : url;
  }
  if (url.includes("youtu.be/")) {
    return `https://www.youtube.com/embed/${url.split("youtu.be/")[1]?.split("?")[0] ?? ""}`;
  }
  return url;
}

function ColumnContentView({ block }: { block: ColumnContentBlock }) {
  switch (block.type) {
    case "text":
      return (
        <div className="prose prose-stone max-w-none prose-headings:font-semibold prose-a:text-amber-700">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.data.markdown}</ReactMarkdown>
        </div>
      );
    case "image": {
      if (!block.data.url?.trim()) return null;
      const width = block.data.widthPercent ?? 100;
      return (
        <figure className="space-y-2" style={{ width: `${width}%`, maxWidth: "100%" }}>
          <div className="relative aspect-[16/10] overflow-hidden rounded-2xl">
            <AppImage src={block.data.url} alt={block.data.alt ?? block.data.caption ?? "Image"} />
          </div>
          {block.data.caption ? (
            <figcaption className="text-center text-sm text-stone-500">{block.data.caption}</figcaption>
          ) : null}
        </figure>
      );
    }
    case "quote":
      return (
        <blockquote className="rounded-2xl bg-stone-100 p-5 text-lg font-medium leading-8 text-stone-900">
          “{block.data.text}”
          {block.data.attribution ? (
            <cite className="mt-2 block text-xs not-italic uppercase tracking-wider text-stone-500">
              {block.data.attribution}
            </cite>
          ) : null}
        </blockquote>
      );
    case "divider":
      return <hr className="border-stone-200" />;
  }
}

export function ArticleBlockView({ block }: { block: ArticleBlock }) {
  const fullWidth = isBlockFullWidth(block);

  if (block.type === "row") {
    return (
      <BlockLayoutShell fullWidth={fullWidth} className="my-2">
        <div className="flex w-full gap-6">
          {block.data.children.map((slot) => (
            <div key={slot.slotId} className="min-w-0 space-y-6" style={{ flex: slot.flex }}>
              <ColumnContentView block={slot.block} />
            </div>
          ))}
        </div>
      </BlockLayoutShell>
    );
  }

  if (block.type === "columns") {
    return (
      <BlockLayoutShell fullWidth={fullWidth} className="my-2">
        <div className="grid grid-cols-12 gap-4 md:gap-6">
          {block.data.columns.map((column, index) => (
            <div key={`${block.id}-col-${index}`} className={cn("space-y-6", spanToColClass(column.span))}>
              {column.blocks.map((child) => (
                <ColumnContentView key={child.id} block={child} />
              ))}
            </div>
          ))}
        </div>
      </BlockLayoutShell>
    );
  }

  const inner = (() => {
    switch (block.type) {
      case "text":
        return (
          <div className="prose prose-stone max-w-none prose-headings:font-semibold prose-a:text-amber-700">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.data.markdown}</ReactMarkdown>
          </div>
        );
      case "gallery":
        return (
          <div className="grid gap-4 sm:grid-cols-2">
            {block.data.images
              .filter((image) => image.url?.trim())
              .map((image) => (
              <figure key={`${block.id}-${image.url}`} className="space-y-2">
                <div className="relative aspect-[4/3] overflow-hidden rounded-3xl">
                  <AppImage src={image.url} alt={image.alt ?? image.caption ?? "Gallery photo"} />
                </div>
                {image.caption ? <figcaption className="text-sm text-stone-500">{image.caption}</figcaption> : null}
              </figure>
            ))}
          </div>
        );
      case "map":
        return (
          <div className="overflow-hidden rounded-3xl border border-stone-200">
            <iframe
              title={`Map ${block.data.query}`}
              src={`https://www.google.com/maps?q=${encodeURIComponent(block.data.query)}&z=${block.data.zoom ?? 12}&output=embed`}
              className="h-80 w-full"
              loading="lazy"
            />
          </div>
        );
      case "tip_card":
        return (
          <aside className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-800">
              {block.data.icon} {block.data.label}
            </p>
            <p className="mt-3 leading-7 text-stone-700">{block.data.body}</p>
          </aside>
        );
      case "affiliate":
        return (
          <Link
            href={block.data.url}
            className="block rounded-3xl border border-stone-200 bg-white p-6 shadow-sm transition hover:shadow-lg"
          >
            <p className="text-sm uppercase tracking-[0.2em] text-stone-500">Useful link</p>
            <h3 className="mt-2 text-xl font-semibold text-stone-950">{block.data.title}</h3>
            {block.data.description ? <p className="mt-2 text-stone-600">{block.data.description}</p> : null}
            <span className="mt-4 inline-flex rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white">
              {block.data.cta}
            </span>
          </Link>
        );
      case "video":
        return (
          <div className="overflow-hidden rounded-3xl bg-stone-950">
            <iframe
              title={block.data.title ?? "Video"}
              src={embedUrl(block.data.url)}
              className="aspect-video w-full"
              allowFullScreen
            />
          </div>
        );
      case "timeline":
        return (
          <ol className="space-y-5 border-l border-stone-200 pl-6">
            {block.data.items.map((item, index) => (
              <li key={`${block.id}-${index}`} className="relative">
                <span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full bg-amber-600" />
                <p className="text-xs uppercase tracking-[0.2em] text-stone-500">
                  {item.label}
                  {item.date ? ` • ${item.date}` : ""}
                </p>
                <h3 className="mt-1 text-xl font-semibold text-stone-950">{item.title}</h3>
                <p className="mt-2 leading-7 text-stone-600">{item.text}</p>
              </li>
            ))}
          </ol>
        );
      case "quote":
        return (
          <blockquote className="rounded-[2rem] bg-stone-100 p-8 text-2xl font-medium leading-10 text-stone-900">
            “{block.data.text}”
            {block.data.attribution ? (
              <cite className="mt-4 block text-sm not-italic uppercase tracking-[0.2em] text-stone-500">
                {block.data.attribution}
              </cite>
            ) : null}
          </blockquote>
        );
      case "image": {
        if (!block.data.url?.trim()) return null;
        const width = block.data.widthPercent ?? 100;
        return (
          <figure className="mx-auto space-y-3" style={{ width: `${width}%`, maxWidth: "100%" }}>
            <div className="relative aspect-[16/10] overflow-hidden rounded-[2rem]">
              <AppImage src={block.data.url} alt={block.data.alt ?? block.data.caption ?? "Article image"} />
            </div>
            {block.data.caption ? (
              <figcaption className="text-center text-sm text-stone-500">{block.data.caption}</figcaption>
            ) : null}
          </figure>
        );
      }
      case "divider":
        return <hr className="border-stone-200" />;
      default:
        return null;
    }
  })();

  return (
    <BlockLayoutShell fullWidth={fullWidth} className="my-2">
      {inner}
    </BlockLayoutShell>
  );
}
