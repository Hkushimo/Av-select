import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentRole } from "@/lib/server";
import TechnicianAvatar from "../../technician-avatar";
import RatingEditor from "./rating-editor";
import {formatPhone} from "@/lib/phone";

type Props = { params: Promise<{ id: string }> };

export default async function TechnicianDetails({ params }: Props) {
  const { db, user, role } = await currentRole();
  if (!user) redirect("/login");
  if (role !== "admin") redirect("/");

  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();

  const [{ data: technician, error: techError }, { data: account }, { data: ratings }] = await Promise.all([
    db.from("technicians").select("user_id,full_name,phone,city,travel,roles,equipment,other_skills,completed_at,avatar_path").eq("user_id", id).maybeSingle(),
    db.from("profiles").select("email").eq("id", id).maybeSingle(),
    db.from("skill_ratings").select("skill,level,updated_at").eq("technician_id", id).order("skill"),
  ]);
  if (techError) throw new Error("Could not load technician profile.");
  if (!technician) notFound();

  const displayName = technician.full_name?.trim() || "Incomplete profile";
  const prettyTravel: Record<string,string> = {
    local: "Local only", regional: "Regional / nearby states",
    national: "Nationwide", international: "International",
  };

  return <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 space-y-5">
    <Link href="/admin" className="text-sm text-blue-300 inline-flex py-2">← Back to roster</Link>
    <header className="panel flex items-start gap-4">
      <TechnicianAvatar path={technician.avatar_path} name={displayName} size="lg"/>
      <div className="min-w-0">
        <p className="text-blue-400 text-xs font-bold tracking-[.2em]">TECHNICIAN PROFILE</p>
        <h1 className="text-2xl sm:text-3xl font-bold mt-1 break-words">{displayName}</h1>
        <p className="muted text-sm mt-1">{technician.city || "Location not provided"}</p>
        <p className="text-xs mt-2 text-blue-300">{technician.completed_at ? "Onboarding complete" : "Onboarding incomplete"}</p>
      </div>
    </header>

    <div className="grid gap-4 sm:grid-cols-2">
      <section className="panel space-y-3">
        <h2 className="text-lg font-semibold">Contact</h2>
        <div><p className="label">Email</p>{account?.email ? <a className="text-blue-300 break-all underline" href={`mailto:${account.email}`}>{account.email}</a> : <p className="muted">Not available</p>}</div>
        <div><p className="label">Phone</p>{technician.phone ? <a className="text-blue-300 underline" href={`tel:${technician.phone.replace(/[^\d+]/g,"")}`}>{formatPhone(technician.phone)}</a> : <p className="muted">Not provided</p>}</div>
        <div><p className="label">City / state</p><p>{technician.city || "Not provided"}</p></div>
      </section>
      <section className="panel space-y-3">
        <h2 className="text-lg font-semibold">Travel preference</h2>
        <p>{prettyTravel[technician.travel] || technician.travel || "Not provided"}</p>
        <p className="muted text-xs">Self-reported by the technician</p>
      </section>
    </div>

    <section className="panel space-y-3">
      <h2 className="text-lg font-semibold">Positions</h2>
      {technician.roles?.length ? <div className="flex flex-wrap gap-2">{technician.roles.map((item:string)=><span className="pill" key={item}>{item}</span>)}</div> : <p className="muted">No positions selected</p>}
      <p className="muted text-xs">Position selections are self-reported, not verified skill ratings.</p>
    </section>

    <section className="panel space-y-3">
      <h2 className="text-lg font-semibold">Equipment familiarity</h2>
      {technician.equipment?.length ? <div className="flex flex-wrap gap-2">{technician.equipment.map((item:string)=><span className="pill" key={item}>{item}</span>)}</div> : <p className="muted">No equipment selected</p>}
      {!!technician.other_skills && <div className="pt-2"><p className="label">Other equipment / specialties</p><p className="whitespace-pre-wrap break-words">{technician.other_skills}</p></div>}
    </section>

    <RatingEditor technicianId={id} initialRatings={ratings || []} suggestions={[...(technician.roles || []),...(technician.equipment || [])]} />
  </main>;
}
