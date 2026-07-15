import { createClient } from "@/lib/server/supabaseServer";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(request.url);

  if (error) {
    return NextResponse.redirect(new URL("/forgot-password", request.url));
  }

  return NextResponse.redirect(new URL("/reset-password", request.url));
}
