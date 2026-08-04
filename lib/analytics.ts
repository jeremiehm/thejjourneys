/** Google Analytics 4 measurement ID */
export const GA_MEASUREMENT_ID = "G-HBT5X50BZ1";

/** localStorage key for cookie consent choice */
export const COOKIE_CONSENT_KEY = "dot-cookie-consent";

export type CookieConsentValue = "granted" | "denied";

export function isExternalUrl(href: string, currentHost?: string): boolean {
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return false;
  }
  try {
    const url = new URL(href, typeof window !== "undefined" ? window.location.origin : "https://example.com");
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const host = currentHost ?? (typeof window !== "undefined" ? window.location.hostname : "");
    if (!host) return true;
    return url.hostname !== host && !url.hostname.endsWith(`.${host}`);
  } catch {
    return false;
  }
}

/** Legacy helper — prefer sendGAEvent from @next/third-parties/google for new code. */
export function trackEvent(name: string, props?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "development") return;
  void name;
  void props;
}
