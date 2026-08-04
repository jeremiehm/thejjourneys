const PRODUCTION_SITE_URL = "https://www.dot-onthemap.com";

function normalizeSiteUrl(raw: string): string {
  return raw.trim().replace(/\/$/, "");
}

function isLocalhostUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return url.includes("localhost");
  }
}

/**
 * Single source of truth for the public site origin.
 * Used by sitemap, robots.txt, metadataBase, Open Graph, etc.
 *
 * Priority:
 * 1. NEXT_PUBLIC_SITE_URL when set and not localhost
 * 2. Production default on Vercel / NODE_ENV=production
 * 3. Localhost for local development
 */
function resolveSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL
    ? normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL)
    : null;

  if (fromEnv && !isLocalhostUrl(fromEnv)) {
    return fromEnv;
  }

  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    return PRODUCTION_SITE_URL;
  }

  return fromEnv ?? "http://localhost:3000";
}

export const siteUrl = resolveSiteUrl();

/** Alias kept for clarity in docs / new call sites */
export const SITE_URL = siteUrl;

export const supabaseEnv = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};

export function hasSupabaseEnv() {
  return Boolean(supabaseEnv.url && supabaseEnv.key);
}
