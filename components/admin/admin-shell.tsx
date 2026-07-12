"use client";

import { usePathname } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";

function isNotionArticleEditorPath(pathname: string) {
  if (pathname === "/admin/articles/new") return true;
  return /^\/admin\/articles\/[^/]+\/edit$/.test(pathname);
}

export function AdminShell({
  children,
  userEmail,
}: {
  children: React.ReactNode;
  userEmail?: string | null;
}) {
  const pathname = usePathname();

  if (isNotionArticleEditorPath(pathname)) {
    return <div className="admin-theme min-h-screen">{children}</div>;
  }

  return (
    <div className="admin-theme min-h-screen bg-zinc-50">
      <AdminNav userEmail={userEmail} />
      <div className="lg:pl-[220px]">
        <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
