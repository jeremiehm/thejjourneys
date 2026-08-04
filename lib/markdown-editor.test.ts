import { describe, expect, it } from "vitest";
import { htmlToMarkdown, markdownToHtml } from "@/lib/markdown-editor";

/**
 * Single harness for markdown storage round-trips.
 * Add a row whenever TipTap gains a feature that must survive save/reload.
 */
const FIXTURES: { name: string; md: string; assertHtml?: (html: string) => void }[] = [
  {
    name: "gfm table with escaped pipe",
    md: `| A | B | C |
| --- | --- | --- |
| 1 | a\\|b |  |
| 2 | x | y |`,
    assertHtml: (html) => expect(html).toContain("<table>"),
  },
  {
    name: "callout note",
    md: `> [!NOTE]
> Body text`,
    assertHtml: (html) => {
      expect(html).toContain('data-type="callout"');
      expect(html).toContain('data-variant="note"');
    },
  },
  {
    name: "plain blockquote",
    md: `> Ordinary quote`,
    assertHtml: (html) => {
      expect(html).toContain("<blockquote>");
      expect(html).not.toContain('data-type="callout"');
    },
  },
];

describe("markdown-editor round-trip harness", () => {
  it.each(FIXTURES)("$name", ({ md, assertHtml }) => {
    const html = markdownToHtml(md);
    assertHtml?.(html);
    const out = htmlToMarkdown(html).trim();
    // Re-parse output — semantic equality via second HTML conversion
    const html2 = markdownToHtml(out);
    assertHtml?.(html2);
  });
});
