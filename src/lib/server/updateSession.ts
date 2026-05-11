import "server-only";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session on every request and forwards the
 * resulting cookies to both the request (so Server Components see the fresh
 * session in the same request) and the response (so the browser persists it).
 *
 * Recommended companion to `@supabase/ssr`: without this, expired access
 * tokens are never rotated and users can be silently logged out.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Touching the user triggers a token refresh when needed. Do not remove,
  // and do not run any code between `createServerClient` and this call —
  // doing so can cause hard-to-debug session loss.
  await supabase.auth.getUser();

  return response;
}
