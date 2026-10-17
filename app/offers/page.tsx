import PageHeading from "@/app/page-heading";
import Breadcrumbs from "@/app/admin/breadcrumbs";
import {currentRole} from "@/lib/server";
import {redirect} from "next/navigation";
import ScheduleTabs,{type ScheduleOffer} from "./schedule-tabs";

export default async function MySchedule(){
 const {db,user,role}=await currentRole();
 if(!user)redirect("/login");
 if(role!=="technician")redirect("/");
 const {data:offers,error}=await db.from("job_offers")
  .select("id,status,offer_position,offer_rate,jobs(title,venue,address,signal_flow,starts_at,ends_at,rate,details,status)")
  .eq("technician_id",user.id).in("status",["pending","accepted","confirmed"]).order("created_at",{ascending:false});
 const entries:ScheduleOffer[]=(offers||[]).map(o=>({
  id:o.id,status:o.status,offer_position:o.offer_position||"",offer_rate:o.offer_rate||"",
  job:o.jobs as unknown as ScheduleOffer["job"]
 }));
 return <main className="mx-auto max-w-3xl px-4 py-6 space-y-5">
  <Breadcrumbs items={[{label:"Dashboard",href:"/dashboard"},{label:"My Schedule"}]}/>
  <PageHeading eyebrow="Technician schedule" title="My Schedule"/>
  {error?<div role="alert" className="panel text-red-300">Could not load your schedule: {error.message}</div>:
   <ScheduleTabs offers={entries} userId={user.id}/>}
 </main>;
}
