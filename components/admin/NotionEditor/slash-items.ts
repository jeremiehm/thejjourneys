export type SlashItem = {
  id: string;
  title: string;
  description: string;
  icon: string;
  group: "texte" | "listes" | "medias" | "speciaux";
  keywords?: string[];
};

export const SLASH_ITEMS: SlashItem[] = [
  { id: "paragraph", title: "Texte", description: "Paragraphe", icon: "📄", group: "texte", keywords: ["text", "p"] },
  { id: "h1", title: "Titre 1", description: "Grand titre", icon: "H1", group: "texte" },
  { id: "h2", title: "Titre 2", description: "Titre moyen", icon: "H2", group: "texte" },
  { id: "h3", title: "Titre 3", description: "Petit titre", icon: "H3", group: "texte" },
  { id: "quote", title: "Citation", description: "Citation", icon: "❝", group: "texte" },
  { id: "divider", title: "Séparateur", description: "Ligne horizontale", icon: "─", group: "texte" },
  { id: "bullet", title: "Puces", description: "Liste à puces", icon: "•", group: "listes" },
  { id: "ordered", title: "Numérotée", description: "Liste numérotée", icon: "1.", group: "listes" },
  { id: "task", title: "Cases", description: "Liste de tâches", icon: "☐", group: "listes" },
  { id: "image", title: "Image", description: "Upload ou URL", icon: "🖼", group: "medias" },
  { id: "video", title: "Vidéo", description: "YouTube ou Vimeo", icon: "▶", group: "medias" },
  { id: "code", title: "Code", description: "Bloc de code", icon: "{}", group: "speciaux" },
  { id: "callout", title: "Note", description: "Encadré mis en avant", icon: "💡", group: "speciaux" },
  { id: "alert", title: "Alerte", description: "Message d'alerte", icon: "⚠", group: "speciaux" },
];

const GROUP_LABELS: Record<SlashItem["group"], string> = {
  texte: "TEXTE",
  listes: "LISTES",
  medias: "MÉDIAS",
  speciaux: "SPÉCIAUX",
};

export function filterSlashItems(query: string): SlashItem[] {
  const q = query.toLowerCase().trim();
  if (!q) return SLASH_ITEMS;
  return SLASH_ITEMS.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.keywords?.some((keyword) => keyword.includes(q)),
  );
}

export function groupSlashItems(items: SlashItem[]) {
  const groups = ["texte", "listes", "medias", "speciaux"] as const;
  return groups
    .map((group) => ({
      label: GROUP_LABELS[group],
      items: items.filter((item) => item.group === group),
    }))
    .filter((g) => g.items.length > 0);
}
