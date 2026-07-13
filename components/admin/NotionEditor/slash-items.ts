export type SlashItem = {
  id: string;
  title: string;
  description: string;
  icon: string;
  group: "text" | "lists" | "media" | "special";
  keywords?: string[];
};

export const SLASH_ITEMS: SlashItem[] = [
  { id: "paragraph", title: "Text", description: "Paragraph", icon: "📄", group: "text", keywords: ["text", "p"] },
  { id: "h1", title: "Heading 1", description: "Large heading", icon: "H1", group: "text" },
  { id: "h2", title: "Heading 2", description: "Medium heading", icon: "H2", group: "text" },
  { id: "h3", title: "Heading 3", description: "Small heading", icon: "H3", group: "text" },
  { id: "quote", title: "Quote", description: "Quote block", icon: "❝", group: "text" },
  { id: "divider", title: "Divider", description: "Horizontal line", icon: "─", group: "text" },
  { id: "bullet", title: "Bulleted list", description: "Bullet list", icon: "•", group: "lists" },
  { id: "ordered", title: "Numbered list", description: "Numbered list", icon: "1.", group: "lists" },
  { id: "task", title: "To-do list", description: "Checklist", icon: "☐", group: "lists" },
  { id: "image", title: "Image", description: "Upload or URL", icon: "🖼", group: "media" },
  { id: "video", title: "Video", description: "YouTube or Vimeo", icon: "▶", group: "media" },
  { id: "code", title: "Code", description: "Code block", icon: "{}", group: "special" },
  { id: "callout", title: "Callout", description: "Highlighted note", icon: "💡", group: "special" },
  { id: "alert", title: "Alert", description: "Alert message", icon: "⚠", group: "special" },
];

const GROUP_LABELS: Record<SlashItem["group"], string> = {
  text: "TEXT",
  lists: "LISTS",
  media: "MEDIA",
  special: "SPECIAL",
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
  const groups = ["text", "lists", "media", "special"] as const;
  return groups
    .map((group) => ({
      label: GROUP_LABELS[group],
      items: items.filter((item) => item.group === group),
    }))
    .filter((g) => g.items.length > 0);
}
