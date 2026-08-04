"use client";

import { sendGAEvent } from "@next/third-parties/google";
import { usePathname } from "next/navigation";
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";

type AffiliateLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "onClick"> & {
  href: string;
  /** Partner / offer name, e.g. "ALDI Mobile", "Airalo" */
  provider: string;
  children: ReactNode;
};

/**
 * External affiliate link that sends a GA4 `affiliate_click` event on click.
 * Only fires when GA is loaded (after cookie consent).
 */
export function AffiliateLink({
  href,
  provider,
  children,
  className,
  ...rest
}: AffiliateLinkProps) {
  const pathname = usePathname();

  function handleClick(_event: MouseEvent<HTMLAnchorElement>) {
    try {
      sendGAEvent("event", "affiliate_click", {
        provider,
        url: href,
        article_path: pathname,
      });
    } catch {
      // GA may be unavailable if consent was refused
    }
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className={cn(className)}
      onClick={handleClick}
      {...rest}
    >
      {children}
    </a>
  );
}
