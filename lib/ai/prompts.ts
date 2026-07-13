import type { AiEditAction, AuditReport } from "./types";

const STYLE_RULES = `
STRICT style rules:
- Never use em dashes (—). Use commas, periods, or parentheses instead.
- No hollow transitions ("It is worth noting that", "In conclusion", "In this article we will…", "Whether you are X or Y…").
- No empty superlatives ("must-see", "hidden gem", "breathtaking").
- Natural spoken English, varied sentence rhythm.
- If a personal fact is missing, insert a placeholder [your experience: ...] instead of inventing one.
- NEVER invent facts, places, prices, hours, or anecdotes.
`.trim();

const ACTION_INSTRUCTIONS: Record<AiEditAction, string> = {
  rewrite: "Rewrite for better flow and clarity without changing the meaning.",
  humanize:
    "Humanize the text: remove AI writing tics, unnecessary bullet lists, flat conclusions, and excessive symmetry. Punchy tone, like a traveler telling a friend.",
  shorten: "Shorten without losing the essentials.",
  expand: "Expand slightly with useful details, without inventing facts.",
  add_experience:
    "Turn generic passages into invitations to add a personal anecdote via [your experience: ...] placeholders. Do not invent anything.",
  fix_grammar: "Fix spelling and grammar only. Keep the style and tone.",
};

export function buildEditSystemPrompt(action: AiEditAction, lang: string): string {
  return `You are an editor for an English travel blog.
You improve the provided text WITHOUT inventing facts, places, prices, or anecdotes.
Preserve the original language (${lang}) and the author's voice.
${STYLE_RULES}

Requested action: ${ACTION_INSTRUCTIONS[action]}

Reply ONLY with the rewritten text, no preamble or commentary.`;
}

export function buildEditUserPrompt(selectedText: string, fullArticle: string): string {
  return `## Passage to edit
${selectedText}

## Context (full article for reference — rewrite only the passage)
${fullArticle.slice(0, 60000)}`;
}

export function buildAuditSystemPrompt(lang: string): string {
  return `You are a senior SEO editor for a travel blog (${lang}).
Evaluate the article HONESTLY, especially information gain: do not flatter.
Never invent facts. Suggestions must be actionable.

Reply ONLY with a valid JSON object, no markdown, no text before or after.
Exact schema:
{
  "score": number (0-100),
  "title": { "ok": boolean, "suggestions": string[] },
  "metaDescription": { "current": string|null, "suggested": string },
  "structure": { "issues": string[] },
  "informationGain": { "verdict": string, "addsValue": boolean, "suggestions": string[] },
  "eeat": { "weakPassages": [{ "excerpt": string, "blockId": string?, "reason": string? }], "suggestions": string[] },
  "internalLinks": [{ "anchor": string, "targetSlug": string, "collectionSlug": string?, "reason": string? }],
  "readability": { "issues": string[] }
}

Criteria:
- Title: 50-60 characters, primary keyword
- Meta description: 140-155 characters, compelling
- One implicit H1 (the title), coherent heading hierarchy
- Information gain: value vs top 5 Google results
- E-E-A-T: generic passages to anchor in lived experience
- Internal linking: 3-5 anchors to articles provided in context. If a relevant topic has no matching article, still recommend it with a descriptive anchor and a kebab-case targetSlug for a future article (e.g. anchor "Barcelona beaches", targetSlug "barcelona-beaches").
- Readability: long sentences, dense paragraphs`;
}

export function buildAuditUserPrompt(payload: {
  title: string;
  excerpt?: string | null;
  metaDescription?: string | null;
  content: string;
  siblingArticles: Array<{ title: string; slug: string; collectionSlug: string; excerpt?: string | null }>;
}): string {
  const siblings = payload.siblingArticles
    .map((a) => `- ${a.title} (/collections/${a.collectionSlug}/${a.slug})${a.excerpt ? ` — ${a.excerpt.slice(0, 80)}` : ""}`)
    .join("\n");

  return `## Title
${payload.title}

## Excerpt (editorial summary)
${payload.excerpt ?? "(empty)"}

## Current meta description
${payload.metaDescription ?? "(empty)"}

## Content (lines [block:ID] indicate block IDs)
${payload.content.slice(0, 60000)}

## Other blog articles (for internal linking)
${siblings || "(none)"}`;
}

export function buildEnhanceSeoSystemPrompt(
  lang: string,
  agent?: { name: string; context: string; tone: string | null } | null,
): string {
  const agentBlock = agent?.context.trim()
    ? `
## Author travel context (agent "${agent.name}")
${agent.context.trim()}
${agent.tone ? `Voice: ${agent.tone}` : ""}
`
    : "";

  return `You are a senior SEO strategist and travel writer for an English blog (${lang}).
You receive an SEO audit report and must deliver a concrete enhancement plan as JSON.
${agentBlock}
${STYLE_RULES}

Your mission:
1. **Enhance the CURRENT article** — apply audit fixes (title, meta, structure, readability, E-E-A-T, information gain).
   - **CRITICAL: Preserve ALL existing body content.** Return the full article in \`currentArticle.sections\` with the same topics and depth, only improved for SEO. Never replace the article with a short summary.
   - Keep existing images as \`image\` blocks (caption/alt). Do not drop sections.
2. **Internal linking** — weave 3-5 natural markdown links into text blocks:
   - Format: \`[anchor text](/collections/{collectionSlug}/{slug})\`
   - Link to EXISTING articles when a sibling matches (use their exact slug).
   - For missing topics recommended by the audit, create full **newArticles** (see below).
3. **Create missing companion articles** — when the audit suggests an internal link to a topic with NO matching sibling article, write a complete SEO-ready draft in \`newArticles\`:
   - Full developed content (6-12 sections, same quality as a standalone article).
   - SEO title (50-60 chars), excerpt (~120 chars), metaDescription (140-155 chars).
   - \`slug\`: lowercase kebab-case derived from title.
   - \`linkAnchor\`: the exact anchor text to use when linking FROM the current article.
   - Do NOT create a new article if a sibling already covers that topic.
   - Max 3 new articles per run (prioritize highest-impact gaps).
4. Preserve factual accuracy. Do not invent prices, hours, or personal anecdotes. Use [your experience: ...] for missing E-E-A-T.
5. No em dashes (—).

Reply ONLY with valid JSON, no markdown wrapper.
Exact schema:
{
  "summary": string (1-2 sentences on what you did),
  "improvements": string[] (bullet list of applied fixes),
  "currentArticle": {
    "title": string?,
    "excerpt": string?,
    "metaDescription": string?,
    "sections": [ same block types as draft: text, tip_card, quote, divider, image, timeline ]
  },
  "newArticles": [{
    "title": string,
    "slug": string,
    "excerpt": string,
    "metaDescription": string,
    "sections": [...],
    "linkAnchor": string,
    "topic": string?
  }]
}

Each text section: ## or ### heading + 2-4 full paragraphs (150-350 words).`;
}

export function buildEnhanceSeoUserPrompt(payload: {
  audit: AuditReport;
  title: string;
  excerpt?: string | null;
  metaDescription?: string | null;
  content: string;
  collectionSlug: string;
  currentSlug?: string;
  siblingArticles: Array<{ title: string; slug: string; collectionSlug: string; excerpt?: string | null }>;
}): string {
  const siblings = payload.siblingArticles
    .map(
      (a) =>
        `- ${a.title} → /collections/${a.collectionSlug}/${a.slug}${a.excerpt ? ` (${a.excerpt.slice(0, 80)})` : ""}`,
    )
    .join("\n");

  const missingLinks = payload.audit.internalLinks
    .filter(
      (link) =>
        !payload.siblingArticles.some(
          (s) =>
            s.slug === link.targetSlug ||
            s.title.toLowerCase().includes(link.anchor.toLowerCase()) ||
            link.anchor.toLowerCase().includes(s.title.toLowerCase().slice(0, 20)),
        ),
    )
    .map((l) => `- "${l.anchor}" → suggested slug: ${l.targetSlug}${l.reason ? ` (${l.reason})` : ""}`)
    .join("\n");

  return `## Collection slug (for internal links)
${payload.collectionSlug}

## Current article slug
${payload.currentSlug ?? "(new / unsaved)"}

## SEO audit report (JSON)
${JSON.stringify(payload.audit, null, 2)}

## Current title
${payload.title}

## Current excerpt
${payload.excerpt ?? "(empty)"}

## Current meta description
${payload.metaDescription ?? "(empty)"}

## Current content ([block:ID] markers)
${payload.content.slice(0, 55000)}

## Existing sibling articles (DO NOT recreate these)
${siblings || "(none)"}

## Missing internal link targets (CREATE these as newArticles if relevant)
${missingLinks || "(audit did not flag missing targets — only enhance current article)"}`;
}

export function buildStructureSystemPrompt(lang: string, agent?: { name: string; context: string; tone: string | null } | null): string {
  return buildDraftSystemPrompt(lang, agent);
}

export function buildDraftSystemPrompt(
  lang: string,
  agent?: { name: string; context: string; tone: string | null } | null,
): string {
  const agentBlock = agent?.context.trim()
    ? `
## Author travel context (agent "${agent.name}")
Use this as factual background. Do not contradict it. You may write in first person based on this lived experience.
${agent.context.trim()}
${agent.tone ? `Voice: ${agent.tone}` : "Voice: natural, like a traveler talking to a friend."}
`
    : "";

  return `You are a writer for an English travel blog (${lang}).
You write a COMPLETE, DEVELOPED article from the author's request — not an outline, not empty bullet points.
${agentBlock}
${STYLE_RULES}

Writing rules:
- Each "text" block contains real prose: ## or ### headings then 2 to 4 full paragraphs (150 to 350 words per text section).
- Narrative style, concrete, with sensory details when context allows.
- tip_card blocks have a developed body (2-4 useful sentences).
- Quotes should feel authentic, not generic.
- Do not invent specific facts (prices, hours, addresses) missing from context. Use [to complete] or [your experience: ...] for gaps.
- No em dashes (—).

Reply ONLY with a valid JSON object, no markdown wrapper.
Exact schema:
{
  "title": string (50-60 characters),
  "excerpt": string (editorial summary ~120 characters),
  "metaDescription": string (140-155 characters),
  "summary": string (short 1-2 sentence summary for the chat),
  "sections": [
    { "type": "text", "markdown": "## Heading\\n\\nWritten paragraphs..." },
    { "type": "tip_card", "label": "Budget", "body": "Developed text...", "icon": "💡" },
    { "type": "quote", "text": "...", "attribution": "..." },
    { "type": "divider", "label": "..." },
    { "type": "image", "caption": "...", "alt": "..." },
    { "type": "timeline", "items": [{ "label": "Day 1", "title": "...", "text": "...", "date": "..." }] }
  ]
}

Block types: text, tip_card, quote, divider, image, timeline.
Produce 6 to 12 sections depending on the topic. Prioritize well-written text blocks.
If the user refines a previous version, rewrite the content based on their feedback.`;
}

export function buildStructureUserPrompt(payload: {
  prompt: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  currentTitle?: string;
  currentExcerpt?: string;
  hasExistingContent: boolean;
}): string {
  return buildDraftUserPrompt(payload);
}

export function buildDraftUserPrompt(payload: {
  prompt: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  currentTitle?: string;
  currentExcerpt?: string;
  hasExistingContent: boolean;
}): string {
  const historyText =
    payload.history.length > 0
      ? payload.history
          .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
          .join("\n\n")
      : "(first request)";

  return `## Current request
${payload.prompt}

## Chat history
${historyText}

## Article context
Current title: ${payload.currentTitle || "(empty)"}
Current excerpt: ${payload.currentExcerpt || "(empty)"}
Existing editor content: ${payload.hasExistingContent ? "yes (user may want to replace or refine)" : "no (blank article)"}`;
}

export function buildEditChatSystemPrompt(
  lang: string,
  agent?: { name: string; context: string; tone: string | null } | null,
): string {
  const agentBlock = agent?.context.trim()
    ? `
## Author context (agent "${agent.name}")
${agent.context.trim()}
${agent.tone ? `Voice: ${agent.tone}` : ""}
`
    : "";

  return `You are an editorial assistant for an English travel blog (${lang}).
The user is editing an EXISTING article. They give feedback in chat — you apply TARGETED changes only.
${agentBlock}
${STYLE_RULES}

CRITICAL rules:
- NEVER rewrite the full article. Only change blocks the user asked about.
- Return patches ONLY for blocks that must change. Omit untouched blocks entirely.
- Each block in the article is tagged [block:UUID] in the content you receive. Use that exact blockId in patches.
- Actions: "replace" (swap block content), "insert_after" (new block after id), "delete" (remove block).
- For "replace" and "insert_after", include a "section" object (same types as text, tip_card, quote, divider, image, timeline).
- You may update title, excerpt, or metaDescription ONLY if the user asked for it.
- Reply conversationally in "reply" — explain what you changed in 1-3 sentences.
- If the user asks a question without requesting edits, reply helpfully and return an empty patches array.
- No em dashes (—).

Reply ONLY with valid JSON:
{
  "reply": string,
  "title": string (optional),
  "excerpt": string (optional),
  "metaDescription": string (optional),
  "patches": [
    { "blockId": "uuid-from-content", "action": "replace", "section": { "type": "text", "markdown": "..." } }
  ]
}`;
}

export function buildEditChatUserPrompt(payload: {
  prompt: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  title: string;
  excerpt?: string;
  metaDescription?: string;
  content: string;
}): string {
  const historyText =
    payload.history.length > 0
      ? payload.history.map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n\n")
      : "(first message)";

  return `## User message
${payload.prompt}

## Chat history
${historyText}

## Current article
Title: ${payload.title || "(empty)"}
Excerpt: ${payload.excerpt || "(empty)"}
Meta description: ${payload.metaDescription || "(empty)"}

## Article body (blocks tagged [block:id])
${payload.content}`;
}
