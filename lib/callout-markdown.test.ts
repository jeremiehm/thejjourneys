import { describe, expect, it } from "vitest";
import { htmlToMarkdown, markdownToHtml } from "@/lib/markdown-editor";
import { CALLOUT_VARIANTS } from "@/lib/callout-variants";

describe("callout GFM alert round-trip", () => {
  it.each(CALLOUT_VARIANTS)("round-trips variant %s", (variant) => {
    const token = variant.toUpperCase();
    const md = `> [!${token}]
> Hello **${variant}** with a [link](https://example.com).`;

    const html = markdownToHtml(md);
    expect(html).toContain('data-type="callout"');
    expect(html).toContain(`data-variant="${variant}"`);

    const out = htmlToMarkdown(html);
    expect(out).toContain(`[!${token}]`);
    expect(out).toMatch(/Hello \*\*[^*]+\*\*/);
    expect(out).toContain("[link](https://example.com)");

    const again = markdownToHtml(out);
    expect(again).toContain(`data-variant="${variant}"`);
  });

  it("round-trips a nested list inside a callout", () => {
    const md = `> [!TIP]
> Before list
> - one
> - two
>   - nested`;

    const html = markdownToHtml(md);
    expect(html).toContain('data-variant="tip"');
    const out = htmlToMarkdown(html);
    expect(out).toContain("[!TIP]");
    expect(out).toMatch(/[-*]\s+one/);
    expect(markdownToHtml(out)).toContain('data-type="callout"');
  });

  it("preserves a literal > character in callout body", () => {
    const md = `> [!NOTE]
> Use \`n > 0\` carefully.`;

    const html = markdownToHtml(md);
    const out = htmlToMarkdown(html);
    expect(out).toContain("[!NOTE]");
    expect(out).toMatch(/n > 0|n \\> 0|`n > 0`/);
  });

  it("keeps ordinary blockquotes as blockquotes", () => {
    const md = `> Just a quote
> with two lines`;

    const html = markdownToHtml(md);
    expect(html).toContain("<blockquote>");
    expect(html).not.toContain('data-type="callout"');

    const out = htmlToMarkdown(html);
    expect(out).not.toMatch(/\[!/);
    expect(out).toContain("Just a quote");
  });
});
