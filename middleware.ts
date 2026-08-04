import { NextResponse, type NextRequest } from "next/server";
import { getArticleRedirect } from "@/lib/seo/redirects";

/**
 * Only public article paths: /collections/:collectionSlug/:articleSlug
 * Skips /admin and static assets via the matcher below.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const match = pathname.match(/^\/collections\/([^/]+)\/([^/]+)\/?$/);
  if (!match) return NextResponse.next();

  const collectionSlug = match[1]!;
  const articleSlug = match[2]!;
  const redirect = await getArticleRedirect(articleSlug);
  if (!redirect) return NextResponse.next();

  const targetCollection = redirect.collection_slug ?? collectionSlug;
  if (redirect.to_slug === articleSlug && targetCollection === collectionSlug) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = `/collections/${targetCollection}/${redirect.to_slug}`;
  return NextResponse.redirect(url, 301);
}

export const config = {
  matcher: ["/collections/:collectionSlug/:articleSlug"],
};
