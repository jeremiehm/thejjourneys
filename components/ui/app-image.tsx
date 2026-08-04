import Image from "next/image";
import { cn } from "@/lib/utils";

type AppImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
  /** Explicit sizes for responsive srcset — required for correct candidate selection. */
  sizes?: string;
};

/**
 * Public-site image component.
 * Uses next/image (AVIF/WebP + srcset). Supabase hosts must be listed in
 * next.config remotePatterns. Historically we bypassed the optimizer because of
 * SSRF / private-IP resolution during local builds; public *.supabase.co URLs
 * are fine on Vercel with remotePatterns.
 */
export function AppImage({
  src,
  alt,
  className,
  priority,
  sizes = "(min-width: 1024px) 50vw, 100vw",
}: AppImageProps) {
  const trimmed = src?.trim();
  if (!trimmed) return null;

  return (
    <Image
      src={trimmed}
      alt={alt}
      fill
      priority={priority}
      quality={75}
      sizes={sizes}
      className={cn("object-cover", className)}
    />
  );
}
