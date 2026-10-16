"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {browserDb} from "@/lib/supabase";

export default function JobActivityBadge({userId,role}:{userId:string;role:"admin"|"technician"}){
 const [count,setCount]=useState(0);
 useEffect(()=>{
  let live=true;
  async function update(){
   try{
    const db=browserDb();
    const {data:cursor,error:readError}=await db.from("job_activity_reads")
     .select("offers_seen_at,responses_seen_at").eq("user_id",userId).maybeSingle();
    if(readError)return;
    const lastSeen=role==="admin"?cursor?.responses_seen_at:cursor?.offers_seen_at;
    const since=lastSeen||"1970-01-01T00:00:00Z";
    const query=role==="admin"?
     db.from("job_offers").select("id",{count:"exact",head:true}).in("status",["accepted","declined"]).gt("responded_at",since):
     db.from("job_offers").select("id",{count:"exact",head:true}).eq("technician_id",userId).gt("created_at",since);
    const {count:total,error}=await query;
    if(live&&!error)setCount(total||0);
   }catch{/* Do not interrupt navigation if activity cannot load. */}
  }
  void update();
  const timer=setInterval(()=>void update(),60000);
  const onFocus=()=>void update();
  const onActivity=()=>void update();
  window.addEventListener("focus",onFocus);
  window.addEventListener("avselect:activity-seen",onActivity);
  const onVisibility=()=>{if(document.visibilityState==="visible")void update()};
  document.addEventListener("visibilitychange",onVisibility);
  return()=>{live=false;clearInterval(timer);window.removeEventListener("focus",onFocus);window.removeEventListener("avselect:activity-seen",onActivity);document.removeEventListener("visibilitychange",onVisibility)};
 },[userId,role]);
 const admin=role==="admin";
 const href=admin?"/admin/activity":"/offers";
 const label=admin?"Activity":"Offers";
 return <Link href={href} aria-label={count>0?`${label}: ${count} unread`:label}
  className="pill relative inline-flex items-center justify-center whitespace-nowrap" title={label}>
  {label}
  {count>0&&<span aria-hidden="true" className="absolute -right-2 -top-2 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[11px] font-bold grid place-content-center border-2 border-[#0e1523]">{count>99?"99+":count}</span>}
 </Link>;
}
