"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type AdminPageHeaderProps = {
  breadcrumbs: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
};

export function AdminPageHeader({ breadcrumbs, actions, className }: AdminPageHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 -mx-4 mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-stone-200/80 bg-zinc-50/90 px-4 py-4 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10",
        className,
      )}
    >
      <nav aria-label="Breadcrumb" className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-stone-500">
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;
          return (
            <span key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 ? <ChevronRight className="size-3.5 shrink-0 text-stone-400" /> : null}
              {item.href && !isLast ? (
                <Link href={item.href} className="truncate transition-colors hover:text-stone-900">
                  {item.label}
                </Link>
              ) : (
                <span className={cn("truncate", isLast && "font-medium text-stone-900")}>{item.label}</span>
              )}
            </span>
          );
        })}
      </nav>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}
