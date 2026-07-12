import type { CoverType } from "@/lib/blocks/types";
import { AppImage } from "@/components/ui/app-image";
import { cn } from "@/lib/utils";

export function ArticleCover({
  url,
  type,
  title,
  priority,
}: {
  url: string | null;
  type: CoverType;
  title: string;
  priority?: boolean;
}) {
  if (!url) return null;

  if (type === "banner") {
    return (
      <div className="relative mx-auto aspect-[16/8] max-w-6xl overflow-hidden rounded-[2.5rem]">
        <AppImage src={url} alt={title} priority={priority} />
      </div>
    );
  }

  return (
    <figure
      className={cn(
        "mx-auto overflow-hidden rounded-[2rem]",
        type === "above_title" ? "max-w-xl" : "max-w-2xl",
      )}
    >
      <div className={cn("relative w-full", type === "above_title" ? "aspect-[4/3]" : "aspect-[16/10]")}>
        <AppImage src={url} alt={title} priority={priority} />
      </div>
    </figure>
  );
}
