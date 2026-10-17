import PageHeading from "@/app/page-heading";
import {currentRole} from "@/lib/server";
import {redirect} from "next/navigation";
import Link from "next/link";
import Breadcrumbs from "../breadcrumbs";
import JobCreate from "./create-job";

export default async function Jobs(){
 const {db,user,role}=await currentRole();
 if(!user)redirect("/login");if(role!=="admin")redirect("/");
 const {data:jobs,error}=await db.from("jobs").select("id,title,venue,starts_at,ends_at,status,rate").order("starts_at",{ascending:false});
 return <main className="mx-auto max-w-4xl px-4 py-6 space-y-5">
  <Breadcrumbs items={[{label:"Dashboard",href:"/admin"},{label:"Jobs"}]}/>
  <PageHeading eyebrow="Staffing" title="Jobs"/>
  <JobCreate/>
  <section className="space-y-3">
   <h2 className="font-semibold text-lg">Your jobs <span className="muted text-sm">({jobs?.length??0})</span></h2>
   {error&&<p className="text-red-300 text-sm">Could not load jobs: {error.message}</p>}
   {!jobs?.length&&!error?<p className="muted panel">No jobs yet. Create your first job above.</p>:
    <div className="rounded-xl overflow-hidden border border-slate-700 bg-[#121a29]">
     {jobs?.map((job,i)=><Link href={`/admin/jobs/${job.id}`} key={job.id}
       className={`block p-4 hover:bg-slate-800/60 ${i?"border-t border-slate-700":""}`}>
       <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold break-words">{job.title}</h3>
        <span className="text-xs capitalize rounded-full border border-slate-600 px-2 py-1 shrink-0">{job.status}</span>
       </div>
       <p className="muted text-sm mt-1">{job.venue||"Venue TBD"}</p>
       <p className="muted text-xs mt-1">{new Date(job.starts_at).toLocaleString("en-US",{dateStyle:"medium",timeStyle:"short"})}{job.rate?" · "+job.rate:""}</p>
       <p className="text-blue-300 text-xs mt-2">View job & staff →</p>
      </Link>)}
    </div>}
  </section>
 </main>;
}
