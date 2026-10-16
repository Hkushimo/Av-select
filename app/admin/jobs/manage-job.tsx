"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {browserDb} from "@/lib/supabase";

type JobStatus="draft"|"open"|"closed";
type Tech={user_id:string;full_name:string;city:string;roles:string[]};
type Offer={id:string;technician_id:string;status:string};
type Requirement={skill:string;min_level:number;required:boolean};
export default function ManageJob({jobId,initialStatus,technicians,offers,requirements}:{
 jobId:string;initialStatus:JobStatus;technicians:Tech[];offers:Offer[];requirements:Requirement[];
}){
 const router=useRouter();
 const [status,setStatus]=useState<JobStatus>(initialStatus),[busy,setBusy]=useState(false);
 const [selected,setSelected]=useState<string[]>([]),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [skill,setSkill]=useState(""),[level,setLevel]=useState(3),[required,setRequired]=useState(true);
 const [existingOffers,setExistingOffers]=useState(offers);
 const [currentRequirements,setCurrentRequirements]=useState(requirements);
 const offered=new Set(existingOffers.map(o=>o.technician_id));
 const available=technicians.filter(t=>!offered.has(t.user_id));
 async function changeStatus(next:JobStatus){
  setBusy(true);setError("");setNotice("");
  const {error}=await browserDb().from("jobs").update({status:next}).eq("id",jobId);
  if(error)setError(error.message);else{setStatus(next);setNotice("Job status updated.");router.refresh()}
  setBusy(false);
 }
 async function addRequirement(){
  if(!skill.trim())return;
  setBusy(true);setError("");setNotice("");
  const db=browserDb();
  const {error}=await db.from("job_requirements").upsert({
   job_id:jobId,skill:skill.trim(),min_level:level,required
  },{onConflict:"job_id,skill"});
  if(error)setError(error.message);
  else{setCurrentRequirements(items=>[...items.filter(r=>r.skill!==skill.trim()),{skill:skill.trim(),min_level:level,required}]);setSkill("");setNotice("Staffing requirement saved.");router.refresh()}
  setBusy(false);
 }
 async function removeRequirement(name:string){
  setBusy(true);setError("");
  const {error}=await browserDb().from("job_requirements").delete().eq("job_id",jobId).eq("skill",name);
  if(error)setError(error.message);
  else{setCurrentRequirements(items=>items.filter(r=>r.skill!==name));router.refresh()}
  setBusy(false);
 }
 async function sendOffers(){
  if(!selected.length||status!=="open")return;
  setBusy(true);setError("");setNotice("");
  const {data,error}=await browserDb().from("job_offers").insert(
   selected.map(id=>({job_id:jobId,technician_id:id,status:"pending"}))
  ).select("id,technician_id,status");
  if(error)setError(error.message);
  else{setExistingOffers(items=>[...items,...(data||[])]);setSelected([]);setNotice("Offers saved. Technicians can view them under Job offers.");router.refresh()}
  setBusy(false);
 }
 async function cancelOffer(offer:Offer){
  if(offer.status!=="pending")return;
  setBusy(true);setError("");
  const {error}=await browserDb().from("job_offers").update({status:"cancelled"}).eq("id",offer.id).eq("status","pending");
  if(error)setError(error.message);
  else{setExistingOffers(items=>items.map(o=>o.id===offer.id?{...o,status:"cancelled"}:o));router.refresh()}
  setBusy(false);
 }
 function toggle(id:string){setSelected(list=>list.includes(id)?list.filter(x=>x!==id):[...list,id])}
 return <div className="space-y-5">
  <section className="panel space-y-3">
   <h2 className="font-semibold text-lg">Job status</h2>
   <p className="muted text-sm">Draft jobs are for planning. Open a job before sending offers. Closing a job stops new offers.</p>
   <div className="flex flex-wrap gap-2">
    {(["draft","open","closed"] as JobStatus[]).map(s=><button type="button" key={s} disabled={busy} onClick={()=>changeStatus(s)}
      className={"pill capitalize "+(status===s?"bg-blue-600 border-blue-500":"")}>{s}</button>)}
   </div>
  </section>
  <section className="panel space-y-3">
   <h2 className="font-semibold text-lg">Staffing requirements</h2>
   <p className="muted text-xs">List roles or skills you're looking for. Admin skill ratings stay separate from technician self-selections.</p>
   {currentRequirements.length?<div className="space-y-2">
    {currentRequirements.map(r=><div key={r.skill} className="flex items-center gap-2 border-b border-slate-700 pb-2">
     <div className="flex-1 text-sm">{r.skill} · min {r.min_level}/5 {r.required?"· required":"· preferred"}</div>
     <button className="pill text-xs" disabled={busy} onClick={()=>removeRequirement(r.skill)}>Remove</button>
    </div>)}
   </div>:<p className="muted text-sm">No requirements yet.</p>}
   <input aria-label="Role or skill" placeholder="e.g. V1 — Lead Video Engineer" value={skill} onChange={e=>setSkill(e.target.value)}/>
   <div className="flex items-center gap-3">
    <label className="text-xs muted flex-1">Min admin rating
     <select value={level} onChange={e=>setLevel(Number(e.target.value))}>
      {[1,2,3,4,5].map(n=><option key={n} value={n}>{n}/5</option>)}
     </select>
    </label>
    <label className="text-xs flex gap-2 items-center pt-4"><input className="!w-auto" type="checkbox" checked={required} onChange={e=>setRequired(e.target.checked)}/>Required</label>
   </div>
   <button type="button" className="pill w-full" disabled={!skill.trim()||busy} onClick={addRequirement}>Add requirement</button>
  </section>
  <section className="panel space-y-3">
   <h2 className="font-semibold text-lg">Send job offers</h2>
   <p className="muted text-sm">Select technicians to offer this job. An offer is not a confirmed booking.</p>
   {status!=="open"&&<p className="text-amber-200 text-sm">Set job status to Open to send offers.</p>}
   {!available.length?<p className="muted text-sm">No additional technicians available to offer.</p>:
    <div className="space-y-2 max-h-72 overflow-auto">{available.map(t=><label key={t.user_id} className="flex gap-3 items-center rounded-lg border border-slate-700 px-3 py-3">
     <input className="!w-auto" type="checkbox" checked={selected.includes(t.user_id)} onChange={()=>toggle(t.user_id)} />
     <span className="min-w-0"><span className="font-medium text-sm block">{t.full_name||"Incomplete profile"}</span>
      <span className="muted text-xs block break-words">{[t.city,t.roles?.slice(0,2).join(", ")].filter(Boolean).join(" · ")}</span></span>
    </label>)}</div>}
   <button type="button" className="primary w-full" disabled={busy||status!=="open"||!selected.length} onClick={sendOffers}>
    {busy?"Saving…":`Offer job to ${selected.length} technician${selected.length===1?"":"s"}`}
   </button>
   <p className="muted text-xs">Offers appear in technicians' app accounts; this does not send SMS or push notifications.</p>
  </section>
  <section className="panel space-y-3">
   <h2 className="font-semibold text-lg">Responses <span className="muted text-sm">({existingOffers.length})</span></h2>
   {!existingOffers.length?<p className="muted text-sm">No offers sent yet.</p>:
    existingOffers.map(o=><div key={o.id} className="flex gap-3 justify-between items-center border-b border-slate-700 py-2">
     <div className="min-w-0"><p className="text-sm font-medium truncate">{technicians.find(t=>t.user_id===o.technician_id)?.full_name||"Technician"}</p>
     <p className="muted text-xs capitalize">{o.status}</p></div>
     {o.status==="pending"&&<button type="button" className="pill text-xs" disabled={busy} onClick={()=>cancelOffer(o)}>Cancel</button>}
    </div>)}
   <p className="muted text-xs">An accepted offer indicates interest, not final staffing confirmation.</p>
  </section>
  {notice&&<p className="text-green-300 text-sm" role="status">{notice}</p>}
  {error&&<p className="text-red-400 text-sm" role="alert">{error}</p>}
 </div>;
}
