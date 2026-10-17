import PageHeading from "@/app/page-heading";
import Link from "next/link";
import {redirect} from "next/navigation";
import {currentRole} from "@/lib/server";
import MarkActivitySeen from "@/app/mark-activity-seen";
import Breadcrumbs from "../breadcrumbs";

export default async function AdminActivity(){
 const {db,user,role}=await currentRole();
 if(!user)redirect("/login");
 if(role!=="admin")redirect("/");
 const {data:activity,error}=await db.from("job_offers")
  .select("id,status,responded_at,technician_id,jobs(id,title)")
  .in("status",["accepted","confirmed"]).not("responded_at","is",null)
  .order("responded_at",{ascending:false}).limit(100);
 const ids=Array.from(new Set((activity||[]).map(o=>o.technician_id)));
 const {data:people}=ids.length?await db.from("technicians").select("user_id,full_name").in("user_id",ids):{data:[] as {user_id:string;full_name:string}[]};
 const names=new Map((people||[]).map(p=>[p.user_id,p.full_name]));
 return <main className="mx-auto max-w-3xl px-4 py-6 space-y-5">
  <Breadcrumbs items={[{label:"Dashboard",href:"/admin"},{label:"Activity"}]}/>
  <PageHeading eyebrow="Admin" title="Job activity" description="Recent accepted offers. Declined offers are removed automatically. Viewing this page clears your unread badge."/>
  {!error&&<MarkActivitySeen userId={user.id} kind="responses"/>}
  {error?<p role="alert" className="text-red-300">{error.message}</p>:
   !activity?.length?<div className="panel muted">No technician responses yet.</div>:
   <section className="rounded-xl border border-slate-700 bg-[#121a29] divide-y divide-slate-700">
    {activity.map(o=>{
     const job=o.jobs as unknown as {id:string;title:string}|null;
     return <Link key={o.id} href={job?`/admin/jobs/${job.id}`:"/admin/jobs"} className="block p-4 hover:bg-slate-800/60">
      <div className="flex items-center gap-2 justify-between">
       <span className="font-semibold">{names.get(o.technician_id)||"Technician"}</span>
       <span className="text-green-300 text-sm">{o.status==="confirmed"?"Booked":"Accepted"}</span>
      </div>
      <p className="text-sm muted mt-1">{job?.title||"Job offer"}</p>
      {o.responded_at&&<p className="text-xs muted mt-1">{new Date(o.responded_at).toLocaleString("en-US",{dateStyle:"medium",timeStyle:"short"})}</p>}
     </Link>;
    })}
   </section>}
 </main>;
}
