"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Globe2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { adminFieldInputClass, adminFieldLabelClass } from "@/components/admin/form-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      setError(null);
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        setError("Supabase environment variables are not configured yet.");
        return;
      }
      const email = String(formData.get("email") ?? "");
      const password = String(formData.get("password") ?? "");
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message);
        return;
      }
      router.push(searchParams.get("next") ?? "/admin");
      router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="w-full max-w-md space-y-6 rounded-xl border border-stone-200 bg-white p-8 shadow-xl">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500">
          <Globe2 className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-stone-950">Admin login</h1>
          <p className="text-sm text-stone-500">Access for Jeremie.</p>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email" className={adminFieldLabelClass}>
          Email
        </Label>
        <Input id="email" name="email" type="email" required className={adminFieldInputClass} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className={adminFieldLabelClass}>
          Password
        </Label>
        <Input id="password" name="password" type="password" required className={adminFieldInputClass} />
      </div>
      {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      <Button
        type="submit"
        disabled={isPending}
        className="h-11 w-full rounded-xl bg-amber-500 text-stone-950 hover:bg-amber-400"
      >
        {isPending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
