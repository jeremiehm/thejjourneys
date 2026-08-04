"use client";

import { useCookieConsent } from "@/components/consent-provider";

/**
 * Opt-in cookie banner (RGPD). GA only loads after Accept.
 * Lightweight custom UI — no third-party consent library.
 */
export function CookieConsentBanner() {
  const { consent, ready, accept, refuse } = useCookieConsent();

  if (!ready || consent !== null) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
      className="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-xl sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p id="cookie-consent-title" className="text-sm font-semibold text-stone-950">
            Cookies & analytics
          </p>
          <p id="cookie-consent-desc" className="text-sm leading-6 text-stone-600">
            We use Google Analytics to understand how the site is used. No analytics cookies are set
            until you accept. You can refuse — the site works either way.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={refuse}
            className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-800 hover:border-stone-950"
          >
            Refuse
          </button>
          <button
            type="button"
            onClick={accept}
            className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
