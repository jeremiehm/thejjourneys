import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

export function createSupabaseBrowserClient() {
  if (!supabaseEnv.url || !supabaseEnv.key) {
    return null;
  }

  return createBrowserClient<Database>(supabaseEnv.url, supabaseEnv.key);
}
