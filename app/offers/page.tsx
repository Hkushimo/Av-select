import {currentRole} from "@/lib/server";
import {redirect} from "next/navigation";
import {OfferActions} from "./responses";
import MarkActivitySeen from "@/app/mark-activity-seen";
export default async function Offers(){
 const {db,user,role}=await currentRole();
 if(!user)redirect("/login");
 if(role!=="technician")redirect("/");
 const {data:offers,error}=await db.from("job_offers")
  .select("id,status,jobs(title,venue,starts_at,ends_at,rate,details,status)")
  .eq("technician_id",user.id).order("created_at",{ascending:false});
 return <main className="mx-auto max-w-3xl px-4 py-6 space-y-5">
  {!error&&<MarkActivitySeen userId={user.id} kind="offers"/>}
  <div><p className="tracking-widest text-blue-400 text-xs font-bold">AV SELECT</p><h1 className="text-2xl sm:text-3xl font-bold mt-1">Your job offers</h1></div>
  {error&&<p className="text-red-300">Could not load job offers: {error.message}</p>}
  {!offers?.length&&!error?<div className="panel muted">No job offers yet. You'll see new offers here when an admin sends them.</div>:
   offers?.map(o=>{
    const job=o.jobs as unknown as {title:string;venue:string;starts_at:string;ends_at:string|null;rate:string;details:string;status:string}|null;
    return <article key={o.id} className="panel space-y-3">
     <div className="flex justify-between gap-3 items-start">
      <h2 className="text-xl font-bold">{job?.title||"Job"}</h2>
      <span className="pill text-xs capitalize shrink-0">{o.status}</span>
     </div>
     <p className="muted text-sm">{job?.venue||"Venue TBD"}</p>
     {job?.starts_at&&<p className="text-sm"><span className="muted">Start: </span>{new Date(job.starts_at).toLocaleString("en-US",{dateStyle:"medium",timeStyle:"short"})}</p>}
     {job?.ends_at&&<p className="text-sm"><span className="muted">End: </span>{new Date(job.ends_at).toLocaleString("en-US",{dateStyle:"medium",timeStyle:"short"})}</p>}
     {job?.rate&&<p className="text-sm"><span className="muted">Rate: </span>{job.rate}</p>}
     {job?.details&&<p className="text-sm whitespace-pre-wrap break-words">{job.details}</p>}
     {o.status==="pending"&&<OfferActions id={o.id}/>}
     {o.status==="accepted"&&<p className="text-green-300 text-xs">You accepted this offer. Staffing will be confirmed by the organizer.</p>}
    </article>;
   })}
 </main>;
}
