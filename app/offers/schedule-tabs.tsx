"use client";
import {useMemo,useState} from "react";
import Link from "next/link";
import {finishedAt} from "@/lib/invoicing";
import MarkActivitySeen from "@/app/mark-activity-seen";
import {OfferActions} from "./responses";
import AppIcon from "@/app/app-icon";
import {FlowTabs,type DepartmentFlow} from "@/app/admin/jobs/department-flow";

type Job={title:string;venue:string;address?:string;signal_flow?:DepartmentFlow[];starts_at:string;ends_at:string|null;rate:string;details:string;status:string};
export type ScheduleOffer={id:string;status:string;offer_position:string;offer_rate:string;invoice_id:string|null;job:Job|null};
const dayKey=(date:Date)=>[date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-");
const dateLabel=(iso:string)=>new Date(iso).toLocaleString("en-US",{dateStyle:"medium",timeStyle:"short"});
const timeLabel=(iso:string)=>new Date(iso).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});

function OfferCard({offer,archived=false}:{offer:ScheduleOffer;archived?:boolean}){
 const job=offer.job;
 const booked=offer.status==="confirmed",accepted=offer.status==="accepted";
 const statusText=archived?(booked?"Completed":"Past offer"):booked?"Booked":accepted?"Accepted":"Pending";
 const start=job?.starts_at?new Date(job.starts_at):null;
 const end=job?.ends_at?new Date(job.ends_at):null;
 const date=(d:Date)=>d.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
 const time=(d:Date)=>d.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
 const pay=offer.offer_rate||job?.rate||"";
 return <article className={"panel !p-4 sm:!p-5 space-y-4 "+(archived?"!bg-[#101722] !border-slate-800 text-slate-400":"")}>
  <div className="flex items-start justify-between gap-3">
   <div className="min-w-0">
    <h3 className="text-xl font-bold leading-snug break-words">{job?.title||"Job"}</h3>
    <p className="muted text-sm mt-1">{job?.venue||"Venue TBD"}</p>
   </div>
   <span className={"shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold "+(archived?"border-slate-700 bg-slate-800 text-slate-400":booked?"border-green-600/50 bg-green-500/10 text-green-300":accepted?"border-blue-500/50 bg-blue-500/10 text-blue-300":"border-amber-500/50 bg-amber-500/10 text-amber-200")}>{statusText}</span>
  </div>
  <div className="rounded-xl border border-slate-700/70 bg-slate-900/40 divide-y divide-slate-700/70">
   {offer.offer_position&&<div className="flex items-start gap-3 px-3 py-3">
    <AppIcon name="jobs" size={18} className="text-blue-300 shrink-0 mt-0.5"/>
    <div className="min-w-0"><p className="muted text-xs">Offered position</p><p className="text-sm font-semibold break-words">{offer.offer_position}</p></div>
   </div>}
   {start&&<div className="flex items-start gap-3 px-3 py-3">
    <AppIcon name="calendar" size={18} className="text-blue-300 shrink-0 mt-0.5"/>
    <div className="min-w-0 text-sm">
     <p className="font-semibold">{date(start)}{end&&start.toDateString()!==end.toDateString()?" – "+date(end):""}</p>
     <p className="muted mt-0.5">{time(start)}{end?" – "+(start.toDateString()===end.toDateString()?time(end):date(end)+", "+time(end)):""}</p>
    </div>
   </div>}
   {pay&&<div className="flex items-center justify-between gap-3 px-3 py-3">
    <div className="flex items-center gap-3"><AppIcon name="wallet" size={18} className={archived?"text-slate-400 shrink-0":"text-green-300 shrink-0"}/><span className="muted text-sm">{offer.offer_rate?"Your rate":"Job rate"}</span></div>
    <span className={(archived?"text-slate-300":"text-green-300")+" font-bold text-base text-right break-words"}>{pay}</span>
   </div>}
   {job?.address&&<a href={"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(job.address)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-3 text-blue-300 hover:bg-slate-800/40">
    <AppIcon name="map-pin" size={18} className="shrink-0"/>
    <span className="min-w-0 text-sm break-words underline underline-offset-2">View location <span aria-hidden="true">↗</span></span>
   </a>}
  </div>
  {(!!job?.details||!!job?.signal_flow?.length)&&<details className="group rounded-xl border border-slate-700/70">
   <summary className="cursor-pointer flex items-center justify-between gap-2 px-3 py-3 text-sm font-semibold list-none [&::-webkit-details-marker]:hidden">
    <span>Production details</span>
    <span className="text-blue-300 text-xs group-open:hidden">View ↓</span>
    <span className="text-blue-300 text-xs hidden group-open:inline">Hide ↑</span>
   </summary>
   <div className="space-y-4 border-t border-slate-700 px-3 py-3">
    {job?.address&&<div><p className="label">Address</p><p className="text-sm break-words">{job.address}</p></div>}
    {job?.details&&<div className="space-y-1"><p className="label">Call details</p><p className="text-sm whitespace-pre-wrap break-words">{job.details}</p></div>}
    {!!job?.signal_flow?.length&&<div className="space-y-2"><p className="label">Equipment & signal flow</p><FlowTabs connections={job.signal_flow||[]}/></div>}
   </div>
  </details>}
  {offer.status==="pending"&&!archived&&<OfferActions id={offer.id}/>}
  {booked&&archived&&<Link href={offer.invoice_id?"/billing/invoices/"+offer.invoice_id:"/billing/create/"+offer.id} className="inline-flex items-center justify-center gap-2 w-full rounded-xl border border-blue-500/50 bg-blue-500/10 text-blue-200 px-4 py-3 text-sm font-semibold hover:bg-blue-500/20">
   <AppIcon name="wallet" size={17}/>{offer.invoice_id?"View invoice":"Create invoice"}
  </Link>}
  {accepted&&<p className="text-blue-300 text-xs">Awaiting admin confirmation · Not yet booked</p>}
 </article>;
}

export default function ScheduleTabs({offers,userId}:{offers:ScheduleOffer[];userId:string}){
 const [tab,setTab]=useState<"offers"|"calendar">("offers");
 const [today]=useState(()=>new Date());
 const [month,setMonth]=useState(()=>new Date(today.getFullYear(),today.getMonth(),1));
 const [selectedDay,setSelectedDay]=useState(()=>dayKey(today));
 const accepted=useMemo(()=>offers.filter(o=>(o.status==="accepted"||o.status==="confirmed")&&o.job?.starts_at).sort((a,b)=>new Date(a.job!.starts_at).getTime()-new Date(b.job!.starts_at).getTime()),[offers]);
 const [now]=useState(()=>Date.now());
 const past=offers.filter(o=>o.job&&finishedAt(o.job)<=now)
  .sort((a,b)=>finishedAt(b.job!)-finishedAt(a.job!));
 const active=offers.filter(o=>!o.job||finishedAt(o.job)>now);
 const pending=active.filter(o=>o.status==="pending");
 const other=active.filter(o=>o.status==="accepted"||o.status==="confirmed");
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
    {!pending.length&&!other.length&&<div className="panel muted text-sm">No active offers or bookings. New jobs will appear here when your admin sends them.</div>}
    {past.length>0&&<details className="rounded-2xl border border-slate-800 bg-[#101722] group">
     <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden px-4 py-4 flex items-center justify-between gap-2">
      <span className="font-semibold text-slate-300">Past jobs <span className="text-slate-500 font-normal">({past.length})</span></span>
      <span className="text-xs text-slate-400 group-open:hidden">Show ↓</span><span className="text-xs text-slate-400 hidden group-open:inline">Hide ↑</span>
     </summary>
     <div className="border-t border-slate-800 px-3 pb-3 pt-3 space-y-3">
      <p className="text-xs text-slate-500 px-1">Past jobs are kept for your records. Invoices are available for confirmed, finished bookings.</p>
      {past.map(o=><OfferCard key={o.id} offer={o} archived/>)}
     </div>
    </details>}
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
       {(o.job?.signal_flow?.length||0)>0&&<details className="rounded-lg border border-slate-700 p-3"><summary className="cursor-pointer text-sm">Your equipment & signal flow</summary><div className="mt-3"><FlowTabs connections={o.job?.signal_flow||[]}/></div></details>}
       {o.job?.starts_at&&<p className="text-sm">{dateLabel(o.job.starts_at)}{o.job.ends_at?` – ${timeLabel(o.job.ends_at)}`:""}</p>}
       {o.offer_position&&<p className="text-sm font-semibold">{o.offer_position}</p>}
       {(o.offer_rate||o.job?.rate)&&<p className="text-sm inline-flex items-center gap-2"><AppIcon name="wallet" size={16} className="text-green-300"/><span>{o.offer_rate||o.job?.rate}</span></p>}
       {o.job?.details&&<p className="text-sm whitespace-pre-wrap break-words">{o.job.details}</p>}
       {o.status==="confirmed"&&o.job&&finishedAt(o.job)<=now&&<Link className="inline-flex items-center gap-2 text-blue-300 text-sm font-semibold py-2" href={o.invoice_id?"/billing/invoices/"+o.invoice_id:"/billing/create/"+o.id}><AppIcon name="wallet" size={16}/>{o.invoice_id?"View invoice":"Create invoice"} →</Link>}
       <p className={o.status==="confirmed"?"text-xs text-green-300":"text-xs text-blue-300"}>{o.status==="confirmed"?"Booking confirmed":"Awaiting staffing confirmation"}</p>
      </article>)}
    </section>
    {!accepted.length&&<p className="muted text-sm">Accept a job offer to see it on your calendar.</p>}
   </div>}
 </div>;
}
