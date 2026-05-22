import { NextResponse } from "next/server";
import { normalizeBuildIdsFromBody, normalizePositiveIntId } from "@/lib/buildGroups/normalizeIds";
import { createClient } from "@/lib/server/supabaseServer";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json()) as {
      name?: string;
      description?: string | null;
      buildIds?: number[];
    };
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

    const buildIds = normalizeBuildIdsFromBody(body.buildIds);

    const { data, error } = await supabase
      .from("build_groups")
      .insert({ owner_id: user.id, name, description: body.description ?? null })
      .select("id")
      .single();
    if (error) throw error;

    const groupId = data.id as number;
    if (buildIds.length > 0) {
      const { data: existing, error: lookupError } = await supabase
        .from("builds")
        .select("id")
        .in("id", buildIds);
      if (lookupError) throw lookupError;

      const validIds = new Set<number>();
      for (const row of (existing ?? []) as Array<{ id: unknown }>) {
        const id = normalizePositiveIntId(row.id);
        if (id != null) validIds.add(id);
      }
      const rows = buildIds
        .filter((id) => validIds.has(id))
        .map((build_id) => ({ build_group_id: groupId, build_id }));
      if (rows.length === 0) {
        return NextResponse.json(
          { error: "None of the selected builds could be linked. Check that the builds exist and are readable." },
          { status: 400 }
        );
      }
      const { error: linkError } = await supabase.from("build_group_builds").insert(rows);
      if (linkError) throw linkError;
    }

    return NextResponse.json({ id: groupId });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
