import { NextRequest, NextResponse } from "next/server";
import { adminDb, tokenHash } from "@/lib/admin-supabase";

export const dynamic = "force-dynamic";

function validToken(token: string | null): token is string {
  return !!token && /^[a-f0-9]{64}$/.test(token);
}

export async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get("token");
  if (!validToken(token)) return NextResponse.json({ valid: false }, { headers: { "Cache-Control": "no-store" } });
  try {
    const db = adminDb();
    const { data, error } = await db.from("technician_invites")
      .select("expires_at,claimed_at").eq("token_hash", await tokenHash(token)).maybeSingle();
    if (error) throw error;
    return NextResponse.json({ valid: !!data && !data.claimed_at && new Date(data.expires_at).getTime() > Date.now() },
      { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ valid: false, error: "Invite validation unavailable." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { token, email, password } = await request.json() as { token?: unknown; email?: unknown; password?: unknown };
    if (typeof token !== "string" || !validToken(token)
      || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.length > 254
      || typeof password !== "string" || password.length < 10 || password.length > 256) {
      return NextResponse.json({ error: "Enter a valid email, password (10+ characters), and invitation link." }, { status: 400 });
    }
    const db = adminDb();
    const hash = await tokenHash(token);
    const { data: invite, error: findError } = await db.from("technician_invites")
      .select("token_hash,expires_at,claimed_at").eq("token_hash", hash).maybeSingle();
    if (findError) throw findError;
    if (!invite || invite.claimed_at || new Date(invite.expires_at).getTime() <= Date.now()) {
      return NextResponse.json({ error: "This invitation is expired or already used." }, { status: 410 });
    }

    // Atomically reserve the token. Exactly one concurrent request may claim it.
    const { data: reserved, error: reserveError } = await db.from("technician_invites")
      .update({ claimed_at: new Date().toISOString() })
      .eq("token_hash", hash).is("claimed_at", null).gt("expires_at", new Date().toISOString())
      .select("token_hash").maybeSingle();
    if (reserveError) throw reserveError;
    if (!reserved) return NextResponse.json({ error: "Invitation already used." }, { status: 410 });

    const normalized = email.trim().toLowerCase();
    const { data: created, error: createError } = await db.auth.admin.createUser({
      email: normalized, password, email_confirm: true,
    });
    if (createError || !created.user) {
      await db.from("technician_invites").update({ claimed_at: null }).eq("token_hash", hash).is("claimed_by", null);
      return NextResponse.json({ error: createError?.message || "Could not create account." }, { status: 400 });
    }

    const { error: profileError } = await db.from("profiles").insert({
      id: created.user.id, email: normalized, role: "technician"
    });
    if (profileError) {
      await db.auth.admin.deleteUser(created.user.id);
      await db.from("technician_invites").update({ claimed_at: null }).eq("token_hash", hash).is("claimed_by", null);
      throw profileError;
    }
    await db.from("technician_invites").update({ claimed_by: created.user.id }).eq("token_hash", hash);
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("Redeem invitation:", err);
    return NextResponse.json({ error: "Unable to accept invitation. Please try again." }, { status: 500 });
  }
}
