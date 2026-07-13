function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asScore(value: unknown): number {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return Math.min(100, Math.max(0, Math.round(value)));
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (!Number.isNaN(parsed)) return Math.min(100, Math.max(0, Math.round(parsed)));
  }
  return 0;
}

/** Coerce common OpenAI audit JSON drift before Zod validation. */
export function normalizeAuditReport(data: unknown): unknown {
  if (!data || typeof data !== "object" || Array.isArray(data)) return data;

  const raw = data as Record<string, unknown>;
  const title = asObject(raw.title);
  const meta = asObject(raw.metaDescription);
  const structure = asObject(raw.structure);
  const informationGain = asObject(raw.informationGain);
  const eeat = asObject(raw.eeat);
  const readability = asObject(raw.readability);

  const weakPassages = Array.isArray(eeat.weakPassages)
    ? eeat.weakPassages
        .map((item) => {
          const passage = asObject(item);
          const excerpt = asString(passage.excerpt);
          if (!excerpt) return null;
          return {
            excerpt,
            blockId: typeof passage.blockId === "string" ? passage.blockId : undefined,
            reason: typeof passage.reason === "string" ? passage.reason : undefined,
          };
        })
        .filter(Boolean)
    : [];

  const internalLinks = Array.isArray(raw.internalLinks)
    ? raw.internalLinks
        .map((item) => {
          const link = asObject(item);
          const anchor = asString(link.anchor);
          const targetSlug = asString(link.targetSlug);
          if (!anchor || !targetSlug) return null;
          return {
            anchor,
            targetSlug,
            collectionSlug: typeof link.collectionSlug === "string" ? link.collectionSlug : undefined,
            reason: typeof link.reason === "string" ? link.reason : undefined,
          };
        })
        .filter(Boolean)
    : [];

  return {
    score: asScore(raw.score),
    title: {
      ok: Boolean(title.ok),
      suggestions: asStringList(title.suggestions),
    },
    metaDescription: {
      current: typeof meta.current === "string" ? meta.current : null,
      suggested: asString(meta.suggested),
    },
    structure: {
      issues: asStringList(structure.issues),
    },
    informationGain: {
      verdict: asString(informationGain.verdict, "No verdict provided."),
      addsValue: Boolean(informationGain.addsValue),
      suggestions: asStringList(informationGain.suggestions),
    },
    eeat: {
      weakPassages,
      suggestions: asStringList(eeat.suggestions),
    },
    internalLinks,
    readability: {
      issues: asStringList(readability.issues),
    },
  };
}
