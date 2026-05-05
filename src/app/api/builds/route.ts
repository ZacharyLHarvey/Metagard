import { NextResponse } from "next/server";
import { createBuild } from "@/lib/queries/spellbook";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      className?: string;
      level?: number;
      lookThePart?: boolean;
    };

    if (!body.name || !body.className || !body.level) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const id = await createBuild({
      name: body.name,
      className: body.className,
      level: body.level,
      lookThePart: Boolean(body.lookThePart),
    });

    return NextResponse.json({ id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create build";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
