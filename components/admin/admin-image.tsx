"use client";

import { cn } from "@/lib/utils";

type AdminImageProps = {
  src: string;
  alt?: string;
  className?: string;
  fill?: boolean;
  priority?: boolean;
};

/** Native img for admin previews — avoids Next.js optimizer SSRF issues with Supabase URLs. */
export function AdminImage({ src, alt = "", className, fill, priority }: AdminImageProps) {
  if (fill) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className={cn("absolute inset-0 h-full w-full object-cover", className)}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={className}
    />
  );
}
