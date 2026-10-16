import {currentRole} from "@/lib/server";
import {redirect} from "next/navigation";
import ScheduleTabs,{type ScheduleOffer} from "./schedule-tabs";

export default async function MySchedule(){
 const {db,user,role}=await currentRole();
 if(!user)redirect("/login");
 if(role!=="technician")redirect("/");
 const {data:offers,error}=await db.from("job_offers")
  .select("id,status,jobs(title,venue,starts_at,ends_at,rate,details,status)")
  .eq("technician_id",user.id).in("status",["pending","accepted"]).order("created_at",{ascending:false});
 const entries:ScheduleOffer[]=(offers||[]).map(o=>({
  id:o.id,status:o.status,
  job:o.jobs as unknown as ScheduleOffer["job"]
 }));
 return <main className="mx-auto max-w-3xl px-4 py-6 space-y-5">
  <header><p className="tracking-widest text-blue-400 text-xs font-bold">AV SELECT</p><h1 className="text-2xl sm:text-3xl font-bold mt-1">My Schedule</h1></header>
  {error?<div role="alert" className="panel text-red-300">Could not load your schedule: {error.message}</div>:
   <ScheduleTabs offers={entries} userId={user.id}/>}
 </main>;
}
