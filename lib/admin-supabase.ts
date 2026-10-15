import { createClient } from "@supabase/supabase-js";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export function adminDb() {
  let bindings: Record<string, unknown> = {};
  try { bindings = getCloudflareContext().env as unknown as Record<string, unknown>; } catch {}
  const url = (bindings.NEXT_PUBLIC_SUPABASE_URL as string | undefined) || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = (bindings.SUPABASE_SECRET_KEY as string | undefined) || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Missing Supabase server credentials");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function tokenHash(token: string) {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}
