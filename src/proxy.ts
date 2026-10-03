import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { readSupabaseAuthConfig } from "@/lib/env/runtime-env";
import type { Database } from "@/lib/supabase/database.types";
import { handleProxyClaims } from "@/lib/supabase/proxy-claims";

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
    const authCookieNames = request.cookies.getAll()
      .filter(({ name }) => name.startsWith("sb-") && name.includes("-auth-token"))
      .map(({ name }) => name);
    authCookieNames.forEach((name) => request.cookies.delete(name));
    response = NextResponse.next({ request });
    authCookieNames.forEach((name) => response.cookies.delete(name));
  };

  await handleProxyClaims(() => supabase.auth.getClaims(), clearAuthCookies);

  return response;
}

export const config = {
  matcher: ["/app/:path*"],
};
