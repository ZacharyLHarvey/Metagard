import { NextResponse } from "next/server";
import {
  parseSearchFilter,
  parseSearchQuery,
  parseSearchTypes,
  searchFilterToEntityTypes,
} from "@/lib/search";
import { getSearchPage } from "@/lib/queries/search";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = parseSearchQuery(searchParams.get("q"));
    const type = parseSearchFilter(searchParams.get("type") ?? undefined);
    const typesParam = searchParams.get("types");
    const types = typesParam ? parseSearchTypes(typesParam) : searchFilterToEntityTypes(type);
    const cursor = searchParams.get("cursor");
    const limit = searchParams.get("limit");

    const page = await getSearchPage({ q, types, cursor, limit: limit ? Number(limit) : undefined });

    return NextResponse.json(page, {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to search";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
