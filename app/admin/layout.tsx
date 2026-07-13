import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminProviders } from "@/components/admin/admin-providers";
import { getCurrentUser } from "@/lib/supabase/server";

const adminSans = Inter({
  variable: "--font-admin-sans",
  subsets: ["latin"],
  display: "swap",
});

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className={`${adminSans.variable} min-h-screen`}>
      <AdminProviders>
        <AdminShell userEmail={user?.email}>{children}</AdminShell>
      </AdminProviders>
    </div>
  );
}
