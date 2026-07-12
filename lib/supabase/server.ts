import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { hasSupabaseEnv, supabaseEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

export async function createSupabaseServerClient() {
  if (!hasSupabaseEnv() || !supabaseEnv.url || !supabaseEnv.key) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseEnv.url, supabaseEnv.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot always set cookies; middleware refreshes sessions.
        }
      },
    },
  });
}

export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
