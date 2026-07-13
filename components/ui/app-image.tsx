import Image from "next/image";
import { cn } from "@/lib/utils";

type AppImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
};

/** Supabase Storage must bypass the Next.js optimizer (SSRF / private IP resolution). */
function shouldLoadDirectly(src: string): boolean {
  try {
    const host = new URL(src).hostname;
    return host.endsWith(".supabase.co") || host.endsWith(".supabase.in");
  } catch {
    return false;
  }
}

export function AppImage({ src, alt, className, priority }: AppImageProps) {
  const trimmed = src?.trim();
  if (!trimmed) return null;

  if (shouldLoadDirectly(trimmed)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={trimmed}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className={cn("absolute inset-0 h-full w-full object-cover", className)}
      />
    );
  }

  return (
    <Image
      src={trimmed}
      alt={alt}
      fill
      priority={priority}
      sizes="(min-width: 1024px) 50vw, 100vw"
      className={cn("object-cover", className)}
    />
  );
}
