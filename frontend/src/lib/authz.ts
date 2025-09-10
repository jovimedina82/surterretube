// src/lib/authz.ts
import { headers } from "next/headers";

function inferOriginFrom(reqUrl: string) {
  const url = new URL(reqUrl);
  // Prefer reverse-proxy headers if present
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host  = h.get("x-forwarded-host")  ?? h.get("host") ?? url.host;
  return `${proto}://${host}`;
}

/**
 * Throws 401 Response if not authorized.
 * Works by calling your existing /api/admin/authz route with the incoming Cookie.
 */
export async function requireAdmin(req: Request): Promise<void> {
  const origin = inferOriginFrom(req.url);
  const cookie = req.headers.get("cookie") ?? "";

  const res = await fetch(`${origin}/api/admin/authz`, {
    method: "GET",
    headers: { cookie },
    // Don’t cache auth checks
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Response("Unauthorized", { status: 401 });
  }
}
