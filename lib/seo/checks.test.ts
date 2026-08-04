import { describe, expect, it } from "vitest";
import {
  checkHeadingHierarchy,
  checkImageAlts,
  checkInternalLinks,
  checkMetaDescription,
  checkMetaTitle,
  checkSingleH1,
  checkSlug,
  checkTitle,
  runSeoChecks,
  seoChecksBlockPublish,
} from "@/lib/seo/checks";
import type { ArticleBlock } from "@/lib/blocks/types";

const text = (markdown: string, id = "t1"): ArticleBlock => ({
  id,
  type: "text",
  data: { markdown },
});

const image = (alt?: string, decorative?: boolean, id = "i1"): ArticleBlock => ({
  id,
  type: "image",
  data: { url: "https://example.com/a.jpg", alt, decorative },
});

describe("seo checks", () => {
  it("fails on empty slug and title", () => {
    expect(checkSlug("").status).toBe("fail");
    expect(checkTitle("").status).toBe("fail");
  });

  it("fails when body contains an H1", () => {
    expect(checkSingleH1([text("# Oops")]).status).toBe("fail");
    expect(checkSingleH1([text("## Fine")]).status).toBe("pass");
  });

  it("warns on meta length and emptiness", () => {
    expect(checkMetaTitle(null).status).toBe("warn");
    expect(checkMetaTitle("x".repeat(61)).status).toBe("warn");
    expect(checkMetaDescription("").status).toBe("warn");
    expect(checkMetaDescription("y".repeat(156)).status).toBe("warn");
  });

  it("warns on missing alt unless decorative", () => {
    expect(checkImageAlts([image("")]).status).toBe("warn");
    expect(checkImageAlts([image("", true)]).status).toBe("pass");
    expect(checkImageAlts([image("A cat")]).status).toBe("pass");
  });

  it("detects skipped heading levels", () => {
    expect(checkHeadingHierarchy([text("## A\n#### B")]).status).toBe("warn");
    expect(checkHeadingHierarchy([text("## A\n### B")]).status).toBe("pass");
  });

  it("warns when fewer than two internal links", () => {
    expect(checkInternalLinks([text("[one](/a)")]).status).toBe("warn");
    expect(checkInternalLinks([text("[one](/a) [two](/b)")]).status).toBe("pass");
  });

  it("blocks publish only on fails", () => {
    const results = runSeoChecks({
      title: "",
      slug: "ok",
      metaTitle: null,
      metaDescription: null,
      ogImageUrl: null,
      coverImageUrl: null,
      noindex: false,
      content: [text("## Hi")],
    });
    expect(seoChecksBlockPublish(results)).toBe(true);
  });
});
