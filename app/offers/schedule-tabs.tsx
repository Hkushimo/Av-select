"use client";
import {useMemo,useState} from "react";
import MarkActivitySeen from "@/app/mark-activity-seen";
import {OfferActions} from "./responses";
import {SignalFlowView,type FlowConnection} from "@/app/admin/jobs/signal-flow";

type Job={title:string;venue:string;address?:string;signal_flow?:FlowConnection[];starts_at:string;ends_at:string|null;rate:string;details:string;status:string};
export type ScheduleOffer={id:string;status:string;job:Job|null};
const dayKey=(date:Date)=>[date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-");
const dateLabel=(iso:string)=>new Date(iso).toLocaleString("en-US",{dateStyle:"medium",timeStyle:"short"});
const timeLabel=(iso:string)=>new Date(iso).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});

function OfferCard({offer}:{offer:ScheduleOffer}){
 const job=offer.job;
 return <article className="panel space-y-3">
  <div className="flex items-start justify-between gap-3">
   <h2 className="text-lg sm:text-xl font-bold break-words">{job?.title||"Job"}</h2>
   <span className={"pill text-xs capitalize shrink-0 "+(offer.status==="confirmed"?"text-green-300":offer.status==="accepted"?"text-blue-300":"text-amber-200")}>{offer.status==="confirmed"?"Booked":offer.status}</span>
  </div>
  <p className="muted text-sm">{job?.venue||"Venue TBD"}</p>
  {job?.address&&<a href={"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(job.address)} target="_blank" rel="noopener noreferrer" className="text-blue-300 text-sm underline break-words">{job.address} ↗ Map</a>}
  {!!job?.signal_flow?.length&&<details className="rounded-lg border border-slate-700 p-3"><summary className="cursor-pointer text-sm font-medium">Equipment & signal flow</summary><div className="mt-3"><SignalFlowView connections={job.signal_flow}/></div></details>}
  {job?.starts_at&&<p className="text-sm"><span className="muted">Start: </span>{dateLabel(job.starts_at)}</p>}
  {job?.ends_at&&<p className="text-sm"><span className="muted">End: </span>{dateLabel(job.ends_at)}</p>}
  {job?.rate&&<p className="text-sm"><span className="muted">Rate: </span>{job.rate}</p>}
  {job?.details&&<p className="text-sm whitespace-pre-wrap break-words">{job.details}</p>}
  {offer.status==="pending"&&<OfferActions id={offer.id}/>}
  {offer.status==="confirmed"&&<p className="text-green-300 text-xs">Booking confirmed by the organizer.</p>}
  {offer.status==="accepted"&&<p className="text-blue-300 text-xs">Accepted · Awaiting staffing confirmation. This is not yet a confirmed booking.</p>}
 </article>;
}

export default function ScheduleTabs({offers,userId}:{offers:ScheduleOffer[];userId:string}){
 const [tab,setTab]=useState<"offers"|"calendar">("offers");
 const [today]=useState(()=>new Date());
 const [month,setMonth]=useState(()=>new Date(today.getFullYear(),today.getMonth(),1));
 const [selectedDay,setSelectedDay]=useState(()=>dayKey(today));
 const accepted=useMemo(()=>offers.filter(o=>(o.status==="accepted"||o.status==="confirmed")&&o.job?.starts_at).sort((a,b)=>new Date(a.job!.starts_at).getTime()-new Date(b.job!.starts_at).getTime()),[offers]);
 const pending=offers.filter(o=>o.status==="pending");
 const other=offers.filter(o=>o.status==="accepted"||o.status==="confirmed");
 const byDay=useMemo(()=>{
  const map=new Map<string,ScheduleOffer[]>();
  for(const offer of accepted){
   const start=new Date(offer.job!.starts_at);
   const end=offer.job?.ends_at?new Date(offer.job.ends_at):start;
   const lastDay=new Date(Math.max(start.getTime(),end.getTime()));
   const endTime=new Date(lastDay.getFullYear(),lastDay.getMonth(),lastDay.getDate()).getTime();
   const cursor=new Date(start.getFullYear(),start.getMonth(),start.getDate());
   let count=0;
   while(cursor.getTime()<=endTime&&count<367){
    const key=dayKey(cursor);
    map.set(key,[...(map.get(key)||[]),offer]);
    cursor.setDate(cursor.getDate()+1);
    count++;
   }
  }
  return map;
 },[accepted]);
 const days=useMemo(()=>{
  const first=new Date(month.getFullYear(),month.getMonth(),1);
  const start=new Date(first);start.setDate(1-first.getDay());
  return Array.from({length:42},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return d});
 },[month]);
 const chosen=byDay.get(selectedDay)||[];
 const monthLabel=month.toLocaleDateString("en-US",{month:"long",year:"numeric"});
 function moveMonth(offset:number){
  const next=new Date(month.getFullYear(),month.getMonth()+offset,1);
  setMonth(next);
  setSelectedDay(dayKey(next));
 }
 const selectedDate=new Date(Number(selectedDay.slice(0,4)),Number(selectedDay.slice(5,7))-1,Number(selectedDay.slice(8,10)));
 return <div className="space-y-4">
  <div role="tablist" aria-label="My Schedule sections" className="flex rounded-xl bg-slate-800 p-1 gap-1">
   <button type="button" role="tab" aria-selected={tab==="offers"} onClick={()=>setTab("offers")} className={"flex-1 rounded-lg px-3 py-3 text-sm font-semibold "+(tab==="offers"?"bg-blue-600 text-white":"text-slate-300 hover:bg-slate-700")}>Job offers{pending.length>0?` (${pending.length})`:""}</button>
   <button type="button" role="tab" aria-selected={tab==="calendar"} onClick={()=>setTab("calendar")} className={"flex-1 rounded-lg px-3 py-3 text-sm font-semibold "+(tab==="calendar"?"bg-blue-600 text-white":"text-slate-300 hover:bg-slate-700")}>Calendar</button>
  </div>
  {tab==="offers"?<div role="tabpanel" className="space-y-4">
    <MarkActivitySeen userId={userId} kind="offers"/>
    {pending.length>0&&<section className="space-y-3"><h2 className="font-semibold text-lg">New opportunities <span className="muted text-sm">({pending.length})</span></h2>{pending.map(o=><OfferCard key={o.id} offer={o}/>)}</section>}
    {other.length>0&&<section className="space-y-3"><h2 className="font-semibold text-lg">Accepted & booked jobs <span className="muted text-sm">({other.length})</span></h2>{other.map(o=><OfferCard key={o.id} offer={o}/>)}</section>}
    {!pending.length&&!other.length&&<div className="panel muted text-sm">No job offers right now. New opportunities will appear here when an admin sends them.</div>}
   </div>:<div role="tabpanel" className="space-y-4">
    <div className="flex items-center justify-between flex-wrap gap-x-4 gap-y-2">
     <p className="muted text-xs">Accepted shifts are tentative until confirmed.</p>
     <div className="flex items-center gap-3 text-xs muted">
      <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"/>Accepted</span>
      <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500"/>Booked</span>
     </div>
    </div>
    <section className="panel space-y-4 !p-3 sm:!p-5">
     <div className="flex items-center justify-between gap-2">
      <button type="button" onClick={()=>moveMonth(-1)} className="pill" aria-label="Previous month">‹</button>
      <h2 className="font-semibold text-lg text-center">{monthLabel}</h2>
      <button type="button" onClick={()=>moveMonth(1)} className="pill" aria-label="Next month">›</button>
     </div>
     <div className="grid grid-cols-7 gap-1 text-center">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=><div key={d} className="muted text-xs py-1">{d}</div>)}
      {days.map(d=>{
       const key=dayKey(d),dayOffers=byDay.get(key)||[],acceptedCount=dayOffers.filter(o=>o.status==="accepted").length,confirmedCount=dayOffers.filter(o=>o.status==="confirmed").length,isCurrentMonth=d.getMonth()===month.getMonth(),selected=key===selectedDay,isToday=key===dayKey(today);
       return <button type="button" key={key} onClick={()=>setSelectedDay(key)}
        aria-label={`${d.toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}, ${acceptedCount} accepted, ${confirmedCount} booked`}
        aria-pressed={selected}
        className={"min-h-14 sm:min-h-16 rounded-lg flex flex-col items-center justify-start py-1.5 gap-1 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400 hover:bg-slate-800/50"+(isCurrentMonth?" text-white":" text-slate-500")}>
        <span className={"flex h-9 w-9 items-center justify-center rounded-full font-semibold "+(selected?"border border-blue-400 bg-blue-600/20 text-white":isToday?"text-blue-300":"")}>{d.getDate()}</span>
        {(acceptedCount>0||confirmedCount>0)&&<span className="flex flex-wrap items-center justify-center gap-1" aria-hidden="true">
         {acceptedCount>0&&<span className="min-w-4 h-4 px-1 rounded-full bg-blue-500 text-[10px] font-bold leading-4 text-white">{acceptedCount}</span>}
         {confirmedCount>0&&<span className="min-w-4 h-4 px-1 rounded-full bg-green-500 text-[10px] font-bold leading-4 text-white">{confirmedCount}</span>}
        </span>}
       </button>;
      })}
     </div>
    </section>
    <section className="space-y-3">
     <h2 className="text-lg font-semibold">{selectedDate.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</h2>
     {!chosen.length?<div className="panel muted text-sm">No jobs scheduled for this date.</div>:
      chosen.map(o=><article key={o.id} className="panel space-y-2">
       <div className="flex items-center justify-between gap-2"><h3 className="font-semibold">{o.job?.title||"Job"}</h3><span className={o.status==="confirmed"?"text-green-300 text-xs shrink-0":"text-blue-300 text-xs shrink-0"}>{o.status==="confirmed"?"Booked":"Accepted"}</span></div>
       <p className="text-sm muted">{o.job?.venue||"Venue TBD"}</p>
       {o.job?.address&&<a href={"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(o.job.address)} target="_blank" rel="noopener noreferrer" className="text-blue-300 text-xs underline break-words">{o.job.address} ↗ Map</a>}
       {!!o.job?.signal_flow?.length&&<details className="rounded-lg border border-slate-700 p-3"><summary className="cursor-pointer text-sm">Equipment & signal flow</summary><div className="mt-3"><SignalFlowView connections={o.job.signal_flow}/></div></details>}
       {o.job?.starts_at&&<p className="text-sm">{dateLabel(o.job.starts_at)}{o.job.ends_at?` – ${timeLabel(o.job.ends_at)}`:""}</p>}
       {o.job?.rate&&<p className="text-sm">{o.job.rate}</p>}
       {o.job?.details&&<p className="text-sm whitespace-pre-wrap break-words">{o.job.details}</p>}
       <p className={o.status==="confirmed"?"text-xs text-green-300":"text-xs text-blue-300"}>{o.status==="confirmed"?"Booking confirmed":"Awaiting staffing confirmation"}</p>
      </article>)}
    </section>
    {!accepted.length&&<p className="muted text-sm">Accept a job offer to see it on your calendar.</p>}
   </div>}
 </div>;
}
