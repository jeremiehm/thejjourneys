import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

/**
 * Robots policy notes:
 * - Blocking Google-Extended does NOT affect Googlebot or normal Search rankings.
 * - Blocking a retrieval crawler (e.g. OAI-SearchBot, Claude-User) removes the site
 *   from that assistant's answers / citations. Change deliberately.
 * Default below: allow both retrieval and training crawlers.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/"],
      },
      // Retrieval / citation crawlers
      { userAgent: "OAI-SearchBot", allow: "/" },
      { userAgent: "ChatGPT-User", allow: "/" },
      { userAgent: "Claude-SearchBot", allow: "/" },
      { userAgent: "Claude-User", allow: "/" },
      { userAgent: "PerplexityBot", allow: "/" },
      { userAgent: "Perplexity-User", allow: "/" },
      // Training crawlers (allowed for now — flip to disallow intentionally later)
      { userAgent: "GPTBot", allow: "/" },
      { userAgent: "ClaudeBot", allow: "/" },
      { userAgent: "CCBot", allow: "/" },
      { userAgent: "Google-Extended", allow: "/" },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
