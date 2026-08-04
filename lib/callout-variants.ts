export const CALLOUT_VARIANTS = ["note", "tip", "important", "warning", "caution"] as const;

export type CalloutVariant = (typeof CALLOUT_VARIANTS)[number];

export const CALLOUT_VARIANT_META: Record<
  CalloutVariant,
  { label: string; icon: string; slashId: string }
> = {
  note: { label: "Note", icon: "ℹ️", slashId: "callout-note" },
  tip: { label: "Tip", icon: "💡", slashId: "callout-tip" },
  important: { label: "Important", icon: "❗", slashId: "callout-important" },
  warning: { label: "Warning", icon: "⚠️", slashId: "callout-warning" },
  caution: { label: "Caution", icon: "🚨", slashId: "callout-caution" },
};

export function normalizeCalloutVariant(value: unknown): CalloutVariant {
  const raw = String(value ?? "note").toLowerCase();
  return (CALLOUT_VARIANTS as readonly string[]).includes(raw) ? (raw as CalloutVariant) : "note";
}

export function calloutVariantFromToken(token: string): CalloutVariant | null {
  const match = token.trim().match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]$/i);
  if (!match?.[1]) return null;
  return normalizeCalloutVariant(match[1]);
}
