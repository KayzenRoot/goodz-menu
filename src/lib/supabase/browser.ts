"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";

export function createBrowserSupabaseClient(supabaseUrl: string, anonKey: string) {
  if (!supabaseUrl || !anonKey) throw new Error("Supabase Auth configuration is unavailable.");
  return createBrowserClient<Database>(supabaseUrl, anonKey);
}
