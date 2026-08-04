"use client";

import { GoogleAnalytics } from "@next/third-parties/google";
import { useCookieConsent } from "@/components/consent-provider";
import { GA_MEASUREMENT_ID } from "@/lib/analytics";

/** Loads GA4 only after the visitor opts in (RGPD). */
export function GoogleAnalyticsGate() {
  const { consent, ready } = useCookieConsent();
  if (!ready || consent !== "granted") return null;
  return <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />;
}
