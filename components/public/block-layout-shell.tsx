import { cn } from "@/lib/utils";

export function BlockLayoutShell({
  fullWidth,
  children,
  className,
}: {
  fullWidth?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        fullWidth && "article-block-full-width",
        !fullWidth && "w-full",
        className,
      )}
    >
      {children}
    </div>
  );
}
