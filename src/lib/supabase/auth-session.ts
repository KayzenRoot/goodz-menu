import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readSupabaseAuthConfig } from "@/lib/env/runtime-env";
import type { Database } from "@/lib/supabase/database.types";

export type ServerSupabaseClient = SupabaseClient<Database>;

export async function createSupabaseServerClient(): Promise<ServerSupabaseClient | null> {
  const runtime = readSupabaseAuthConfig();
  if (!runtime.ok) return null;

  const cookieStore = await cookies();
  return createServerClient<Database>(runtime.config.supabaseApiUrl.toString(), runtime.config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot emit Set-Cookie; the request proxy handles refresh before rendering.
        }
      },
    },
  });
}

export async function getValidatedAuthUser(client: Pick<ServerSupabaseClient, "auth">) {
  try {
    const { data, error } = await client.auth.getUser();
    return error || !data.user?.id ? null : data.user;
  } catch {
    return null;
  }
}

export async function getCurrentAuthContext() {
  const client = await createSupabaseServerClient();
  if (!client) return null;

  const user = await getValidatedAuthUser(client);
  return user ? { client, user } : null;
}
