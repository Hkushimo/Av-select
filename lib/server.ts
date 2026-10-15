import { createServerClient } from "@supabase/ssr";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { cookies } from "next/headers";

type CookieToSet = {
  name: string;
  value: string;
  options?: import("@supabase/ssr").CookieOptions;
};

function supabaseConfig() {
  // Cloudflare Worker variables are exposed through Worker bindings at request time.
  // In local Next.js development, standard process.env values are used instead.
  let bindings: Record<string, unknown> = {};
  try {
    bindings = getCloudflareContext().env as unknown as Record<string, unknown>;
  } catch {
    // Not running inside Cloudflare, e.g. in local development.
  }
  const url = (bindings.NEXT_PUBLIC_SUPABASE_URL as string | undefined)
    || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = (bindings.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string | undefined)
    || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase configuration in Cloudflare Worker runtime variables");
  }
  return { url, key };
}

export async function serverDb() {
  const store = await cookies();
  const { url, key } = supabaseConfig();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(items: CookieToSet[]) {
        try {
          items.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Server Components cannot always write cookies.
        }
      },
    },
  });
}

export async function currentRole() {
  const db = await serverDb();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { db, user: null, role: null };
  const { data } = await db.from("profiles")
    .select("role").eq("id", user.id).maybeSingle();
  return { db, user, role: data?.role ?? null };
}
