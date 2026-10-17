"use client";
import {FormEvent,useState} from "react";
import {useRouter} from "next/navigation";
import {browserDb} from "@/lib/supabase";
import DepartmentFlowEditor,{type DepartmentFlow} from "./department-flow";

function localIso(value:string){
 const d=new Date(value);
 if(!value||Number.isNaN(d.getTime()))throw new Error("Choose a valid start date and time.");
 return d.toISOString();
}
export default function JobCreate(){
 const router=useRouter();
 const [expanded,setExpanded]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const [title,setTitle]=useState(""),[venue,setVenue]=useState(""),[address,setAddress]=useState(""),[starts,setStarts]=useState(""),[ends,setEnds]=useState("");
 const [flows,setFlows]=useState<DepartmentFlow[]>([]);
 const [rate,setRate]=useState(""),[details,setDetails]=useState(""),[status,setStatus]=useState<"draft"|"open">("draft");
 async function submit(event:FormEvent){
  event.preventDefault();setError("");setBusy(true);
  try{
   if(!title.trim())throw new Error("A job title is required.");
   const from=localIso(starts),to=ends?localIso(ends):null;
   if(to&&new Date(to)<=new Date(from))throw new Error("End time must be after start time.");
   const db=browserDb();
   const {data:{user},error:authError}=await db.auth.getUser();
   if(authError||!user)throw new Error("Please sign in again.");
   const {data:profile}=await db.from("profiles").select("role").eq("id",user.id).maybeSingle();
   if(profile?.role!=="admin")throw new Error("Only administrators can create jobs.");
   const {data:created,error:insertError}=await db.from("jobs").insert({
    title:title.trim(),venue:venue.trim(),address:address.trim(),signal_flow:flows,starts_at:from,ends_at:to,
    rate:rate.trim(),details:details.trim(),status,created_by:user.id
   }).select("id").single();
   if(insertError)throw insertError;
   router.push("/admin/jobs/"+created.id);
   router.refresh();
  }catch(err){setError(err instanceof Error?err.message:"Could not create job.");setBusy(false)}
 }
 return <section className="rounded-xl border border-slate-700 bg-[#121a29]">
  <button type="button" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}
    className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left font-semibold">
    <span className="text-blue-300">＋ Create new job</span><span className="muted text-sm">{expanded?"Close":"Open form"}</span>
  </button>
  {expanded&&<form onSubmit={submit} className="space-y-4 border-t border-slate-700 px-4 py-5">
   <label className="block"><span className="label">Job / show title *</span><input required maxLength={160} placeholder="Annual sales conference — General Session" value={title} onChange={e=>setTitle(e.target.value)}/></label>
   <label className="block"><span className="label">Venue / location</span><input maxLength={250} placeholder="Boston Convention & Exhibition Center" value={venue} onChange={e=>setVenue(e.target.value)}/></label>
   <label className="block"><span className="label">Venue address</span><input maxLength={500} autoComplete="street-address" placeholder="Street address, city, state, ZIP" value={address} onChange={e=>setAddress(e.target.value)}/></label>
   <div className="grid sm:grid-cols-2 gap-3">
    <label className="block"><span className="label">Start date & time *</span><input required type="datetime-local" value={starts} onChange={e=>setStarts(e.target.value)}/></label>
    <label className="block"><span className="label">End date & time</span><input type="datetime-local" value={ends} onChange={e=>setEnds(e.target.value)}/></label>
   </div>
   <p className="muted text-xs">Times are entered in your device's local time zone.</p>
   <label className="block"><span className="label">Rate / pay details</span><input maxLength={160} placeholder="e.g. $600/day, 10-hour minimum" value={rate} onChange={e=>setRate(e.target.value)}/></label>
   <label className="block"><span className="label">Call details / notes</span><textarea rows={4} maxLength={5000} placeholder="Load-in, parking, dress code, gear and contact notes" value={details} onChange={e=>setDetails(e.target.value)}/></label>
   <details className="rounded-xl border border-slate-700 px-3 py-3"><summary className="cursor-pointer text-sm font-semibold">Department signal flows (optional)</summary><div className="pt-3"><DepartmentFlowEditor value={flows} onChange={setFlows} disabled={busy}/></div></details>
   <label className="block"><span className="label">Initial status</span><select value={status} onChange={e=>setStatus(e.target.value as "draft"|"open")}>
    <option value="draft">Draft — plan staffing</option><option value="open">Open — ready to offer</option>
   </select></label>
   {error&&<p className="text-red-400 text-sm" role="alert">{error}</p>}
   <button type="submit" className="primary w-full" disabled={busy}>{busy?"Creating…":"Create job →"}</button>
  </form>}
 </section>;
}
