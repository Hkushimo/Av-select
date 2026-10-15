import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { currentRole } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serverSecrets() {
  let bindings: Record<string, unknown> = {};
  try { bindings = getCloudflareContext().env as unknown as Record<string, unknown>; } catch {}
  const url = (bindings.NEXT_PUBLIC_SUPABASE_URL as string | undefined) || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = (bindings.SUPABASE_SECRET_KEY as string | undefined) || process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error("Server-side Supabase invitation credentials are not configured.");
  return { url, secret };
}

export async function POST(request: NextRequest) {
  try {
    const { user, role } = await currentRole();
    if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    if (role !== "admin") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });

    const { email: submitted } = await request.json() as { email?: unknown };
    if (typeof submitted !== "string") return NextResponse.json({ error: "Enter an email address." }, { status: 400 });
    const email = submitted.trim().toLowerCase();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const { url, secret } = serverSecrets();
    const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: existing, error: lookupError } = await admin.from("profiles")
      .select("id, role").eq("email", email).maybeSingle();
    if (lookupError) throw lookupError;
    if (existing) return NextResponse.json({ error: "This email already has an AV Select account." }, { status: 409 });

    // Never trust request-supplied redirect URLs. Use the deployment's own origin.
    const origin = new URL(request.url).origin;
    const { data, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: origin + "/invite",
    });
    if (inviteError) return NextResponse.json({ error: inviteError.message }, { status: 400 });
    if (!data.user) throw new Error("Supabase did not return the invited user.");

    const { error: profileError } = await admin.from("profiles")
      .upsert({ id: data.user.id, email, role: "technician" }, { onConflict: "id" });
    if (profileError) throw new Error("The invitation was sent, but the technician profile could not be created. Contact support before retrying.");

    return NextResponse.json({ message: "Invitation email sent to " + email });
  } catch (error) {
    console.error("Admin invite failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to send invitation." }, { status: 500 });
  }
}
