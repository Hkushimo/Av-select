"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {browserDb} from "@/lib/supabase";

export default function DeleteJob({jobId,title,offerCount}:{jobId:string;title:string;offerCount:number}){
 const router=useRouter();
 const [open,setOpen]=useState(false);
 const [confirmation,setConfirmation]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");

 async function remove(){
  if(busy||confirmation!=="DELETE")return;
  setBusy(true);setError("");
  try{
   const db=browserDb();
   // Supabase RLS permits this only for admins. Returning the row verifies
   // that a deletion actually occurred instead of silently succeeding.
   const {data,error:deleteError}=await db.from("jobs")
    .delete().eq("id",jobId).select("id").maybeSingle();
   if(deleteError)throw deleteError;
   if(!data)throw new Error("Job not found or you do not have permission to delete it.");
   router.replace("/admin/jobs");
   router.refresh();
  }catch(e){
   setError(e instanceof Error?e.message:"Unable to delete this job.");
   setBusy(false);
  }
 }

 return <section className="panel !p-4 sm:!p-5 space-y-3 border-red-900/50">
  <h2 className="font-semibold text-lg">Delete job</h2>
  {!open?<div className="flex flex-wrap items-center justify-between gap-3">
   <p className="muted text-xs flex-1">Permanently remove this job and all related staffing records.</p>
   <button type="button" className="pill text-red-300 shrink-0" onClick={()=>setOpen(true)}>Delete job…</button>
  </div>:<div className="space-y-3">
   <p className="text-red-300 text-sm font-medium">Delete “{title}” permanently?</p>
   <p className="muted text-sm">This removes the job, {offerCount} associated offer{offerCount===1?"":"s"} or booking{offerCount===1?"":"s"}, and its staffing requirements from the database. It also disappears from technicians’ calendars. This cannot be undone.</p>
   <label className="block"><span className="label">Type DELETE to confirm</span>
    <input value={confirmation} autoComplete="off" spellCheck={false} onChange={e=>setConfirmation(e.target.value)} placeholder="DELETE" aria-label="Type DELETE to confirm deletion"/></label>
   <div className="flex flex-wrap gap-2">
    <button type="button" className="rounded-lg bg-red-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40" disabled={busy||confirmation!=="DELETE"} onClick={remove}>{busy?"Deleting…":"Permanently delete job"}</button>
    <button type="button" className="pill" disabled={busy} onClick={()=>{setOpen(false);setConfirmation("");setError("")}}>Cancel</button>
   </div>
  </div>}
  {error&&<p role="alert" className="text-red-300 text-sm">{error}</p>}
 </section>;
}
