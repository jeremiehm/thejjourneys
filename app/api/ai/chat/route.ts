import { NextResponse } from "next/server";
import { resolveAgentContext } from "@/lib/ai/agents";
import { extractJsonObject, fetchOpenAiChatJson } from "@/lib/ai/openai";
import { buildEditChatSystemPrompt, buildEditChatUserPrompt } from "@/lib/ai/prompts";
import { aiChatRequestSchema, articleEditChatResponseSchema } from "@/lib/ai/types";
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

  const parsed = aiChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.mode !== "edit") {
    return NextResponse.json({ error: "Use /api/ai/draft for new articles" }, { status: 400 });
  }

  const payload = parsed.data;
  const agent = await resolveAgentContext(payload.agentId);

  try {
    const raw = await fetchOpenAiChatJson({
      messages: [
        { role: "system", content: buildEditChatSystemPrompt(payload.lang, agent) },
        {
          role: "user",
          content: buildEditChatUserPrompt({
            prompt: payload.prompt,
            history: payload.history,
            title: payload.title,
            excerpt: payload.excerpt,
            metaDescription: payload.metaDescription,
            content: payload.content,
          }),
        },
      ],
      maxTokens: 8000,
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

    const result = articleEditChatResponseSchema.safeParse(data);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid edit response.", details: result.error.flatten() },
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
