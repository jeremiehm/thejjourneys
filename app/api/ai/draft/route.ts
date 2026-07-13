import { NextResponse } from "next/server";
import { resolveAgentContext } from "@/lib/ai/agents";
import { extractJsonObject, fetchOpenAiChatJson } from "@/lib/ai/openai";
import { buildDraftSystemPrompt, buildDraftUserPrompt } from "@/lib/ai/prompts";
import { aiDraftRequestSchema, articleStructureSchema } from "@/lib/ai/types";
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

  const parsed = aiDraftRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const payload = parsed.data;
  const agent = await resolveAgentContext(payload.agentId);

  try {
    const raw = await fetchOpenAiChatJson({
      messages: [
        { role: "system", content: buildDraftSystemPrompt(payload.lang, agent) },
        {
          role: "user",
          content: buildDraftUserPrompt({
            prompt: payload.prompt,
            history: payload.history,
            currentTitle: payload.currentTitle,
            currentExcerpt: payload.currentExcerpt,
            hasExistingContent: payload.hasExistingContent,
          }),
        },
      ],
      maxTokens: 12000,
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

    const draft = articleStructureSchema.safeParse(data);
    if (!draft.success) {
      return NextResponse.json(
        { error: "Invalid generated content.", details: draft.error.flatten() },
        { status: 502 },
      );
    }

    return NextResponse.json(draft.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    if (message.includes("abort")) {
      return NextResponse.json({ error: "Timed out. Try again." }, { status: 504 });
    }
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
