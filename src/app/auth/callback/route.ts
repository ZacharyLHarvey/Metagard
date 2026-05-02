import { supabaseServer } from "@/lib/server/supabaseServer";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await supabaseServer();
  await supabase.auth.exchangeCodeForSession(request.url);

  return NextResponse.redirect(new URL("/", request.url));
}
