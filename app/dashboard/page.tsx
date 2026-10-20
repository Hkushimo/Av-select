import PageHeading from "@/app/page-heading";
import Breadcrumbs from "@/app/admin/breadcrumbs";
import Link from "next/link";
import {redirect} from "next/navigation";
import {currentRole} from "@/lib/server";
import AppIcon from "@/app/app-icon";
import {estimateOfferPayout} from "@/lib/payout-estimate";
import {displayOfferRate} from "@/lib/invoicing";

type Job={title:string;venue:string;starts_at:string;ends_at:string|null;rate:string;rate_basis:"hourly"|"day";details:string;status:string};
export default async function TechnicianDashboard(){
 const {db,user,role}=await currentRole();
 if(!user)redirect("/login");
 if(role==="admin")redirect("/admin");
 if(role!=="technician")redirect("/");
 const [{data:profile,error:profileError},{data:offers,error:offersError}]=await Promise.all([
  db.from("technicians").select("full_name,completed_at").eq("user_id",user.id).maybeSingle(),
  db.from("job_offers").select("id,status,offer_rate,jobs(title,venue,starts_at,ends_at,rate,rate_basis,details,status)")
   .eq("technician_id",user.id).in("status",["pending","accepted","confirmed"])
 ]);
 if(!profile?.completed_at&&!profileError)redirect("/onboarding");
 const pending=offers?.filter(o=>o.status==="pending")||[];
 const accepted=offers?.filter(o=>o.status==="accepted"||o.status==="confirmed")||[];
 const now=Date.now();
 const upcoming=accepted.map(o=>({id:o.id,status:o.status,offer_rate:o.offer_rate||"",job:o.jobs as unknown as Job|null}))
  .filter(o=>o.job?.starts_at&&new Date(o.job.ends_at||o.job.starts_at).getTime()>=now)
  .sort((a,b)=>new Date(a.job!.starts_at).getTime()-new Date(b.job!.starts_at).getTime())[0];
 const estimate=upcoming?estimateOfferPayout(upcoming.job,upcoming.offer_rate):null;
 const firstName=profile?.full_name?.trim().split(/\s+/)[0];
 const date=(value:string)=>new Date(value).toLocaleString("en-US",{dateStyle:"medium",timeStyle:"short"});
 return <main className="mx-auto max-w-3xl px-4 py-6 space-y-5">
  <Breadcrumbs items={[{label:"Dashboard"}]}/>
  <PageHeading eyebrow="Technician dashboard" title={<>Welcome back{firstName?", "+firstName:""}!</>} description="Here's what's happening with your work."/>
  {(profileError||offersError)&&<p role="alert" className="text-red-300 text-sm">Some dashboard information could not load. {profileError?.message||offersError?.message}</p>}
  <div className="grid grid-cols-2 gap-3">
   <Link href="/offers" className="panel !p-4 space-y-2 block hover:border-blue-500">
    <AppIcon name="activity" size={22} className="text-blue-300"/>
    <p className="text-3xl font-bold">{pending.length}</p>
    <p className="muted text-sm">Pending offers</p>
   </Link>
   <Link href="/offers" className="panel !p-4 space-y-2 block hover:border-blue-500">
    <AppIcon name="calendar" size={22} className="text-blue-300"/>
    <p className="text-3xl font-bold">{accepted.length}</p>
    <p className="muted text-sm">Accepted & booked</p>
   </Link>
  </div>
  <section className="panel space-y-3">
   <div className="flex items-center justify-between gap-2">
    <h2 className="text-lg font-semibold">Next upcoming job</h2>
    <Link href="/offers" className="text-blue-300 text-xs shrink-0">My Schedule →</Link>
   </div>
   {upcoming?.job?<div className="space-y-2 border-t border-slate-700 pt-3">
    <h3 className="font-semibold text-lg">{upcoming.job.title}</h3>
    <p className="muted text-sm">{date(upcoming.job.starts_at)}{upcoming.job.ends_at?" – "+date(upcoming.job.ends_at):""}</p>
    <p className="muted text-sm">{upcoming.job.venue||"Venue TBD"}</p>
    {(upcoming.offer_rate||upcoming.job.rate)&&<p className="text-sm muted">Your rate · {displayOfferRate(upcoming.offer_rate||upcoming.job.rate,upcoming.job.rate_basis==="day"?"day":"hourly")}</p>}
    {estimate&&<div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-3 space-y-1">
     <p className="text-xs text-emerald-200">Estimated payout</p>
     <p className="text-xl font-bold text-green-300 tabular-nums">{estimate.label}</p>
     <p className="muted text-xs">Based on {estimate.scheduledHours.toFixed(2)} scheduled hours · Before lunch or schedule adjustments</p>
    </div>}
    <p className={upcoming.status==="confirmed"?"text-xs text-green-300":"text-xs text-blue-300"}>{upcoming.status==="confirmed"?"Booked · Confirmed":"Accepted · Awaiting staffing confirmation"}</p>
   </div>:<p className="muted text-sm">No upcoming accepted jobs yet. Check My Schedule for new offers.</p>}
  </section>
  <Link href="/profile" className="panel flex items-center justify-between gap-3 hover:border-blue-500">
   <div><h2 className="font-semibold">My profile</h2><p className="muted text-sm mt-1">Manage your contact details, positions, and equipment.</p></div>
   <AppIcon name="chevron-right" className="text-blue-300" size={22}/>
  </Link>
 </main>;
}
