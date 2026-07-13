import { NextResponse } from "next/server";
import { resolveAgentContext } from "@/lib/ai/agents";
import { extractJsonObject, fetchOpenAiChatJson } from "@/lib/ai/openai";
import { normalizeEnhanceSeoResult } from "@/lib/ai/normalize-enhance-seo";
import { buildEnhanceSeoSystemPrompt, buildEnhanceSeoUserPrompt } from "@/lib/ai/prompts";
import { aiEnhanceSeoRequestSchema, enhanceSeoResultSchema } from "@/lib/ai/types";
import { getCurrentUser } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = aiEnhanceSeoRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const payload = parsed.data;
  const agent = await resolveAgentContext(payload.agentId);

  try {
    const raw = await fetchOpenAiChatJson({
      messages: [
        { role: "system", content: buildEnhanceSeoSystemPrompt(payload.lang, agent) },
        {
          role: "user",
          content: buildEnhanceSeoUserPrompt({
            audit: payload.audit,
            title: payload.title,
            excerpt: payload.excerpt,
            metaDescription: payload.metaDescription,
            content: payload.content,
            collectionSlug: payload.collectionSlug,
            currentSlug: payload.currentSlug,
            siblingArticles: payload.siblingArticles,
          }),
        },
      ],
      maxTokens: 16000,
      jsonMode: true,
    });

    const jsonStr = extractJsonObject(raw);
    let data: unknown;
    try {
      data = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        { error: "Malformed AI response. Try again.", raw: raw.slice(0, 500) },
        { status: 502 },
      );
    }

    const result = enhanceSeoResultSchema.safeParse(normalizeEnhanceSeoResult(data));
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      const hint = firstIssue ? `${firstIssue.path.join(".")}: ${firstIssue.message}` : "validation failed";
      return NextResponse.json(
        { error: `Invalid enhancement structure (${hint}). Try again.`, details: result.error.flatten() },
        { status: 502 },
      );
    }

    if (result.data.currentArticle.sections.length === 0) {
      return NextResponse.json(
        { error: "AI returned no article content. Your article was not changed." },
        { status: 502 },
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    if (message.includes("abort")) {
      return NextResponse.json({ error: "Timed out. Try again." }, { status: 504 });
    }
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
