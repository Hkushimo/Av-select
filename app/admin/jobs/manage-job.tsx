"use client";
import TimeZoneSelect from "@/app/time-zone-select";
import {jobTimeToIso,jobDateTimeInput,formatJobTime,zoneLabel} from "@/lib/job-time";
import CrewBoard from "./crew-board";
import {useState,useEffect} from "react";
import {useRouter} from "next/navigation";
import {browserDb} from "@/lib/supabase";
import {rosterMatch, type RosterTech, type RosterRating} from "../roster-filters";
import {US_STATES,locationText,stateFromLegacy} from "@/lib/us-location";
import type {RateBasis} from "@/lib/invoicing";

type JobStatus="draft"|"open"|"closed";
type Tech=RosterTech;
type Offer={id:string;technician_id:string;status:string;offer_position:string;offer_rate:string;return_call_flat_amount:number|null};
type Requirement={skill:string;min_level:number;required:boolean};
export default function ManageJob({jobId,initialStatus,rateBasis,timeZone,startsAt,endsAt,technicians,ratings,offers,requirements,mode,invoicedOfferIds=[]}:{
 jobId:string;initialStatus:JobStatus;rateBasis:RateBasis;timeZone:string|null;startsAt:string;endsAt:string|null;technicians:Tech[];ratings:RosterRating[];offers:Offer[];requirements:Requirement[];mode:"setup"|"staffing";invoicedOfferIds?:string[];
}){
 const router=useRouter();
 const [status,setStatus]=useState<JobStatus>(initialStatus),[payBasis,setPayBasis]=useState<RateBasis>(rateBasis),[busy,setBusy]=useState(false);
 const [selected,setSelected]=useState<string[]>([]),[offerDetails,setOfferDetails]=useState<Record<string,{position:string;rate:string;returnFlat:string}>>({}),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [skill,setSkill]=useState(""),[level,setLevel]=useState(3),[required,setRequired]=useState(true);
 const [existingOffers,setExistingOffers]=useState(offers);
 const [zone,setZone]=useState(timeZone||"UTC");
 const toLocal=(iso:string|null)=>iso?jobDateTimeInput(iso,zone):"";
 const [startInput,setStartInput]=useState(()=>toLocal(startsAt));
 const [endInput,setEndInput]=useState(()=>toLocal(endsAt));
 const [currentRequirements,setCurrentRequirements]=useState(requirements);
 useEffect(()=>setExistingOffers(offers),[offers]);
 useEffect(()=>setStatus(initialStatus),[initialStatus]);
 useEffect(()=>setPayBasis(rateBasis),[rateBasis]);
 useEffect(()=>setCurrentRequirements(requirements),[requirements]);
 const [search,setSearch]=useState(""),[stateFilter,setStateFilter]=useState(""),[roleFilter,setRoleFilter]=useState(""),[equipmentFilter,setEquipmentFilter]=useState(""),[ratingFilter,setRatingFilter]=useState(""),[minimum,setMinimum]=useState(3);
 const offered=new Set(existingOffers.map(o=>o.technician_id));
 const available=technicians.filter(t=>!offered.has(t.user_id));
 const roleOptions=Array.from(new Set(technicians.flatMap(t=>t.roles||[]))).sort();
 const equipmentOptions=Array.from(new Set(technicians.flatMap(t=>t.equipment||[]))).sort();
 const skillOptions=Array.from(new Set(ratings.map(r=>r.skill))).sort();
 const filteredAvailable=available.filter(t=>rosterMatch(t,ratings,search,roleFilter,equipmentFilter,"",ratingFilter,minimum)&&(!stateFilter||(t.state||stateFromLegacy(t.city).state)===stateFilter));
 const clearFilters=()=>{setSearch("");setStateFilter("");setRoleFilter("");setEquipmentFilter("");setRatingFilter("");setMinimum(3)};

 async function changeStatus(next:JobStatus){
  setBusy(true);setError("");setNotice("");
  const {error}=await browserDb().from("jobs").update({status:next}).eq("id",jobId);
  if(error)setError(error.message);else{setStatus(next);setNotice("Job status updated.");router.refresh()}
  setBusy(false);
 }
 async function savePayBasis(){
  if(existingOffers.some(o=>o.status!=="cancelled")){setError("Release all offers before changing this job's pay structure.");return;}
  setBusy(true);setError("");setNotice("");
  const {error}=await browserDb().from("jobs").update({rate_basis:payBasis}).eq("id",jobId);
  if(error)setError(error.message);
  else{setNotice("Job pay structure saved.");router.refresh();}
  setBusy(false);
 }
 async function saveDates(){
  let start:Date,end:Date|null;
  try { start=new Date(jobTimeToIso(startInput,zone));end=endInput?new Date(jobTimeToIso(endInput,zone)):null; }
  catch(e){setError(e instanceof Error?e.message:"Invalid call time");return;}
  if(!startInput||!Number.isFinite(start.getTime())||(end&&!Number.isFinite(end.getTime()))||(end&&end<=start)){setError("End must be after start.");return}
  setBusy(true);setError("");setNotice("");
  const {error}=await browserDb().from("jobs").update({starts_at:start.toISOString(),ends_at:end?end.toISOString():null,time_zone:zone}).eq("id",jobId);
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
  const proposed=selected.map(id=>({id,position:(offerDetails[id]?.position||"").trim(),amount:Number(offerDetails[id]?.rate||""),returnFlat:(offerDetails[id]?.returnFlat||"").trim()}));
  if(proposed.some(o=>!o.position||!Number.isFinite(o.amount)||o.amount<=0||o.amount>100000||Math.abs(o.amount*100-Math.round(o.amount*100))>0.000001)){
   setError("Choose a position and enter a valid agreed amount for every selected technician.");return;
  }
  if(proposed.some(o=>o.returnFlat!==""&&(!Number.isFinite(Number(o.returnFlat))||Number(o.returnFlat)<=0||Number(o.returnFlat)>100000||Math.abs(Number(o.returnFlat)*100-Math.round(Number(o.returnFlat)*100))>0.000001))){
   setError("Enter a valid positive return-call amount or leave it blank.");return;
  }
  const payload=proposed.map(o=>({job_id:jobId,technician_id:o.id,status:"pending",offer_position:o.position,
   offer_rate:"$"+o.amount.toFixed(2)+(payBasis==="day"?"/day":"/hr"),
   return_call_flat_amount:o.returnFlat===""?null:Number(o.returnFlat)}));
  setBusy(true);setError("");setNotice("");
  const {data,error}=await browserDb().from("job_offers").insert(payload).select("id,technician_id,status,offer_position,offer_rate,return_call_flat_amount");
  if(error)setError(error.message);
  else{setExistingOffers(items=>[...items,...(data||[])]);setSelected([]);setOfferDetails({});setNotice("Offers saved with individual positions and rates.");router.refresh()}
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
 async function saveReturnCall(offer:Offer,amount:number|null):Promise<boolean>{
  setBusy(true);setError("");setNotice("");
  try{
   const {data,error}=await browserDb().from("job_offers")
    .update({return_call_flat_amount:amount}).eq("id",offer.id).eq("job_id",jobId)
    .select("id,return_call_flat_amount").maybeSingle();
   if(error)throw error;
   if(!data)throw new Error("Offer changed. Refresh and try again.");
   setExistingOffers(items=>items.map(o=>o.id===offer.id?{...o,return_call_flat_amount:data.return_call_flat_amount}:o));
   setNotice(amount===null?"Return-call agreement removed.":"Return-call amount approved for this booking.");
   router.refresh();
   return true;
  }catch(err){
   setError(err instanceof Error?err.message:"Could not save return-call agreement.");
   return false;
  }finally{setBusy(false);}
 }
 function toggle(id:string){setSelected(list=>list.includes(id)?list.filter(x=>x!==id):[...list,id])}
 return <div className="space-y-5">
  {mode==="setup"?<div className="space-y-3">  <section className="panel !p-4 sm:!p-5 space-y-3">
   <div className="flex flex-wrap items-center justify-between gap-2">
    <h2 className="font-semibold text-lg">Job status</h2>
    <span className="muted text-xs">Open to send offers</span>
   </div>
   <div className="flex flex-wrap gap-2">
    {(["draft","open","closed"] as JobStatus[]).map(s=><button type="button" key={s} disabled={busy} onClick={()=>changeStatus(s)}
      className="pill capitalize" aria-pressed={status===s}>{s}</button>)}
   </div>
  </section>
  <section className="panel !p-4 sm:!p-5 space-y-3">
   <h2 className="font-semibold text-lg">Pay structure</h2>
   {existingOffers.some(o=>o.status!=="cancelled")?
    <p className="text-sm text-slate-200">{rateBasis==="day"?"Day rate · 10 hours included · 1.5× overtime after 10":"Hourly · actual hours · 1.5× OT after 10 hours"} <span className="muted text-xs">· Locked once crew offers are sent</span></p>:
    <div className="space-y-2">
     <select aria-label="Job pay structure" value={payBasis} disabled={busy} onChange={e=>setPayBasis(e.target.value as RateBasis)}>
      <option value="hourly">Hourly — 1.5× OT after 10 hours</option>
      <option value="day">Day rate — 10-hour base + 1.5× overtime</option>
     </select>
     <button type="button" className="pill text-blue-300" disabled={busy||payBasis===rateBasis} onClick={savePayBasis}>{busy?"Saving…":"Save pay structure"}</button>
    </div>}
  </section>
  <details className="panel !p-4 sm:!p-5 group" id="job-schedule">
   <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden flex flex-wrap items-center justify-between gap-3">
    <div className="min-w-0">
     <h2 className="font-semibold text-lg">Job schedule</h2>
     <p className="muted text-sm mt-1">{formatJobTime(startsAt,timeZone)}{endsAt?" – "+formatJobTime(endsAt,timeZone):""} · {zoneLabel(timeZone)}</p>
    </div>
    <span className="text-blue-300 text-sm group-open:hidden">Edit</span>
    <span className="text-blue-300 text-sm hidden group-open:inline">Close</span>
   </summary>
   <div className="space-y-3 pt-4">
    {!timeZone&&<p role="status" className="text-amber-200 text-sm">Confirm this legacy job’s venue time zone. Its saved times are currently shown in UTC.</p>}
    <TimeZoneSelect value={zone} onChange={next=>{setZone(next);if(next){setStartInput(jobDateTimeInput(startsAt,next));setEndInput(endsAt?jobDateTimeInput(endsAt,next):"");}}} disabled={busy}/>
    <p className="muted text-xs">Call times use the selected venue time zone. Changing zones redisplays the saved schedule; then edit the call times if needed.</p>
    <div className="grid gap-3 sm:grid-cols-2">
     <label className="block min-w-0"><span className="label">Start date & time</span><input type="datetime-local" value={startInput} disabled={busy} onChange={e=>setStartInput(e.target.value)}/></label>
     <label className="block min-w-0"><span className="label">End date & time (optional)</span><input type="datetime-local" value={endInput} disabled={busy} onChange={e=>setEndInput(e.target.value)}/></label>
    </div>
    <button type="button" className="primary !px-4 !py-2.5 text-sm" disabled={busy||!zone||!startInput||(zone===timeZone&&startInput===toLocal(startsAt)&&endInput===toLocal(endsAt))} onClick={saveDates}>Save dates</button>
   </div>
  </details>
</div>:<div className="space-y-5 scroll-mt-24" id="job-staffing">
  <CrewBoard offers={existingOffers} technicians={technicians} busy={busy} onConfirm={o=>updateBooking(o,"confirmed")} onUndo={o=>updateBooking(o,"accepted")} onRelease={release} onSaveReturn={saveReturnCall} invoicedOfferIds={invoicedOfferIds}/>
  {notice&&<p className="text-green-300 text-sm" role="status">{notice}</p>}
  {error&&<p className="text-red-400 text-sm" role="alert">{error}</p>}
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
  <details className="panel !p-4 sm:!p-5 group" id="send-offers" open>
   <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-2">
    <h2 className="font-semibold text-lg">Send job offers</h2>
    <span className="text-blue-300 text-sm group-open:hidden">Select crew</span>
    <span className="text-blue-300 text-sm hidden group-open:inline">Close</span>
   </summary>
   <div className="space-y-3 pt-4">
   <p className="muted text-xs">Select technicians, then set each person’s position and {payBasis==="day"?"10-hour day":"hourly"} rate. {payBasis==="day"?"Overtime after 10 hours is 1.5× the base hourly equivalent.":"Hourly invoices bill actual hours, with 1.5× OT after 10 billable hours."} Offers are not confirmed bookings.</p>
   {status!=="open"&&<p className="text-amber-200 text-sm">Set job status to Open to send offers.</p>}
   <div className="space-y-2 border border-slate-700 rounded-xl p-3">
    <input type="search" aria-label="Search candidates" placeholder="Search names, city, specialties…" value={search} onChange={e=>setSearch(e.target.value)}/>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
     <label><span className="label">Home state</span><select value={stateFilter} onChange={e=>setStateFilter(e.target.value)}><option value="">All states</option>{US_STATES.map(([code,name])=><option key={code} value={code}>{name} ({code})</option>)}</select></label>
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
    <div className="space-y-2 max-h-72 overflow-auto">{filteredAvailable.map(t=><div key={t.user_id} className={"rounded-lg border px-3 py-3 space-y-3 "+(selected.includes(t.user_id)?"border-blue-500/60 bg-blue-500/5":"border-slate-700")}>
     <label className="flex items-center gap-3 cursor-pointer">
      <input className="!w-auto" type="checkbox" checked={selected.includes(t.user_id)} onChange={()=>toggle(t.user_id)} />
      <span className="min-w-0"><span className="font-medium text-sm block">{t.full_name||"Incomplete profile"}</span>
       <span className="muted text-xs block break-words">{[locationText(t.city,t.state),t.roles?.slice(0,2).join(", ")].filter(Boolean).join(" · ")}{ratingFilter&&<span className="text-blue-300"> · {ratingFilter} {ratings.find(r=>r.technician_id===t.user_id&&r.skill===ratingFilter)?.level}/5</span>}</span></span>
     </label>
     {selected.includes(t.user_id)&&<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-slate-700 pt-3">
      <label className="block"><span className="label">Offered position *</span><select value={offerDetails[t.user_id]?.position||""} onChange={e=>setOfferDetails(prev=>({...prev,[t.user_id]:{position:e.target.value,rate:prev[t.user_id]?.rate||"",returnFlat:prev[t.user_id]?.returnFlat||""}}))}>
       <option value="">Choose a position</option>{(t.roles||[]).map(role=><option key={role} value={role}>{role}</option>)}<option value="Other / special assignment">Other / special assignment</option>
      </select></label>
      <label className="block"><span className="label">Agreed {payBasis==="day"?"day":"hourly"} rate (USD) *</span><input type="number" min="0.01" max="100000" step="0.01" inputMode="decimal" placeholder={payBasis==="day"?"e.g. 600.00":"e.g. 50.00"} value={offerDetails[t.user_id]?.rate||""} onChange={e=>setOfferDetails(prev=>({...prev,[t.user_id]:{position:prev[t.user_id]?.position||"",rate:e.target.value,returnFlat:prev[t.user_id]?.returnFlat||""}}))}/></label>
      <label className="block sm:col-span-2"><span className="label">One-time return-call flat amount (USD, optional)</span>
       <input type="number" min="0.01" max="100000" step="0.01" inputMode="decimal" placeholder="e.g. 240.00 · leave blank for normal overtime"
        value={offerDetails[t.user_id]?.returnFlat||""}
        onChange={e=>setOfferDetails(prev=>({...prev,[t.user_id]:{position:prev[t.user_id]?.position||"",rate:prev[t.user_id]?.rate||"",returnFlat:e.target.value}}))}/>
       <span className="muted text-xs block mt-1">Applies once per invoice if a separate return-call period is logged, replacing standard pay for that period.</span>
      </label>
     </div>}
    </div>)}</div>}
   <button type="button" className="primary w-full" disabled={busy||status!=="open"||!selected.length} onClick={sendOffers}>
    {busy?"Saving…":`Offer job to ${selected.length} technician${selected.length===1?"":"s"}`}
   </button>
   <p className="muted text-xs">Offers appear in technicians' app accounts; this does not send SMS or push notifications.</p>
   </div>
  </details>
</div>}
  {mode==="setup"&&notice&&<p className="text-green-300 text-sm" role="status">{notice}</p>}
  {mode==="setup"&&error&&<p className="text-red-400 text-sm" role="alert">{error}</p>}
 </div>;
}
