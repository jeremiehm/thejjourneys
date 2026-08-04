import { describe, expect, it } from "vitest";
import { htmlToMarkdown, markdownToHtml } from "@/lib/markdown-editor";

describe("GFM table markdown round-trip", () => {
  it("preserves a 3-column table with escaped pipe and empty cell", () => {
    const md = `| A | B | C |
| --- | --- | --- |
| 1 | a\\|b |  |
| 2 | x | y |`;

    const html = markdownToHtml(md);
    expect(html).toContain("<table>");
    expect(html).toContain("<th>");

    const out = htmlToMarkdown(html).trim();
    expect(out).toBe(md.trim());
  });
});
