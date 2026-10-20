import PageHeading from "@/app/page-heading";
import {notFound,redirect} from "next/navigation";
import {currentRole} from "@/lib/server";
import ManageJob from "../manage-job";
import DeleteJob from "../delete-job";
import JobProductionEditor,{JobSignalFlowSection} from "../production-editor";
import type {DepartmentFlow} from "../department-flow";
import Breadcrumbs from "../../breadcrumbs";
import type {RateBasis} from "@/lib/invoicing";
import TechInvoices from "../tech-invoices";

type Props={params:Promise<{id:string}>};
export default async function JobDetails({params}:Props){
 const {db,user,role}=await currentRole();
 if(!user)redirect("/login");if(role!=="admin")redirect("/");
 const {id}=await params;
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))notFound();
 const [{data:job,error},{data:technicians},{data:offers},{data:requirements},{data:ratings}]=await Promise.all([
  db.from("jobs").select("id,title,venue,address,signal_flow,starts_at,ends_at,rate,rate_basis,details,status").eq("id",id).maybeSingle(),
  db.from("technicians").select("user_id,full_name,city,state,travel,roles,equipment,avatar_path").order("full_name"),
  db.from("job_offers").select("id,technician_id,status,offer_position,offer_rate").eq("job_id",id).neq("status","declined").order("created_at"),
  db.from("job_requirements").select("skill,min_level,required").eq("job_id",id).order("skill"),
  db.from("skill_ratings").select("technician_id,skill,level")
 ]);
 if(error)throw new Error("Unable to load job.");
 if(!job)notFound();
 const invoiceResult=await db.from("technician_invoices")
   .select("id,offer_id,invoice_number,from_name,issued_on,total,billed_total")
   .eq("job_id",id);
 const status=job.status==="open"||job.status==="closed"?job.status:"draft";
 return <main className="mx-auto max-w-3xl px-4 py-6 space-y-5">
  <Breadcrumbs items={[{label:"Dashboard",href:"/admin"},{label:"Jobs",href:"/admin/jobs"},{label:job.title}]}/>
  <PageHeading eyebrow="Job details" title={job.title} description={job.venue||"Venue TBD"}/>
  <nav aria-label="Job page sections" className="flex gap-2 flex-wrap text-sm">
   <a className="pill text-blue-300" href="#job-schedule">Schedule</a>
   <a className="pill text-blue-300" href="#job-production">Production</a>
   <a className="pill text-blue-300" href="#job-staffing">Crew & offers</a>
   <a className="pill text-blue-300" href="#job-invoices">Tech invoices</a>
  </nav>
  <ManageJob mode="setup" jobId={job.id} initialStatus={status} rateBasis={(job.rate_basis==="day"?"day":"hourly") as RateBasis}
    startsAt={job.starts_at} endsAt={job.ends_at} technicians={technicians||[]} ratings={ratings||[]} offers={offers||[]} requirements={requirements||[]}/>
  <div id="job-production" className="space-y-3 scroll-mt-24">
   <JobProductionEditor jobId={job.id} initialVenue={job.venue||""} initialAddress={job.address||""}/>
   <section className="panel !p-4 sm:!p-5 space-y-3">
    <h2 className="text-lg font-semibold">Call details</h2>
    {job.rate&&<p className="text-sm"><span className="muted">General pay notes · </span>{job.rate}</p>}
    {job.details?<p className="text-sm whitespace-pre-wrap break-words">{job.details}</p>:<p className="muted text-sm">No call notes added.</p>}
   </section>
   <JobSignalFlowSection jobId={job.id} initialFlows={(Array.isArray(job.signal_flow)?job.signal_flow:[]) as DepartmentFlow[]}/>
  </div>
  <ManageJob mode="staffing" jobId={job.id} initialStatus={status} rateBasis={(job.rate_basis==="day"?"day":"hourly") as RateBasis}
    startsAt={job.starts_at} endsAt={job.ends_at} technicians={technicians||[]} ratings={ratings||[]} offers={offers||[]} requirements={requirements||[]}/>
  <TechInvoices offers={offers||[]} technicians={technicians||[]}
   invoices={invoiceResult.data||[]} loadError={!!invoiceResult.error}/>
  <DeleteJob jobId={job.id} title={job.title} offerCount={offers?.length||0}/>
 </main>;
}
