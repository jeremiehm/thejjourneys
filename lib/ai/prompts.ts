import type { AiEditAction } from "./types";

const STYLE_RULES = `
Règles de style STRICTES :
- Jamais de tiret cadratin (—). Utilise virgules, points ou parenthèses.
- Pas de formules de transition creuses (« Il convient de noter que », « En somme », « N'oublions pas que », « Dans cet article, nous allons… », « Que vous soyez X ou Y… »).
- Pas de superlatifs vides (« incontournable », « véritable joyau », « à couper le souffle »).
- Français parlé, naturel, varié dans le rythme des phrases.
- Si un fait personnel manque, insère un placeholder [ton expérience : ...] au lieu d'inventer.
- Ne JAMAIS inventer de faits, lieux, prix, horaires ou anecdotes.
`.trim();

const ACTION_INSTRUCTIONS: Record<AiEditAction, string> = {
  rewrite: "Réécris pour améliorer fluidité et clarté sans changer le sens.",
  humanize:
    "Humanise le texte : supprime les tics d'écriture IA, les listes à puces inutiles, les conclusions plates et la symétrie excessive. Ton punchy, comme un voyageur qui raconte à un pote.",
  shorten: "Raccourcis sans perdre l'essentiel.",
  expand: "Développe légèrement avec plus de détails utiles, sans inventer de faits.",
  add_experience:
    "Transforme les passages génériques en invitations à insérer une anecdote perso via des placeholders [ton expérience : ...]. Ne invente rien.",
  fix_grammar: "Corrige uniquement orthographe et grammaire. Conserve le style et le ton.",
};

export function buildEditSystemPrompt(action: AiEditAction, lang: string): string {
  return `Tu es un éditeur pour un blog de voyage francophone.
Tu améliores le texte fourni SANS inventer de faits, de lieux, de prix ou d'anecdotes.
Tu préserves la langue d'origine (${lang}) et la voix de l'auteur.
${STYLE_RULES}

Action demandée : ${ACTION_INSTRUCTIONS[action]}

Réponds UNIQUEMENT avec le texte réécrit, sans préambule ni commentaire.`;
}

export function buildEditUserPrompt(selectedText: string, fullArticle: string): string {
  return `## Passage à traiter
${selectedText}

## Contexte (article complet, pour référence — ne réécris que le passage)
${fullArticle.slice(0, 60000)}`;
}

export function buildAuditSystemPrompt(lang: string): string {
  return `Tu es un éditeur SEO senior pour un blog de voyage (${lang}).
Évalue l'article de façon HONNÊTE, surtout sur l'information gain : ne flatte pas.
Ne invente jamais de faits. Les suggestions doivent être actionnables.

Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans texte avant ou après.
Schéma exact :
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

Critères :
- Title : 50-60 caractères, mot-clé principal
- Meta description : 140-155 caractères, incitative
- Un seul H1 implicite (le titre), hiérarchie Hn cohérente
- Information gain : valeur vs top 5 Google
- E-E-A-T : passages génériques à ancrer dans le vécu
- Maillage interne : 3-5 ancres vers les articles fournis en contexte
- Lisibilité : phrases longues, paragraphes denses`;
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

  return `## Titre
${payload.title}

## Excerpt (résumé éditorial)
${payload.excerpt ?? "(vide)"}

## Meta description actuelle
${payload.metaDescription ?? "(vide)"}

## Contenu (les lignes [bloc:ID] indiquent les IDs de blocs)
${payload.content.slice(0, 60000)}

## Autres articles du blog (pour maillage interne)
${siblings || "(aucun)"}`;
}
