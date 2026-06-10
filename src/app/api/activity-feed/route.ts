import { NextResponse } from "next/server";
import { parseActivityFeedFilter, parseActivityFeedLimit } from "@/lib/activityFeed";
import { getActivityFeedPage } from "@/lib/queries/activityFeed";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const feed = parseActivityFeedFilter(searchParams.get("feed") ?? undefined);
    const cursor = searchParams.get("cursor");
    const limit = parseActivityFeedLimit(searchParams.get("limit"));

    const page = await getActivityFeedPage({ feed, cursor, limit });
    return NextResponse.json(page);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load activity feed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
