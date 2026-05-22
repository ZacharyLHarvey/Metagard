import { NextResponse } from "next/server";
import { normalizeBuildIdsFromBody, normalizePositiveIntId } from "@/lib/buildGroups/normalizeIds";
import { createClient } from "@/lib/server/supabaseServer";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Params) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    const groupId = Number(id);

    const { data: group } = await supabase
      .from("build_groups")
      .select("id")
      .eq("id", groupId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (!group) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = (await request.json()) as { buildIds?: number[] };
    const buildIds = normalizeBuildIdsFromBody(body.buildIds);

    const { error: deleteError } = await supabase
      .from("build_group_builds")
      .delete()
      .eq("build_group_id", groupId);
    if (deleteError) throw deleteError;

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
        .filter((bid) => validIds.has(bid))
        .map((build_id) => ({ build_group_id: groupId, build_id }));
      if (rows.length === 0) {
        return NextResponse.json(
          { error: "None of the selected builds could be linked. Check that the builds exist and are readable." },
          { status: 400 }
        );
      }
      const { error: insertError } = await supabase.from("build_group_builds").insert(rows);
      if (insertError) throw insertError;
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update builds";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
