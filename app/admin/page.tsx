import TechnicianAvatar from "./technician-avatar";
import InviteForm from "./invite-form";
import { currentRole } from "@/lib/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Admin() {
  const { db, user, role } = await currentRole();
  if (!user) redirect("/login");
  if (role !== "admin") redirect("/");
  const [{ data: techs }, { data: ratings }, { data: jobs }] = await Promise.all([
    db.from("technicians").select("user_id,full_name,city,roles,equipment,completed_at,avatar_path").order("full_name"),
    db.from("skill_ratings").select("technician_id,skill,level"),
    db.from("jobs").select("id,title,status,starts_at").order("starts_at", { ascending: false }).limit(8),
  ]);
  return <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 space-y-6 sm:space-y-8">
    <header className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="tracking-[.22em] text-blue-400 font-bold text-xs sm:text-sm">AV SELECT · ADMIN</p>
        <h1 className="text-2xl sm:text-4xl font-bold mt-2 leading-tight">Technician roster</h1>
      </div>
      <Link href="/admin/jobs" className="pill text-center sm:shrink-0">Manage jobs →</Link>
    </header>
    <InviteForm/>
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      <div className="panel !p-3 sm:!p-5"><p className="muted text-xs sm:text-base">Technicians</p><p className="text-2xl sm:text-4xl font-bold mt-1">{techs?.length ?? 0}</p></div>
      <div className="panel !p-3 sm:!p-5"><p className="muted text-xs sm:text-base">Skill ratings</p><p className="text-2xl sm:text-4xl font-bold mt-1">{ratings?.length ?? 0}</p></div>
      <div className="panel !p-3 sm:!p-5"><p className="muted text-xs sm:text-base">Recent jobs</p><p className="text-2xl sm:text-4xl font-bold mt-1">{jobs?.length ?? 0}</p></div>
    </div>
    <section className="panel space-y-4">
      <h2 className="text-lg sm:text-xl font-bold">Private roster</h2>
      {!techs?.length ? <p className="muted text-sm">No technicians yet. Generate a link above to invite your first technician.</p> :
        techs.map(t => <Link key={t.user_id} href={`/admin/technicians/${t.user_id}`}
          className="block border-t border-slate-700 py-4 px-2 -mx-2 rounded-lg hover:bg-slate-800/60 focus-visible:outline-2 focus-visible:outline-blue-400 transition-colors"
          aria-label={`View ${t.full_name || "technician"} profile`}>
          <div className="flex items-center gap-3">
            <TechnicianAvatar path={t.avatar_path} name={t.full_name || "Technician"}/>
            <div className="min-w-0 flex-1">
              <div className="font-bold break-words">{t.full_name || "Incomplete profile"}</div>
              <p className="muted text-sm mt-1 break-words">{t.city || "Location not provided"} · {t.roles?.slice(0,2).join(", ") || "No positions yet"}</p>
            </div>
            <span className="text-blue-300 text-xl shrink-0" aria-hidden="true">›</span>
          </div>
          <p className="text-xs text-blue-300 mt-2">View full profile →</p>
        </Link>)}
    </section>
  </main>;
}
