import InviteForm from "./invite-form";
import { currentRole } from "@/lib/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Admin() {
  const { db, user, role } = await currentRole();
  if (!user) redirect("/login");
  if (role !== "admin") redirect("/");
  const [{ data: techs }, { data: ratings }, { data: jobs }] = await Promise.all([
    db.from("technicians").select("user_id,full_name,city,roles,equipment,completed_at").order("full_name"),
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
        techs.map(t => <div key={t.user_id} className="border-t border-slate-700 py-4">
          <div className="font-bold">{t.full_name || "Incomplete profile"}</div>
          <p className="muted text-sm mt-1">{t.city} · {t.roles?.join(", ")}</p>
          <p className="text-sm mt-2 break-words">Equipment: {t.equipment?.join(", ") || "Not provided"}</p>
          <p className="text-sm text-blue-300 mt-1 break-words">Admin ratings: {ratings?.filter(r => r.technician_id === t.user_id).map(r => r.skill + " " + r.level + "/5").join(" · ") || "Unrated"}</p>
        </div>)}
    </section>
  </main>;
}
