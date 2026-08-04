"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  COOKIE_CONSENT_KEY,
  type CookieConsentValue,
} from "@/lib/analytics";

type ConsentContextValue = {
  /** null = not chosen yet (show banner) */
  consent: CookieConsentValue | null;
  ready: boolean;
  accept: () => void;
  refuse: () => void;
};

const ConsentContext = createContext<ConsentContextValue | null>(null);

function applyGtagConsent(value: CookieConsentValue) {
  if (typeof window === "undefined") return;
  const w = window as Window & {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  };
  w.dataLayer = w.dataLayer || [];
  if (typeof w.gtag !== "function") {
    w.gtag = function gtag(...args: unknown[]) {
      w.dataLayer!.push(args);
    };
  }
  w.gtag("consent", "update", {
    ad_storage: value === "granted" ? "granted" : "denied",
    ad_user_data: value === "granted" ? "granted" : "denied",
    ad_personalization: value === "granted" ? "granted" : "denied",
    analytics_storage: value === "granted" ? "granted" : "denied",
  });
}

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<CookieConsentValue | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Default Consent Mode v2: denied until opt-in (RGPD)
    const w = window as Window & {
      dataLayer?: unknown[];
      gtag?: (...args: unknown[]) => void;
    };
    w.dataLayer = w.dataLayer || [];
    if (typeof w.gtag !== "function") {
      w.gtag = function gtag(...args: unknown[]) {
        w.dataLayer!.push(args);
      };
    }
    w.gtag("consent", "default", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied",
      wait_for_update: 500,
    });

    try {
      const stored = window.localStorage.getItem(COOKIE_CONSENT_KEY);
      if (stored === "granted" || stored === "denied") {
        setConsent(stored);
        applyGtagConsent(stored);
      }
    } catch {
      // ignore storage errors
    }
    setReady(true);
  }, []);

  const accept = useCallback(() => {
    try {
      window.localStorage.setItem(COOKIE_CONSENT_KEY, "granted");
    } catch {
      // ignore
    }
    setConsent("granted");
    applyGtagConsent("granted");
  }, []);

  const refuse = useCallback(() => {
    try {
      window.localStorage.setItem(COOKIE_CONSENT_KEY, "denied");
    } catch {
      // ignore
    }
    setConsent("denied");
    applyGtagConsent("denied");
  }, []);

  const value = useMemo(
    () => ({ consent, ready, accept, refuse }),
    [consent, ready, accept, refuse],
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export function useCookieConsent() {
  const ctx = useContext(ConsentContext);
  if (!ctx) {
    throw new Error("useCookieConsent must be used within ConsentProvider");
  }
  return ctx;
}
