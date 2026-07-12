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
  lang: z.string().default("fr"),
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
  lang: z.string().default("fr"),
  siblingArticles: z.array(siblingArticleSchema).max(50).default([]),
});

const stringList = z.array(z.string());

export const auditReportSchema = z.object({
  score: z.number().min(0).max(100),
  title: z.object({
    ok: z.boolean(),
    suggestions: stringList,
  }),
  metaDescription: z.object({
    current: z.string().nullable().optional(),
    suggested: z.string(),
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
