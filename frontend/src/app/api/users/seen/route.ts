// src/app/api/users/seen/route.ts
import { NextRequest, NextResponse } from "next/server";
import { upsertUserByEmail } from "@/lib/users";

export const dynamic = "force-dynamic";

function ok(data: any = {}) {
  return NextResponse.json({ ok: true, ...data });
}
function bad(error = "bad_request", status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

/**
 * POST /api/users/seen
 * Body: { name?: string, email: string }
 * Creates the user if missing, otherwise only updates last_seen (and name if changed).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = (body?.name ?? "").toString();
    const email = (body?.email ?? "").toString();

    if (!email) return bad("email_required", 422);

    const user = await upsertUserByEmail(name, email, "azure");
    return ok({ user });
  } catch (e: any) {
    console.error("users/seen error:", e?.message || e);
    return bad("server_error", 500);
  }
}
