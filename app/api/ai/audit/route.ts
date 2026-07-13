import { NextResponse } from "next/server";
import { extractJsonObject, fetchOpenAiJson } from "@/lib/ai/openai";
import { normalizeAuditReport } from "@/lib/ai/normalize-audit";
import { buildAuditSystemPrompt, buildAuditUserPrompt } from "@/lib/ai/prompts";
import { aiAuditRequestSchema, auditReportSchema } from "@/lib/ai/types";
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

  const parsed = aiAuditRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const payload = parsed.data;

  try {
    const raw = await fetchOpenAiJson({
      system: buildAuditSystemPrompt(payload.lang),
      userMessage: buildAuditUserPrompt({
        title: payload.title,
        excerpt: payload.excerpt,
        metaDescription: payload.metaDescription,
        content: payload.content,
        siblingArticles: payload.siblingArticles,
      }),
      maxTokens: 8192,
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

    const report = auditReportSchema.safeParse(normalizeAuditReport(data));
    if (!report.success) {
      const firstIssue = report.error.issues[0];
      const hint = firstIssue ? `${firstIssue.path.join(".")}: ${firstIssue.message}` : "validation failed";
      return NextResponse.json(
        { error: `Invalid audit structure (${hint}).`, details: report.error.flatten() },
        { status: 502 },
      );
    }

    return NextResponse.json(report.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    if (message.includes("abort")) {
      return NextResponse.json({ error: "Timed out. Try again." }, { status: 504 });
    }
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
