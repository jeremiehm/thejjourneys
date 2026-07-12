import { z } from "zod";

const layoutSchema = z.object({ fullWidth: z.boolean().optional() });

const imageSchema = z.object({
  url: z.string().default(""),
  caption: z.string().optional(),
  alt: z.string().optional(),
  widthPercent: z.coerce.number().min(25).max(100).optional(),
}).merge(layoutSchema);

const columnContentBlockSchema = z.discriminatedUnion("type", [
  z.object({ id: z.string(), type: z.literal("text"), data: z.object({ markdown: z.string().default("") }).merge(layoutSchema) }),
  z.object({ id: z.string(), type: z.literal("image"), data: imageSchema }),
  z.object({ id: z.string(), type: z.literal("divider"), data: z.object({ label: z.string().optional() }).merge(layoutSchema) }),
  z.object({ id: z.string(), type: z.literal("quote"), data: z.object({ text: z.string().default(""), attribution: z.string().optional() }).merge(layoutSchema) }),
]);

const gridSpanSchema = z.union([
  z.literal(3),
  z.literal(4),
  z.literal(6),
  z.literal(8),
  z.literal(9),
  z.literal(12),
]);

export const articleBlockSchema = z.discriminatedUnion("type", [
  z.object({ id: z.string(), type: z.literal("text"), data: z.object({ markdown: z.string().default("") }).merge(layoutSchema) }),
  z.object({
    id: z.string(),
    type: z.literal("gallery"),
    data: z.object({ display: z.enum(["grid", "carousel"]).default("grid"), images: z.array(imageSchema).default([]) }),
  }),
  z.object({ id: z.string(), type: z.literal("map"), data: z.object({ query: z.string().default(""), zoom: z.coerce.number().optional() }) }),
  z.object({ id: z.string(), type: z.literal("tip_card"), data: z.object({ icon: z.string().default("💡"), label: z.string().default(""), body: z.string().default("") }) }),
  z.object({ id: z.string(), type: z.literal("affiliate"), data: z.object({ url: z.string().default(""), title: z.string().default(""), description: z.string().optional(), cta: z.string().default("View") }) }),
  z.object({ id: z.string(), type: z.literal("video"), data: z.object({ url: z.string().default(""), title: z.string().optional() }) }),
  z.object({ id: z.string(), type: z.literal("timeline"), data: z.object({ items: z.array(z.object({ label: z.string().default(""), title: z.string().default(""), date: z.string().optional(), text: z.string().default("") })).default([]) }) }),
  z.object({ id: z.string(), type: z.literal("quote"), data: z.object({ text: z.string().default(""), attribution: z.string().optional() }).merge(layoutSchema) }),
  z.object({ id: z.string(), type: z.literal("image"), data: imageSchema }),
  z.object({ id: z.string(), type: z.literal("divider"), data: z.object({ label: z.string().optional() }).merge(layoutSchema) }),
  z.object({
    id: z.string(),
    type: z.literal("columns"),
    data: z
      .object({
        columns: z
          .array(
            z.object({
              span: gridSpanSchema,
              blocks: z.array(columnContentBlockSchema).default([]),
            }),
          )
          .min(1)
          .max(4),
      })
      .merge(layoutSchema),
  }),
  z.object({
    id: z.string(),
    type: z.literal("row"),
    data: z
      .object({
        children: z
          .array(
            z.object({
              slotId: z.string(),
              flex: z.coerce.number().min(0.01).max(1),
              block: columnContentBlockSchema,
            }),
          )
          .min(1)
          .max(4),
      })
      .merge(layoutSchema),
  }),
]);

export const layoutBlockSchema = z.discriminatedUnion("type", [
  z.object({ id: z.string(), type: z.literal("hero"), data: z.object({ imageUrl: z.string().default(""), title: z.string().default(""), subtitle: z.string().optional(), align: z.enum(["left", "center"]).default("center") }) }),
  z.object({ id: z.string(), type: z.literal("text"), data: z.object({ heading: z.string().optional(), body: z.string().default("") }) }),
  z.object({ id: z.string(), type: z.literal("article_grid"), data: z.object({ title: z.string().optional(), columns: z.union([z.literal(2), z.literal(3)]).default(3) }) }),
  z.object({ id: z.string(), type: z.literal("article_list"), data: z.object({ title: z.string().optional() }) }),
  z.object({ id: z.string(), type: z.literal("featured_article"), data: z.object({ articleId: z.string().optional(), title: z.string().optional() }) }),
  z.object({ id: z.string(), type: z.literal("image"), data: imageSchema }),
  z.object({ id: z.string(), type: z.literal("gallery"), data: z.object({ images: z.array(imageSchema).default([]) }) }),
  z.object({ id: z.string(), type: z.literal("quote"), data: z.object({ text: z.string().default(""), attribution: z.string().optional() }) }),
  z.object({ id: z.string(), type: z.literal("divider"), data: z.object({ label: z.string().optional() }) }),
  z.object({ id: z.string(), type: z.literal("spacer"), data: z.object({ size: z.enum(["sm", "md", "lg"]).default("md") }) }),
]);

export const articleContentSchema = z.array(articleBlockSchema).default([]);
export const collectionLayoutSchema = z.array(layoutBlockSchema).default([]);

export function parseArticleContent(value: unknown) {
  if (!Array.isArray(value)) return [];
  const parsed = value
    .map((item) => articleBlockSchema.safeParse(item))
    .filter((result) => result.success)
    .map((result) => result.data);
  return parsed;
}

export function parseCollectionLayout(value: unknown) {
  return collectionLayoutSchema.catch([]).parse(value);
}
