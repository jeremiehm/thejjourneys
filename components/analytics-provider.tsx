"use client";

import { ConsentProvider } from "@/components/consent-provider";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { GoogleAnalyticsGate } from "@/components/google-analytics-gate";
import { OutboundLinkTracker } from "@/hooks/use-outbound-link-tracking";
import type { ReactNode } from "react";

/** Client shell for consent + GA + outbound tracking (root layout). */
export function AnalyticsProvider({ children }: { children: ReactNode }) {
  return (
    <ConsentProvider>
      {children}
      <CookieConsentBanner />
      <GoogleAnalyticsGate />
      <OutboundLinkTracker />
    </ConsentProvider>
  );
}
