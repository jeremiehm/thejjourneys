export type BlockBase<TType extends string, TData> = {
  id: string;
  type: TType;
  data: TData;
};

/** Grille 12 colonnes (Notion-style) */
export type GridSpan = 3 | 4 | 6 | 8 | 9 | 12;

export type BlockLayout = {
  /** Sort du conteneur article (max-w-3xl) */
  fullWidth?: boolean;
};

export type TextBlock = BlockBase<"text", { markdown: string } & BlockLayout>;
export type GalleryBlock = BlockBase<
  "gallery",
  { display: "grid" | "carousel"; images: Array<{ url: string; caption?: string; alt?: string }> }
>;
export type MapBlock = BlockBase<"map", { query: string; zoom?: number }>;
export type TipCardBlock = BlockBase<"tip_card", { icon: string; label: string; body: string }>;
export type AffiliateBlock = BlockBase<
  "affiliate",
  { url: string; title: string; description?: string; cta: string }
>;
export type VideoBlock = BlockBase<"video", { url: string; title?: string }>;
export type TimelineBlock = BlockBase<
  "timeline",
  { items: Array<{ label: string; title: string; date?: string; text: string }> }
>;
export type CoverType = "banner" | "above_title" | "below_title";

export type ImageBlock = BlockBase<
  "image",
  { url: string; caption?: string; alt?: string; widthPercent?: number } & BlockLayout
>;
export type DividerBlock = BlockBase<"divider", { label?: string } & BlockLayout>;
export type QuoteBlockWithLayout = BlockBase<"quote", { text: string; attribution?: string } & BlockLayout>;
export type QuoteBlock = QuoteBlockWithLayout;

export type ColumnContentBlock = RowChildBlock;

export type ColumnSlot = {
  span: GridSpan;
  blocks: ColumnContentBlock[];
};

/** @deprecated — migré vers `row` à la lecture */
export type ColumnsBlock = BlockBase<
  "columns",
  {
    columns: ColumnSlot[];
  } & BlockLayout
>;

export type RowChildBlock = TextBlock | ImageBlock | DividerBlock | QuoteBlockWithLayout;

export type RowSlot = {
  slotId: string;
  /** Part du row (0–1), somme = 1 */
  flex: number;
  block: RowChildBlock;
};

export type RowBlock = BlockBase<
  "row",
  {
    children: RowSlot[];
  } & BlockLayout
>;

export type ArticleBlock =
  | TextBlock
  | GalleryBlock
  | MapBlock
  | TipCardBlock
  | AffiliateBlock
  | VideoBlock
  | TimelineBlock
  | QuoteBlockWithLayout
  | ImageBlock
  | DividerBlock
  | ColumnsBlock
  | RowBlock;

export type HeroLayoutBlock = BlockBase<
  "hero",
  { imageUrl: string; title: string; subtitle?: string; align: "left" | "center" }
>;
export type LayoutTextBlock = BlockBase<"text", { heading?: string; body: string }>;
export type ArticleGridBlock = BlockBase<"article_grid", { title?: string; columns: 2 | 3 }>;
export type ArticleListBlock = BlockBase<"article_list", { title?: string }>;
export type FeaturedArticleBlock = BlockBase<"featured_article", { articleId?: string; title?: string }>;
export type LayoutImageBlock = BlockBase<"image", { url: string; caption?: string; alt?: string }>;
export type LayoutGalleryBlock = BlockBase<"gallery", { images: Array<{ url: string; caption?: string; alt?: string }> }>;
export type LayoutQuoteBlock = BlockBase<"quote", { text: string; attribution?: string }>;
export type LayoutDividerBlock = BlockBase<"divider", { label?: string }>;
export type SpacerBlock = BlockBase<"spacer", { size: "sm" | "md" | "lg" }>;

export type LayoutBlock =
  | HeroLayoutBlock
  | LayoutTextBlock
  | ArticleGridBlock
  | ArticleListBlock
  | FeaturedArticleBlock
  | LayoutImageBlock
  | LayoutGalleryBlock
  | LayoutQuoteBlock
  | LayoutDividerBlock
  | SpacerBlock;

export type Author = {
  id: string;
  name: string;
  slug: string;
  avatar_url: string | null;
  bio: string | null;
};

export type Collection = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_image_url: string | null;
  layout: LayoutBlock[];
  status: "draft" | "published";
  created_at: string;
  updated_at: string;
};

export type Article = {
  id: string;
  collection_id: string;
  author_id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  meta_description: string | null;
  lang: string;
  cover_image_url: string | null;
  cover_type: CoverType;
  content: ArticleBlock[];
  status: "draft" | "published";
  published_at: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  author?: Author | null;
  collection?: Collection | null;
};

export const articleBlockLabels: Record<ArticleBlock["type"], string> = {
  text: "Text",
  gallery: "Photo gallery",
  map: "Embedded map",
  tip_card: "Travel tip",
  affiliate: "Affiliate link",
  video: "Video",
  timeline: "Timeline",
  quote: "Quote",
  image: "Image",
  divider: "Divider",
  columns: "Columns",
  row: "Row",
};

export const layoutBlockLabels: Record<LayoutBlock["type"], string> = {
  hero: "Hero",
  text: "Text",
  article_grid: "Article grid",
  article_list: "Article list",
  featured_article: "Featured article",
  image: "Image",
  gallery: "Gallery",
  quote: "Quote",
  divider: "Divider",
  spacer: "Spacer",
};
