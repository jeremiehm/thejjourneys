"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ExternalLink,
  FileText,
  FolderOpen,
  Globe2,
  LayoutDashboard,
  LogOut,
  Bot,
} from "lucide-react";
import { signOut } from "@/app/admin/actions";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/collections", label: "Collections", icon: FolderOpen },
  { href: "/admin/articles", label: "Articles", icon: FileText },
  { href: "/admin/agents", label: "AI Agents", icon: Bot },
  { href: "/", label: "View site", icon: ExternalLink, external: true },
];

type AdminNavProps = {
  userEmail?: string | null;
};

export function AdminNav({ userEmail }: AdminNavProps) {
  const pathname = usePathname();

  if (pathname.startsWith("/admin/login")) {
    return null;
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-[220px] flex-col border-r border-white/10 bg-[#0F0F0F] text-stone-300">
      <div className="flex items-center gap-2.5 border-b border-white/10 px-5 py-5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
          <Globe2 className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">JJourneys</p>
          <p className="text-[11px] text-stone-500">Admin CMS</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              target={"external" in item && item.external ? "_blank" : undefined}
              rel={"external" in item && item.external ? "noopener noreferrer" : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-white/8 text-white"
                  : "text-stone-400 hover:bg-white/5 hover:text-stone-100",
              )}
            >
              {active ? (
                <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-amber-400" />
              ) : null}
              <Icon className={cn("size-4 shrink-0", active && "text-amber-400")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="mb-3 flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5">
          <div className="flex size-9 items-center justify-center rounded-full bg-amber-500/20 text-sm font-semibold text-amber-300">
            {(userEmail?.[0] ?? "A").toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{userEmail?.split("@")[0] ?? "Admin"}</p>
            <p className="text-[11px] text-stone-500">Editor</p>
          </div>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-stone-400 transition hover:bg-white/5 hover:text-white"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
