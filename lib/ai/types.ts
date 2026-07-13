import { z } from "zod";

export const AI_EDIT_ACTIONS = [
  "rewrite",
  "humanize",
  "shorten",
  "expand",
  "add_experience",
  "fix_grammar",
] as const;

export type AiEditAction = (typeof AI_EDIT_ACTIONS)[number];

export const aiEditRequestSchema = z.object({
  action: z.enum(AI_EDIT_ACTIONS),
  selectedText: z.string().min(1).max(12000),
  fullArticle: z.string().max(80000),
  lang: z.string().default("en"),
  blockId: z.string().optional(),
});

export const siblingArticleSchema = z.object({
  title: z.string(),
  slug: z.string(),
  collectionSlug: z.string(),
  excerpt: z.string().nullable().optional(),
});

export const aiAuditRequestSchema = z.object({
  title: z.string(),
  excerpt: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  content: z.string().max(80000),
  lang: z.string().default("en"),
  siblingArticles: z.array(siblingArticleSchema).max(50).default([]),
});

const stringList = z.array(z.string());

export const auditReportSchema = z.object({
  score: z.coerce.number().min(0).max(100),
  title: z.object({
    ok: z.boolean(),
    suggestions: stringList,
  }),
  metaDescription: z.object({
    current: z.string().nullable().optional(),
    suggested: z.string().default(""),
  }),
  structure: z.object({
    issues: stringList,
  }),
  informationGain: z.object({
    verdict: z.string(),
    addsValue: z.boolean(),
    suggestions: stringList,
  }),
  eeat: z.object({
    weakPassages: z.array(
      z.object({
        excerpt: z.string(),
        blockId: z.string().optional(),
        reason: z.string().optional(),
      }),
    ),
    suggestions: stringList,
  }),
  internalLinks: z.array(
    z.object({
      anchor: z.string(),
      targetSlug: z.string(),
      collectionSlug: z.string().optional(),
      reason: z.string().optional(),
    }),
  ),
  readability: z.object({
    issues: stringList,
  }),
});

export type AuditReport = z.infer<typeof auditReportSchema>;

export const structureSectionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), markdown: z.string().min(1) }),
  z.object({
    type: z.literal("tip_card"),
    label: z.string().default(""),
    body: z.string().default(""),
    icon: z.string().optional(),
  }),
  z.object({
    type: z.literal("quote"),
    text: z.string().default(""),
    attribution: z.string().optional(),
  }),
  z.object({ type: z.literal("divider"), label: z.string().optional() }),
  z.object({
    type: z.literal("image"),
    caption: z.string().optional(),
    alt: z.string().optional(),
  }),
  z.object({
    type: z.literal("timeline"),
    items: z
      .array(
        z.object({
          label: z.string().default(""),
          title: z.string().default(""),
          text: z.string().default(""),
          date: z.string().optional(),
        }),
      )
      .min(1),
  }),
]);

export type StructureSection = z.infer<typeof structureSectionSchema>;

export const aiEnhanceSeoRequestSchema = z.object({
  audit: auditReportSchema,
  title: z.string(),
  excerpt: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  content: z.string().max(80000),
  lang: z.string().default("en"),
  collectionSlug: z.string().min(1),
  currentSlug: z.string().optional(),
  siblingArticles: z.array(siblingArticleSchema).max(50).default([]),
  agentId: z.string().uuid().optional(),
});

export const enhanceSeoNewArticleSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  excerpt: z.string().min(1),
  metaDescription: z.string().min(1),
  sections: z.array(structureSectionSchema).min(1).max(40),
  linkAnchor: z.string().min(1),
  topic: z.string().optional(),
});

export const enhanceSeoResultSchema = z.object({
  summary: z.string().default("SEO enhancements applied."),
  improvements: z.array(z.string()).default([]),
  currentArticle: z.object({
    title: z.string().optional(),
    excerpt: z.string().optional(),
    metaDescription: z.string().optional(),
    sections: z.array(structureSectionSchema).min(1).max(40),
  }),
  newArticles: z.array(enhanceSeoNewArticleSchema).max(5),
});

export type EnhanceSeoResult = z.infer<typeof enhanceSeoResultSchema>;

export type EnhanceSeoCreatedArticle = {
  id: string;
  title: string;
  slug: string;
  linkAnchor: string;
};

export type EnhanceSeoOutcome = {
  result: EnhanceSeoResult;
  createdArticles: EnhanceSeoCreatedArticle[];
  backupRevisionId?: string;
};

export type SiblingArticle = z.infer<typeof siblingArticleSchema>;

export type PendingAiEdit = {
  action: AiEditAction;
  originalText: string;
  proposedText: string;
  blockId?: string;
  editorFrom: number;
  editorTo: number;
  editorKey: string;
};

export const articleStructureSchema = z.object({
  title: z.string().optional(),
  excerpt: z.string().optional(),
  metaDescription: z.string().optional(),
  sections: z.array(structureSectionSchema).min(1).max(40),
  summary: z.string().optional(),
});

export type ArticleStructure = z.infer<typeof articleStructureSchema>;

export const structureChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

export const aiDraftRequestSchema = z.object({
  prompt: z.string().min(1).max(4000),
  history: z.array(structureChatMessageSchema).max(20).default([]),
  lang: z.string().default("en"),
  agentId: z.string().uuid().optional(),
  currentTitle: z.string().optional(),
  currentExcerpt: z.string().optional(),
  hasExistingContent: z.boolean().default(false),
});

/** @deprecated alias */
export const aiStructureRequestSchema = aiDraftRequestSchema;

export type StructureChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  structure?: ArticleStructure;
  patchesApplied?: number;
};

export const articlePatchSchema = z.object({
  blockId: z.string().min(1),
  action: z.enum(["replace", "insert_after", "delete"]),
  section: structureSectionSchema.optional(),
});

export type ArticlePatch = z.infer<typeof articlePatchSchema>;

export const articleEditChatResponseSchema = z.object({
  reply: z.string().min(1),
  title: z.string().optional(),
  excerpt: z.string().optional(),
  metaDescription: z.string().optional(),
  patches: z.array(articlePatchSchema).max(20).default([]),
});

export type ArticleEditChatResponse = z.infer<typeof articleEditChatResponseSchema>;

export const aiChatRequestSchema = z.object({
  prompt: z.string().min(1).max(4000),
  history: z.array(structureChatMessageSchema).max(30).default([]),
  lang: z.string().default("en"),
  agentId: z.string().uuid().optional(),
  title: z.string().default(""),
  excerpt: z.string().optional(),
  metaDescription: z.string().optional(),
  content: z.string().max(80000),
  mode: z.enum(["draft", "edit"]),
});

export type AiAgent = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  context: string;
  tone: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};
