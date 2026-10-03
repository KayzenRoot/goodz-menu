import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { readSupabaseAuthConfig } from "@/lib/env/runtime-env";
import type { Database } from "@/lib/supabase/database.types";

export async function proxy(request: NextRequest) {
  const config = readSupabaseAuthConfig();
  let response = NextResponse.next({ request });
  if (!config.ok) return response;

  const supabase = createServerClient<Database>(
    config.config.supabaseApiUrl.toString(),
    config.config.anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const clearAuthCookies = () => {
    request.cookies.getAll()
      .filter(({ name }) => name.startsWith("sb-") && name.includes("-auth-token"))
      .forEach(({ name }) => response.cookies.delete(name));
  };

  try {
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims) clearAuthCookies();
  } catch {
    clearAuthCookies();
  }

  return response;
}

export const config = {
  matcher: ["/app/:path*"],
};
