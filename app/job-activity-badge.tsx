"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {browserDb} from "@/lib/supabase";

export function useJobActivityCount(userId:string|null,role:string|null){
 const [count,setCount]=useState(0);
 useEffect(()=>{
  if(!userId||(role!=="admin"&&role!=="technician")){setCount(0);return}
  let active=true;
  async function update(){
   try{
    const db=browserDb();
    const {data:cursor,error:readError}=await db.from("job_activity_reads")
     .select("offers_seen_at,responses_seen_at").eq("user_id",userId).maybeSingle();
    if(readError)return;
    const seen=role==="admin"?cursor?.responses_seen_at:cursor?.offers_seen_at;
    const since=seen||"1970-01-01T00:00:00Z";
    const query=role==="admin"?
      db.from("job_offers").select("id",{count:"exact",head:true}).eq("status","accepted").gt("responded_at",since):
      db.from("job_offers").select("id",{count:"exact",head:true}).eq("technician_id",userId).eq("status","pending").gt("created_at",since);
    const {count:total,error}=await query;
    if(active&&!error)setCount(total||0);
   }catch{/* Activity should never block the navigation. */}
  }
  void update();
  const timer=setInterval(()=>void update(),60000);
  const refresh=()=>void update();
  const visible=()=>{if(document.visibilityState==="visible")void update()};
  window.addEventListener("focus",refresh);
  window.addEventListener("avselect:activity-seen",refresh);
  document.addEventListener("visibilitychange",visible);
  return()=>{active=false;clearInterval(timer);window.removeEventListener("focus",refresh);window.removeEventListener("avselect:activity-seen",refresh);document.removeEventListener("visibilitychange",visible)};
 },[userId,role]);
 return count;
}

export function UnreadBubble({count}:{count:number}){
 if(count<=0)return null;
 return <span className="absolute -right-1.5 -top-2 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[11px] font-bold grid place-content-center border-2 border-[#0e1523]" aria-hidden="true">{count>99?"99+":count}</span>;
}

export default function JobActivityBadge({role,count,onNavigate}:{role:"admin"|"technician";count:number;onNavigate?:()=>void}){
 const admin=role==="admin";
 const href=admin?"/admin/activity":"/offers";
 const label=admin?"Activity":"My Schedule";
 return <Link href={href} onClick={onNavigate} aria-label={count>0?`${label}: ${count} unread`:label}
  className="pill relative inline-flex items-center justify-center whitespace-nowrap" title={label}>
  {label}<UnreadBubble count={count}/>
 </Link>;
}
