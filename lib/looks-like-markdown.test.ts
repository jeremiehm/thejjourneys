import { describe, expect, it } from "vitest";
import { looksLikeMarkdown } from "@/lib/markdown-editor";

describe("looksLikeMarkdown", () => {
  it("detects a GFM markdown table", () => {
    const md = `| Name | City |
| --- | --- |
| Ada | Paris |`;
    expect(looksLikeMarkdown(md)).toBe(true);
  });

  it("rejects a plain paragraph with a hyphen", () => {
    expect(looksLikeMarkdown("This is a plain sentence - nothing fancy.")).toBe(false);
  });

  it("rejects a single URL", () => {
    expect(looksLikeMarkdown("https://example.com/path")).toBe(false);
  });

  it("detects a bulleted list", () => {
    expect(looksLikeMarkdown("- one\n- two\n- three")).toBe(true);
  });

  it("rejects underscores in a filename", () => {
    expect(looksLikeMarkdown("See my_file_name.txt for details.")).toBe(false);
  });
});
