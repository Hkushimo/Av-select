import PageHeading from "@/app/page-heading";
import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {currentRole} from "@/lib/server";
import ManageJob from "../manage-job";
import DeleteJob from "../delete-job";
import JobProductionEditor from "../production-editor";
import type {FlowConnection} from "../signal-flow";
import Breadcrumbs from "../../breadcrumbs";

type Props={params:Promise<{id:string}>};
export default async function JobDetails({params}:Props){
 const {db,user,role}=await currentRole();
 if(!user)redirect("/login");if(role!=="admin")redirect("/");
 const {id}=await params;
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))notFound();
 const [{data:job,error},{data:technicians},{data:offers},{data:requirements},{data:ratings}]=await Promise.all([
  db.from("jobs").select("id,title,venue,address,signal_flow,starts_at,ends_at,rate,details,status").eq("id",id).maybeSingle(),
  db.from("technicians").select("user_id,full_name,city,travel,roles,equipment,avatar_path").order("full_name"),
  db.from("job_offers").select("id,technician_id,status").eq("job_id",id).neq("status","declined").order("created_at"),
  db.from("job_requirements").select("skill,min_level,required").eq("job_id",id).order("skill"),
  db.from("skill_ratings").select("technician_id,skill,level")
 ]);
 if(error)throw new Error("Unable to load job.");
 if(!job)notFound();
 const status=job.status==="open"||job.status==="closed"?job.status:"draft";
 const when=(value:string)=>new Date(value).toLocaleString("en-US",{dateStyle:"medium",timeStyle:"short"});
 return <main className="mx-auto max-w-3xl px-4 py-6 space-y-5">
  <Breadcrumbs items={[{label:"Dashboard",href:"/admin"},{label:"Jobs",href:"/admin/jobs"},{label:job.title}]}/>
  <PageHeading eyebrow="Job details" title={job.title} description={job.venue||"Venue TBD"}/>
  <section className="panel space-y-3 text-sm">
   <div><span className="label">Start</span><p>{when(job.starts_at)}</p></div>
   {job.ends_at&&<div><span className="label">End</span><p>{when(job.ends_at)}</p></div>}
   {job.rate&&<div><span className="label">Rate</span><p>{job.rate}</p></div>}
   {job.details&&<div><span className="label">Call details</span><p className="whitespace-pre-wrap break-words">{job.details}</p></div>}
  </section>
  <JobProductionEditor jobId={job.id} initialVenue={job.venue||""} initialAddress={job.address||""} initialFlow={(Array.isArray(job.signal_flow)?job.signal_flow:[]) as FlowConnection[]}/>
  <ManageJob jobId={job.id} initialStatus={status}
    startsAt={job.starts_at} endsAt={job.ends_at} technicians={technicians||[]} ratings={ratings||[]} offers={offers||[]} requirements={requirements||[]}/>
  <DeleteJob jobId={job.id} title={job.title} offerCount={offers?.length||0}/>
 </main>;
}
