import { NextResponse } from "next/server";
import { buildEditSystemPrompt, buildEditUserPrompt } from "@/lib/ai/prompts";
import { streamOpenAiMessage } from "@/lib/ai/openai";
import { aiEditRequestSchema } from "@/lib/ai/types";
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

  const parsed = aiEditRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const { action, selectedText, fullArticle, lang } = parsed.data;

  try {
    const stream = streamOpenAiMessage({
      system: buildEditSystemPrompt(action, lang),
      userMessage: buildEditUserPrompt(selectedText, fullArticle),
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
