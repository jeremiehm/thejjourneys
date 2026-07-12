import Image from "next/image";
import { cn } from "@/lib/utils";

type AppImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
};

export function AppImage({ src, alt, className, priority }: AppImageProps) {
  if (!src) {
    return <div className={cn("flex h-full min-h-48 items-center justify-center bg-stone-200 text-sm text-stone-500", className)}>Image to add</div>;
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      priority={priority}
      sizes="(min-width: 1024px) 50vw, 100vw"
      className={cn("object-cover", className)}
    />
  );
}
