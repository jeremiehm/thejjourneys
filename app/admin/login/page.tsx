import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = { title: "Admin login" };

export default function LoginPage() {
  return (
    <main className="admin-theme flex min-h-screen items-center justify-center bg-[#0F0F0F] px-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
