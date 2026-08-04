"use client";

import { sendGAEvent } from "@next/third-parties/google";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { isExternalUrl } from "@/lib/analytics";

/**
 * Captures clicks on any outbound `<a>` (non-affiliate included) and sends
 * a GA4 `outbound_click` event. Mount once via `OutboundLinkTracker`.
 */
export function useOutboundLinkTracking(enabled = true) {
  const pathname = usePathname();

  useEffect(() => {
    if (!enabled) return;

    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || !isExternalUrl(href, window.location.hostname)) return;

      // Affiliate links already send a dedicated event
      if (anchor.rel.split(/\s+/).includes("sponsored")) return;

      try {
        sendGAEvent("event", "outbound_click", {
          url: href,
          link_text: (anchor.textContent ?? "").trim().slice(0, 120),
          page_path: pathname,
        });
      } catch {
        // GA may be unavailable if consent was refused
      }
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [enabled, pathname]);
}

/** Drop-in client component that activates outbound click tracking (public site only). */
export function OutboundLinkTracker() {
  const pathname = usePathname();
  useOutboundLinkTracking(!pathname.startsWith("/admin"));
  return null;
}
