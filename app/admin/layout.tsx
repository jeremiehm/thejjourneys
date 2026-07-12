import { AdminShell } from "@/components/admin/admin-shell";
import { AdminProviders } from "@/components/admin/admin-providers";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <AdminProviders>
      <AdminShell userEmail={user?.email}>{children}</AdminShell>
    </AdminProviders>
  );
}
