"use client";
import {crewCounts} from "@/lib/dispatch";
export type CrewOffer={id:string;technician_id:string;status:string;offer_position:string;offer_rate:string};
export default function CrewBoard({offers,technicians,busy,onConfirm,onUndo,onRelease}:{offers:CrewOffer[];technicians:{user_id:string;full_name:string}[];busy:boolean;onConfirm:(offer:CrewOffer)=>void;onUndo:(offer:CrewOffer)=>void;onRelease:(offer:CrewOffer)=>void}) {
 const counts=crewCounts(offers);
 const names=new Map(technicians.map(t=>[t.user_id,t.full_name]));
 const groups=[
  {status:"pending",title:"Awaiting response",description:"These technicians haven’t responded yet.",color:"text-amber-200",empty:"No unanswered offers."},
  {status:"accepted",title:"Accepted · confirm next",description:"Available and interested. Confirm each booking to finalize your crew.",color:"text-blue-300",empty:"No offers waiting for your confirmation."},
  {status:"confirmed",title:"Confirmed crew",description:"These bookings are finalized and appear on the crew’s schedule.",color:"text-green-300",empty:"No confirmed crew yet. Accepted offers appear above for review."},
 ];
 function row(o:CrewOffer){return <li key={o.id} className="border-t border-slate-700/70 py-4 space-y-3 sm:flex sm:items-center sm:justify-between sm:gap-4 sm:space-y-0">
  <div className="min-w-0"><p className="font-semibold break-words">{names.get(o.technician_id)||"Technician"}</p><p className="muted text-sm mt-1 break-words">{o.offer_position||"Position not specified"}</p>{o.offer_rate&&<p className="text-sm mt-1 text-slate-200">{o.offer_rate}</p>}</div>
  <div className="flex flex-wrap gap-2 shrink-0">
   {o.status==="accepted"&&<button type="button" className="primary min-h-11 !px-4 text-sm" disabled={busy} onClick={()=>onConfirm(o)} aria-label={`Confirm booking for ${names.get(o.technician_id)||"technician"}`}>Confirm booking</button>}
   {o.status==="confirmed"&&<button type="button" className="pill min-h-11" disabled={busy} onClick={()=>onUndo(o)} aria-label={`Undo confirmation for ${names.get(o.technician_id)||"technician"}`}>Undo confirmation</button>}
   <button type="button" className="button-danger" disabled={busy} onClick={()=>onRelease(o)} aria-label={`${o.status==="pending"?"Withdraw offer for":"Release"} ${names.get(o.technician_id)||"technician"}`}>{o.status==="pending"?"Withdraw":"Release"}</button>
  </div>
 </li>}
 return <section className="space-y-4" aria-label="Crew and bookings">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Crew & bookings</h2><p className="muted text-sm mt-1">{counts.pending+counts.accepted+counts.confirmed} active offers · {counts.confirmed} confirmed</p></div><a href="#send-offers" className="primary">+ Offer this job</a></div>
  <nav aria-label="Crew response groups" className="grid grid-cols-3 gap-2">
   {groups.map(g=><a key={g.status} href={`#crew-${g.status}`} className="rounded-xl border border-slate-700 bg-slate-900/60 p-3 focus-visible:outline-2 focus-visible:outline-blue-400"><strong className={`block text-2xl tabular-nums ${g.color}`}>{counts[g.status as keyof typeof counts]}</strong><span className="text-xs text-slate-300">{g.status==="pending"?"Awaiting response":g.status==="accepted"?"Accepted":"Confirmed"}</span></a>)}
  </nav>
  {groups.map(group=>{const members=offers.filter(o=>o.status===group.status);return <section key={group.status} id={`crew-${group.status}`} className="panel !p-4 sm:!p-5 scroll-mt-24" aria-labelledby={`heading-${group.status}`}>
   <h3 id={`heading-${group.status}`} className={`font-semibold ${group.color}`}>{group.title} <span className="ml-1">({members.length})</span></h3><p className="muted text-xs mt-2 mb-3">{group.description}</p>
   {members.length?<ul>{members.map(row)}</ul>:<p className="text-sm text-slate-300 border-t border-slate-700/70 pt-3">{group.empty}</p>}
  </section>})}
  {offers.some(o=>o.status==="cancelled"||o.status==="declined")&&<details className="panel !p-4"><summary className="cursor-pointer text-sm muted">Inactive offers ({offers.filter(o=>o.status==="cancelled"||o.status==="declined").length})</summary><ul>{offers.filter(o=>o.status==="cancelled"||o.status==="declined").map(row)}</ul></details>}
 </section>;
}
