import { slugify } from "@/lib/utils";
import type { StructureSection } from "./types";

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export function normalizeStructureSection(section: unknown): StructureSection | null {
  const raw = asObject(section);
  let type = asString(raw.type);

  if (type === "paragraph" || type === "heading") type = "text";

  if (type === "text") {
    const markdown = asString(raw.markdown || raw.content || raw.body).trim();
    if (!markdown) return null;
    return { type: "text", markdown };
  }

  if (type === "tip_card") {
    const body = asString(raw.body).trim();
    if (!body) return null;
    return {
      type: "tip_card",
      label: asString(raw.label, "Tip"),
      body,
      icon: typeof raw.icon === "string" ? raw.icon : undefined,
    };
  }

  if (type === "quote") {
    const text = asString(raw.text).trim();
    if (!text) return null;
    return {
      type: "quote",
      text,
      attribution: typeof raw.attribution === "string" ? raw.attribution : undefined,
    };
  }

  if (type === "divider") {
    return {
      type: "divider",
      label: typeof raw.label === "string" ? raw.label : undefined,
    };
  }

  if (type === "image") {
    return {
      type: "image",
      caption: typeof raw.caption === "string" ? raw.caption : undefined,
      alt: typeof raw.alt === "string" ? raw.alt : undefined,
    };
  }

  if (type === "timeline") {
    const items = Array.isArray(raw.items)
      ? raw.items
          .map((item) => {
            const entry = asObject(item);
            const title = asString(entry.title);
            const text = asString(entry.text);
            if (!title && !text) return null;
            return {
              label: asString(entry.label, "Step"),
              title: title || "Untitled",
              text,
              date: typeof entry.date === "string" ? entry.date : undefined,
            };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null)
      : [];
    if (items.length === 0) return null;
    return { type: "timeline", items };
  }

  return null;
}

export function normalizeStructureSections(sections: unknown): StructureSection[] {
  if (!Array.isArray(sections)) return [];
  return sections
    .map((section) => normalizeStructureSection(section))
    .filter((section): section is StructureSection => section !== null);
}

function asSlug(title: string, slug?: string): string {
  return slugify(slug?.trim() || title) || "article";
}

export function normalizeEnhanceSeoResult(data: unknown): unknown {
  if (!data || typeof data !== "object" || Array.isArray(data)) return data;

  const raw = data as Record<string, unknown>;
  const current = asObject(raw.currentArticle);

  let currentSections = normalizeStructureSections(current.sections);

  const newArticles = Array.isArray(raw.newArticles)
    ? raw.newArticles
        .map((item) => {
          const article = asObject(item);
          const title = asString(article.title).trim();
          if (!title) return null;

          const sections = normalizeStructureSections(article.sections);
          if (sections.length === 0) return null;

          const excerpt = asString(article.excerpt).trim() || title.slice(0, 120);
          const metaDescription =
            asString(article.metaDescription).trim() ||
            excerpt.slice(0, 155) ||
            `Read our guide: ${title}`.slice(0, 155);

          return {
            title,
            slug: asSlug(title, asString(article.slug)),
            excerpt,
            metaDescription,
            sections,
            linkAnchor: asString(article.linkAnchor, title).trim() || title,
            topic: typeof article.topic === "string" ? article.topic : undefined,
          };
        })
        .filter(Boolean)
        .slice(0, 5)
    : [];

  return {
    summary: asString(raw.summary, "SEO enhancements applied."),
    improvements: asStringList(raw.improvements),
    currentArticle: {
      title: asString(current.title).trim() || undefined,
      excerpt: asString(current.excerpt).trim() || undefined,
      metaDescription: asString(current.metaDescription).trim() || undefined,
      sections: currentSections.slice(0, 40),
    },
    newArticles,
  };
}
