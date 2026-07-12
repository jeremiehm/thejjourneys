import { NextResponse } from "next/server";
import { extractJsonObject, fetchOpenAiJson } from "@/lib/ai/openai";
import { buildAuditSystemPrompt, buildAuditUserPrompt } from "@/lib/ai/prompts";
import { aiAuditRequestSchema, auditReportSchema } from "@/lib/ai/types";
import { getCurrentUser } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = aiAuditRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide", details: parsed.error.flatten() }, { status: 400 });
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
        { error: "Réponse IA malformée. Réessayez.", raw: raw.slice(0, 500) },
        { status: 502 },
      );
    }

    const report = auditReportSchema.safeParse(data);
    if (!report.success) {
      return NextResponse.json(
        { error: "Structure d'audit invalide.", details: report.error.flatten() },
        { status: 502 },
      );
    }

    return NextResponse.json(report.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    if (message.includes("abort")) {
      return NextResponse.json({ error: "Délai dépassé. Réessayez." }, { status: 504 });
    }
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
