import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/server/supabaseServer";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file");
    const entity = String(formData.get("entity") ?? "misc");
    if (!(file instanceof File)) return NextResponse.json({ error: "file required" }, { status: 400 });
    if (!ALLOWED.has(file.type)) return NextResponse.json({ error: "Unsupported image type" }, { status: 400 });

    const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "bin";
    const path = `${entity}/${user.id}/${randomUUID()}.${ext}`;
    const bytes = await file.arrayBuffer();
    const { error } = await supabase.storage.from("metagard-images").upload(path, bytes, {
      contentType: file.type,
      upsert: false,
    });
    if (error) throw error;

    const { data } = supabase.storage.from("metagard-images").getPublicUrl(path);
    return NextResponse.json({ publicUrl: data.publicUrl });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
