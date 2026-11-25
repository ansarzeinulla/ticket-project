import { NextResponse } from "next/server";

import { apiBaseURL, clearToken, readToken } from "@/lib/server-session";

/**
 * Who is signed in.
 *
 * This is how the browser learns about its own session now that it cannot read
 * the token: it asks, and the server answers from the cookie.
 */
export async function GET() {
  const token = await readToken();
  // A visitor with no session is not an error, just nobody: answering 200
  // keeps every guest page free of a red 401 in the browser console (BF-100).
  if (!token) {
    return NextResponse.json({ user: null });
  }

  const upstream = await fetch(`${apiBaseURL()}/auth/me`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  });

  if (upstream.status === 401 || upstream.status === 403) {
    // The cookie outlived the token it names - expired, revoked, or the
    // account was suspended (403). Clearing it here means the next request is
    // a clean anonymous one; without this a suspended user bounced between
    // /dashboard and /login forever, because proxy.ts still saw the cookie.
    await clearToken();
  }

  const payload = await upstream.json().catch(() => null);
  return NextResponse.json(payload, { status: upstream.status });
}
