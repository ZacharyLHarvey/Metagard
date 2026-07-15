import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const authError = searchParams.get("error");

  if (authError) {
    return NextResponse.redirect(new URL("/forgot-password", request.url));
  }

  const response = NextResponse.redirect(new URL("/reset-password", request.url));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  let error: { message: string } | null = null;

  if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else if (tokenHash && type === "recovery") {
    ({ error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "recovery",
    }));
  } else {
    return NextResponse.redirect(new URL("/forgot-password", request.url));
  }

  if (error) {
    return NextResponse.redirect(new URL("/forgot-password", request.url));
  }

  return response;
}
