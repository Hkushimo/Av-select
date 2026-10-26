import PageHeading from "@/app/page-heading";
import InviteForm from "./invite-form";
import RosterFilters from "./roster-filters";
import { currentRole } from "@/lib/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import DispatchOverview,{RecentInvoices} from "./dispatch-overview";

export default async function Admin(){
 const {db,user,role}=await currentRole();
 if(!user)redirect("/login");
 if(role!=="admin")redirect("/");
 const now=Date.now(),since=new Date(now-86400000).toISOString(),instant=new Date(now).toISOString();
 const [{data:techs,error:techError},{data:ratings,error:ratingsError},{data:jobs,error:jobsError},{data:invoices,error:invoiceError}]=await Promise.all([
  db.from("technicians").select("user_id,full_name,city,state,travel,roles,equipment,avatar_path").order("full_name"),
  db.from("skill_ratings").select("technician_id,skill,level"),
  db.from("jobs").select("id,title,venue,starts_at,ends_at,time_zone,status,job_offers(status)")
   .in("status",["open","draft"]).or(`ends_at.gt.${instant},and(ends_at.is.null,starts_at.gt.${since})`).order("starts_at").limit(51),
  db.from("technician_invoices").select("id,invoice_number,from_name,job_title,issued_on,total,billed_total").order("created_at",{ascending:false}).limit(5),
 ]);
 return <main className="mx-auto max-w-5xl px-4 py-5 sm:px-6 space-y-5">
  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
   <PageHeading eyebrow="Dispatch" title="Your staffing desk" description={!jobsError&&!jobs?.length?"Ready for your next show. Create a job to get started.":"Review responses and keep your next call moving."}/>
   <div className="flex flex-wrap gap-2 sm:shrink-0"><Link className="primary inline-flex min-h-11 items-center text-sm" href="/admin/jobs">{!jobsError&&!jobs?.length?"Create a job":"Manage jobs"}</Link><a href="#your-crew" className="pill inline-flex min-h-11 items-center">Find a technician ↓</a></div>
  </div>
  <DispatchOverview jobs={(jobs||[]).slice(0,50)} now={now} loadError={!!jobsError} truncated={(jobs?.length||0)>50}/>
  <section id="your-crew" className="space-y-4 border-t border-slate-700 pt-6 scroll-mt-24">
  <h2 className="text-xl font-bold">Your crew</h2>
  <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm muted border-b border-slate-800 pb-4">
   <span><strong className="text-white">{techs?.length??0}</strong> technicians</span>
   <span><strong className="text-white">{ratings?.length??0}</strong> ratings</span>
  </div>
  <InviteForm/>
  {techError||ratingsError?<p role="alert" className="text-red-300 text-sm">Unable to load all roster information. {techError?.message||ratingsError?.message}</p>:
   <RosterFilters technicians={techs||[]} ratings={ratings||[]}/>}
  </section>
  <RecentInvoices invoices={invoices||[]} invoiceError={!!invoiceError}/>
 </main>;
}
