import TechnicianAvatar from "./technician-avatar";
import InviteForm from "./invite-form";
import { currentRole } from "@/lib/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Admin() {
  const { db, user, role } = await currentRole();
  if (!user) redirect("/login");
  if (role !== "admin") redirect("/");

  const [{ data: techs }, { count: ratingCount }, { count: jobCount }] = await Promise.all([
    db.from("technicians").select("user_id,full_name,city,roles,avatar_path").order("full_name"),
    db.from("skill_ratings").select("id", { count: "exact", head: true }),
    db.from("jobs").select("id", { count: "exact", head: true }),
  ]);

  return <main className="mx-auto max-w-5xl px-4 py-5 sm:px-6 space-y-5">
    <header className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs tracking-[.16em] text-blue-400 font-semibold">ADMIN</p>
        <h1 className="text-2xl sm:text-3xl font-bold mt-1">Your crew</h1>
      </div>
      <Link href="/admin/jobs" className="pill shrink-0 text-blue-200">Jobs →</Link>
    </header>

    <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm muted border-b border-slate-800 pb-4">
      <span><strong className="text-white">{techs?.length ?? 0}</strong> technicians</span>
      <span><strong className="text-white">{ratingCount ?? 0}</strong> ratings</span>
      <span><strong className="text-white">{jobCount ?? 0}</strong> jobs</span>
    </div>

    <InviteForm/>

    <section className="space-y-3" aria-label="Technician roster">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Technician roster</h2>
        <span className="text-xs muted">{techs?.length ?? 0} people</span>
      </div>
      <div className="rounded-2xl border border-slate-700/70 bg-[#121a29] px-3 sm:px-4">
        {!techs?.length ? <p className="muted text-sm py-6">No technicians yet. Use Invite above to add your first person.</p> :
          techs.map((t, index) => <Link
            key={t.user_id}
            href={`/admin/technicians/${t.user_id}`}
            className={`flex items-center gap-3 py-3.5 rounded-lg hover:bg-slate-800/60 focus-visible:outline-2 focus-visible:outline-blue-400 ${index ? "border-t border-slate-700/70" : ""}`}
            aria-label={`View ${t.full_name || "technician"} profile`}
          >
            <TechnicianAvatar path={t.avatar_path} name={t.full_name || "Technician"} />
            <div className="min-w-0 flex-1">
              <div className="font-semibold truncate">{t.full_name || "Incomplete profile"}</div>
              <div className="muted text-xs sm:text-sm mt-0.5 truncate">
                {[t.city, t.roles?.[0]].filter(Boolean).join(" · ") || "Profile incomplete"}
              </div>
            </div>
            <span aria-hidden="true" className="text-blue-300 text-xl pr-1">›</span>
          </Link>)}
      </div>
    </section>
  </main>;
}
