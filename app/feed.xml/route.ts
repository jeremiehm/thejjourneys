import { SITE_URL } from "@/lib/env";
import { getArticles } from "@/lib/data";

export const revalidate = 3600;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const articles = (await getArticles())
    .filter((article) => article.collection && !article.noindex)
    .sort(
      (a, b) =>
        +new Date(b.published_at ?? b.created_at) - +new Date(a.published_at ?? a.created_at),
    )
    .slice(0, 30);

  const items = articles
    .map((article) => {
      const link = `${SITE_URL}/collections/${article.collection!.slug}/${article.slug}`;
      const description = article.excerpt || article.meta_description || "";
      const pubDate = article.published_at
        ? new Date(article.published_at).toUTCString()
        : new Date(article.created_at).toUTCString();
      return `<item>
  <title>${escapeXml(article.title)}</title>
  <link>${escapeXml(link)}</link>
  <guid isPermaLink="true">${escapeXml(link)}</guid>
  <pubDate>${pubDate}</pubDate>
  <description>${escapeXml(description)}</description>
</item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>Dot On The Map</title>
  <link>${SITE_URL}</link>
  <description>Travel journals, itineraries, and photos by Jeremie.</description>
  ${items}
</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate",
    },
  });
}
