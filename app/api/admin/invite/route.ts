import { NextRequest, NextResponse } from "next/server";
import { currentRole } from "@/lib/server";
import { adminDb, tokenHash } from "@/lib/admin-supabase";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { user, role } = await currentRole();
    if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    if (role !== "admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)),
      b => b.toString(16).padStart(2, "0")).join("");
    const hash = await tokenHash(token);
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const db = adminDb();
    const { error } = await db.from("technician_invites").insert({
      token_hash: hash, created_by: user.id, expires_at: expires
    });
    if (error) {
      console.error("Invite insert failed:", { code: error.code, message: error.message });
      if (error.code === "42P01" || error.code === "PGRST205") {
        return NextResponse.json({ error: "The technician_invites table was not found. Run migration 002 in the AV Select Supabase project." }, { status: 500 });
      }
      if (error.code === "42501") {
        return NextResponse.json({ error: "Supabase denied access. Check that SUPABASE_SECRET_KEY is a server-side secret, not a publishable key." }, { status: 500 });
      }
      if (error.code === "23503") {
        return NextResponse.json({ error: "The administrator does not have a matching profile record in Supabase." }, { status: 500 });
      }
      return NextResponse.json({ error: "Supabase failed to save the invitation (code: " + (error.code || "unknown") + "). Check Cloudflare runtime logs." }, { status: 500 });
    }

    const url = new URL(request.url);
    const inviteUrl = url.origin + "/invite?token=" + token;
    return NextResponse.json({ inviteUrl, expiresAt: expires }, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (err) {
    console.error("Create invite:", err);
    return NextResponse.json({ error: "Invitation failed on the server. Check the Cloudflare runtime logs for details." }, { status: 500 });
  }
}
