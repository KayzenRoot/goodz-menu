import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readSupabaseAuthConfig } from "@/lib/env/runtime-env";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Ephemeral public anon client for public Storefront routes (/menu/[slug]).
 * Uses only the public anon key and never holds session cookies or service_role.
 */
export function createPublicAnonSupabaseClient(): SupabaseClient<Database> | null {
  const config = readSupabaseAuthConfig();
  if (!config.ok) return null;
  return createClient<Database>(
    config.config.supabaseApiUrl.toString(),
    config.config.anonKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  );
}
