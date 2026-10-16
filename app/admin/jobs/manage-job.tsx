"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {browserDb} from "@/lib/supabase";
import {rosterMatch, type RosterTech, type RosterRating} from "../roster-filters";

type JobStatus="draft"|"open"|"closed";
type Tech=RosterTech;
type Offer={id:string;technician_id:string;status:string};
type Requirement={skill:string;min_level:number;required:boolean};
export default function ManageJob({jobId,initialStatus,startsAt,endsAt,technicians,ratings,offers,requirements}:{
 jobId:string;initialStatus:JobStatus;startsAt:string;endsAt:string|null;technicians:Tech[];ratings:RosterRating[];offers:Offer[];requirements:Requirement[];
}){
 const router=useRouter();
 const [status,setStatus]=useState<JobStatus>(initialStatus),[busy,setBusy]=useState(false);
 const [selected,setSelected]=useState<string[]>([]),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [skill,setSkill]=useState(""),[level,setLevel]=useState(3),[required,setRequired]=useState(true);
 const [existingOffers,setExistingOffers]=useState(offers);
 const toLocal=(iso:string|null)=>{if(!iso)return "";const d=new Date(iso);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)};
 const [startInput,setStartInput]=useState(()=>toLocal(startsAt));
 const [endInput,setEndInput]=useState(()=>toLocal(endsAt));
 const [currentRequirements,setCurrentRequirements]=useState(requirements);
 const [search,setSearch]=useState(""),[roleFilter,setRoleFilter]=useState(""),[equipmentFilter,setEquipmentFilter]=useState(""),[ratingFilter,setRatingFilter]=useState(""),[minimum,setMinimum]=useState(3);
 const offered=new Set(existingOffers.map(o=>o.technician_id));
 const available=technicians.filter(t=>!offered.has(t.user_id));
 const roleOptions=Array.from(new Set(technicians.flatMap(t=>t.roles||[]))).sort();
 const equipmentOptions=Array.from(new Set(technicians.flatMap(t=>t.equipment||[]))).sort();
 const skillOptions=Array.from(new Set(ratings.map(r=>r.skill))).sort();
 const filteredAvailable=available.filter(t=>rosterMatch(t,ratings,search,roleFilter,equipmentFilter,"",ratingFilter,minimum));
 const clearFilters=()=>{setSearch("");setRoleFilter("");setEquipmentFilter("");setRatingFilter("");setMinimum(3)};

 async function changeStatus(next:JobStatus){
  setBusy(true);setError("");setNotice("");
  const {error}=await browserDb().from("jobs").update({status:next}).eq("id",jobId);
  if(error)setError(error.message);else{setStatus(next);setNotice("Job status updated.");router.refresh()}
  setBusy(false);
 }
 async function saveDates(){
  const start=new Date(startInput),end=endInput?new Date(endInput):null;
  if(!startInput||!Number.isFinite(start.getTime())||(end&&!Number.isFinite(end.getTime()))||(end&&end<=start)){setError("End must be after start.");return}
  setBusy(true);setError("");setNotice("");
  const {error}=await browserDb().from("jobs").update({starts_at:start.toISOString(),ends_at:end?end.toISOString():null}).eq("id",jobId);
  if(error)setError(error.message);else{setNotice("Job dates updated for all technicians.");router.refresh()}
  setBusy(false);
 }
 async function updateBooking(o:Offer,next:"accepted"|"confirmed"){
  setBusy(true);setError("");setNotice("");
  const {data,error}=await browserDb().from("job_offers").update({status:next}).eq("id",o.id).eq("job_id",jobId).eq("status",o.status).select("id").maybeSingle();
  if(error)setError(error.message);else if(!data)setError("Offer changed. Refresh this page.");
  else{setExistingOffers(items=>items.map(x=>x.id===o.id?{...x,status:next}:x));router.refresh()}
  setBusy(false);
 }
 async function release(o:Offer){
  if(!window.confirm("Remove this technician from the job and their schedule?"))return;
  setBusy(true);setError("");setNotice("");
  const {data,error}=await browserDb().from("job_offers").delete().eq("id",o.id).eq("job_id",jobId).select("id").maybeSingle();
  if(error)setError(error.message);else if(!data)setError("Offer already changed.");
  else{setExistingOffers(items=>items.filter(x=>x.id!==o.id));router.refresh()}
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
  <section className="panel !p-4 sm:!p-5 space-y-3">
   <div className="flex items-center justify-between gap-3">
    <h2 className="font-semibold text-lg">Job schedule</h2>
    <span className="text-xs muted">Local time</span>
   </div>
   <div className="grid gap-3 sm:grid-cols-2">
    <label className="block min-w-0"><span className="label">Start date & time</span>
     <input type="datetime-local" className="min-w-0" value={startInput} disabled={busy} onChange={e=>setStartInput(e.target.value)}/></label>
    <label className="block min-w-0"><span className="label">End date & time (optional)</span>
     <input type="datetime-local" className="min-w-0" value={endInput} disabled={busy} onChange={e=>setEndInput(e.target.value)}/></label>
   </div>
   <div className="flex items-center justify-between gap-3 flex-wrap">
    <p className="muted text-xs flex-1">Changes update the crew's schedules.</p>
    <button className="primary !px-4 !py-2.5 text-sm" type="button"
      disabled={busy||!startInput||(startInput===toLocal(startsAt)&&endInput===toLocal(endsAt))} onClick={saveDates}>Save changes</button>
   </div>
  </section>
  <details className="panel !p-4 sm:!p-5">
   <summary className="cursor-pointer font-semibold text-lg flex items-center justify-between gap-3">
    <span>Staffing requirements <span className="muted text-sm font-normal">({currentRequirements.length})</span></span>
    <span className="text-blue-300 text-xs font-normal shrink-0">Edit</span>
   </summary>
   <div className="space-y-3 pt-4">
    <p className="muted text-xs">Optional staffing criteria: position, rating, and required/preferred.</p>
    {currentRequirements.length?<div className="space-y-2">
     {currentRequirements.map(r=><div key={r.skill} className="flex items-center gap-2 border-b border-slate-700 pb-2">
      <div className="flex-1 text-sm">{r.skill} · min {r.min_level}/5 {r.required?"· required":"· preferred"}</div>
      <button type="button" className="text-red-300 text-xs" disabled={busy} onClick={()=>removeRequirement(r.skill)}>Remove</button>
     </div>)}
    </div>:<p className="muted text-xs">No requirements yet.</p>}
    <label className="block"><span className="label">Position or skill</span>
     <input placeholder="e.g. V1 — Lead Video Engineer" value={skill} onChange={e=>setSkill(e.target.value)}/></label>
    <div className="flex items-end gap-3">
     <label className="flex-1 min-w-0"><span className="label">Minimum rating</span>
      <select value={level} onChange={e=>setLevel(Number(e.target.value))}>
       {[1,2,3,4,5].map(n=><option key={n} value={n}>{n}/5</option>)}
      </select>
     </label>
     <label className="flex gap-2 items-center pb-3 text-sm whitespace-nowrap">
      <input className="!w-auto" type="checkbox" checked={required} onChange={e=>setRequired(e.target.checked)}/>Required
     </label>
    </div>
    <button type="button" className="pill w-full" disabled={!skill.trim()||busy} onClick={addRequirement}>Add requirement</button>
   </div>
  </details>
  <section className="panel space-y-3">
   <h2 className="font-semibold text-lg">Send job offers</h2>
   <p className="muted text-sm">Select technicians to offer this job. An offer is not a confirmed booking.</p>
   {status!=="open"&&<p className="text-amber-200 text-sm">Set job status to Open to send offers.</p>}
   <div className="space-y-2 border border-slate-700 rounded-xl p-3">
    <input type="search" aria-label="Search candidates" placeholder="Search names, city, specialties…" value={search} onChange={e=>setSearch(e.target.value)}/>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
     <label><span className="label">Position</span><select value={roleFilter} onChange={e=>setRoleFilter(e.target.value)}><option value="">Any position</option>{roleOptions.map(r=><option key={r} value={r}>{r}</option>)}</select></label>
     <label><span className="label">Equipment</span><select value={equipmentFilter} onChange={e=>setEquipmentFilter(e.target.value)}><option value="">Any equipment</option>{equipmentOptions.map(r=><option key={r} value={r}>{r}</option>)}</select></label>
     <label><span className="label">Officially rated skill</span><select value={ratingFilter} onChange={e=>setRatingFilter(e.target.value)}><option value="">Any rating / unrated</option>{skillOptions.map(r=><option key={r} value={r}>{r}</option>)}</select></label>
     {ratingFilter&&<label><span className="label">Minimum rating: {minimum}/5</span><input aria-label="Minimum rating" type="range" min={1} max={5} value={minimum} onChange={e=>setMinimum(Number(e.target.value))} className="!p-0 accent-blue-500"/></label>}
    </div>
    <div className="flex items-center justify-between gap-2"><span className="muted text-xs">{filteredAvailable.length} matching candidates · {selected.length} selected</span><button type="button" className="text-blue-300 text-xs underline" onClick={clearFilters}>Clear filters</button></div>
    <p className="muted text-xs">Roles and equipment are self-reported. Official ratings are admin assessments; filtering by rating excludes unrated candidates.</p>
   </div>
   {!available.length?<p className="muted text-sm">No additional technicians available to offer.</p>:
    !filteredAvailable.length?<p className="muted text-sm">No technicians match. Adjust or clear filters.</p>:
    <div className="space-y-2 max-h-72 overflow-auto">{filteredAvailable.map(t=><label key={t.user_id} className="flex gap-3 items-center rounded-lg border border-slate-700 px-3 py-3">
     <input className="!w-auto" type="checkbox" checked={selected.includes(t.user_id)} onChange={()=>toggle(t.user_id)} />
     <span className="min-w-0"><span className="font-medium text-sm block">{t.full_name||"Incomplete profile"}</span>
      <span className="muted text-xs block break-words">{[t.city,t.roles?.slice(0,2).join(", ")].filter(Boolean).join(" · ")}{ratingFilter&&<span className="text-blue-300"> · {ratingFilter} {ratings.find(r=>r.technician_id===t.user_id&&r.skill===ratingFilter)?.level}/5</span>}</span></span>
    </label>)}</div>}
   <button type="button" className="primary w-full" disabled={busy||status!=="open"||!selected.length} onClick={sendOffers}>
    {busy?"Saving…":`Offer job to ${selected.length} technician${selected.length===1?"":"s"}`}
   </button>
   <p className="muted text-xs">Offers appear in technicians' app accounts; this does not send SMS or push notifications.</p>
  </section>
  <section className="panel space-y-3">
   <h2 className="font-semibold text-lg">Crew & bookings ({existingOffers.length})</h2>
   {existingOffers.length===0&&<p className="muted text-sm">No offers or bookings yet.</p>}
   {existingOffers.map(o=><div key={o.id} className="py-3 border-b border-slate-700 space-y-2">
    <p className="font-semibold text-sm">{technicians.find(t=>t.user_id===o.technician_id)?.full_name||"Technician"}</p>
    <p className={o.status==="confirmed"?"text-green-300 text-xs":"muted text-xs"}>{o.status==="confirmed"?"Booked":o.status==="accepted"?"Accepted · Awaiting confirmation":o.status}</p>
    <div className="flex flex-wrap gap-2">
     {o.status==="accepted"&&<button className="primary text-xs" disabled={busy} onClick={()=>updateBooking(o,"confirmed")}>Confirm booking</button>}
     {o.status==="confirmed"&&<button className="pill text-xs" disabled={busy} onClick={()=>updateBooking(o,"accepted")}>Undo confirmation</button>}
     <button className="pill text-xs text-red-300" disabled={busy} onClick={()=>release(o)}>{o.status==="pending"?"Withdraw offer":"Release technician"}</button>
    </div>
   </div>)}
   <p className="muted text-xs">Accepted means interested. Confirm booking to finalize. Release removes the offer and calendar entry.</p>
  </section>
  {notice&&<p className="text-green-300 text-sm" role="status">{notice}</p>}
  {error&&<p className="text-red-400 text-sm" role="alert">{error}</p>}
 </div>;
}
