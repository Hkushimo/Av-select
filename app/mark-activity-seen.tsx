"use client";
import {useEffect} from "react";
import {browserDb} from "@/lib/supabase";

/** Record that this user opened the relevant activity screen. */
export default function MarkActivitySeen({userId,kind}:{userId:string;kind:"offers"|"responses"}){
 useEffect(()=>{
  let cancelled=false;
  async function mark(){
   const column=kind==="offers"?"offers_seen_at":"responses_seen_at";
   const db=browserDb();
   const {data:{user}}=await db.auth.getUser();
   if(cancelled||user?.id!==userId)return;
   const {data:existing,error:readError}=await db.from("job_activity_reads").select("user_id").eq("user_id",userId).maybeSingle();
   if(readError||cancelled)return;
   const timestamp=new Date().toISOString();
   const {error}=existing?
    await db.from("job_activity_reads").update({[column]:timestamp}).eq("user_id",userId):
    await db.from("job_activity_reads").insert({user_id:userId,[column]:timestamp});
   if(!error&&!cancelled)window.dispatchEvent(new Event("avselect:activity-seen"));
  }
  void mark();
  return()=>{cancelled=true};
 },[userId,kind]);
 return null;
}
