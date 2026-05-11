import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/server/updateSession";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on every request except:
     *  - _next/static (build assets)
     *  - _next/image  (image optimization)
     *  - favicon / common static images
     *  - manifest / robots / sitemap
     * API routes are intentionally included so their cookies stay fresh.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
