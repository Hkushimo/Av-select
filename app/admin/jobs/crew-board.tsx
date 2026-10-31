"use client";
import {crewCounts} from "@/lib/dispatch";
import {useState} from "react";
import {currency} from "@/lib/invoicing";
export type CrewOffer={id:string;technician_id:string;status:string;offer_position:string;offer_rate:string;return_call_flat_amount:number|null};
export default function CrewBoard({offers,technicians,busy,onConfirm,onUndo,onRelease,onSaveReturn,invoicedOfferIds=[]}:{offers:CrewOffer[];technicians:{user_id:string;full_name:string}[];busy:boolean;onConfirm:(offer:CrewOffer)=>void;onUndo:(offer:CrewOffer)=>void;onRelease:(offer:CrewOffer)=>void;onSaveReturn:(offer:CrewOffer,amount:number|null)=>Promise<boolean>;invoicedOfferIds?:string[]}) {
 const counts=crewCounts(offers);
 const [editValues,setEditValues]=useState<Record<string,string>>({});
 const [editing,setEditing]=useState<string|null>(null);
 const [validationError,setValidationError]=useState("");
 const invoiced=new Set(invoicedOfferIds);
 async function saveReturn(o:CrewOffer){
  const raw=(editValues[o.id]??String(o.return_call_flat_amount??"")).trim();
  const amount=raw===""?null:Number(raw);
  if(amount!==null&&(!Number.isFinite(amount)||amount<=0||amount>100000||Math.abs(amount*100-Math.round(amount*100))>0.000001)){
   setValidationError("Enter a valid amount with up to two decimal places.");return;
  }
  setValidationError("");
  const ok=await onSaveReturn(o,amount);
  if(ok){setValidationError("");setEditing(null);setEditValues(values=>{const next={...values};delete next[o.id];return next})}
 }

 const names=new Map(technicians.map(t=>[t.user_id,t.full_name]));
 const groups=[
  {status:"pending",title:"Awaiting response",description:"These technicians haven’t responded yet.",color:"text-amber-200",empty:"No unanswered offers."},
  {status:"accepted",title:"Accepted · confirm next",description:"Available and interested. Confirm each booking to finalize your crew.",color:"text-blue-300",empty:"No offers waiting for your confirmation."},
  {status:"confirmed",title:"Confirmed crew",description:"These bookings are finalized and appear on the crew’s schedule.",color:"text-green-300",empty:"No confirmed crew yet. Accepted offers appear above for review."},
 ];
 function row(o:CrewOffer){return <li key={o.id} className="border-t border-slate-700/70 py-4 space-y-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-4 sm:space-y-0">
  <div className="min-w-0"><p className="font-semibold break-words">{names.get(o.technician_id)||"Technician"}</p><p className="muted text-sm mt-1 break-words">{o.offer_position||"Position not specified"}</p>{o.offer_rate&&<p className="text-sm mt-1 text-slate-200">{o.offer_rate}</p>}</div>
  <div className="flex flex-wrap gap-2 shrink-0">
   {o.status==="pending"&&<button type="button" className="primary" disabled={busy} onClick={()=>onConfirm(o)} aria-label={`Book ${names.get(o.technician_id)||"technician"} directly`}>Book directly</button>}
   {o.status==="accepted"&&<button type="button" className="primary min-h-11 !px-4 text-sm" disabled={busy} onClick={()=>onConfirm(o)} aria-label={`Confirm booking for ${names.get(o.technician_id)||"technician"}`}>Confirm booking</button>}
   {o.status==="confirmed"&&<button type="button" className="pill min-h-11" disabled={busy} onClick={()=>onUndo(o)} aria-label={`Undo confirmation for ${names.get(o.technician_id)||"technician"}`}>Undo confirmation</button>}
   <button type="button" className="button-danger" disabled={busy} onClick={()=>onRelease(o)} aria-label={`${o.status==="pending"?"Withdraw offer for":"Release"} ${names.get(o.technician_id)||"technician"}`}>{o.status==="pending"?"Withdraw":"Release"}</button>
  </div>
  {o.return_call_flat_amount!==null&&<p className="text-xs text-green-300 sm:col-span-2">Approved one-time return call: {currency(Number(o.return_call_flat_amount))}</p>}
  {invoiced.has(o.id)?<p className="muted text-xs sm:col-span-2">Pay terms locked after invoice submission.</p>:
   o.status!=="declined"&&o.status!=="cancelled"&&<div className="sm:col-span-2 w-full">
    {editing===o.id?<div className="rounded-lg border border-slate-700 p-3 space-y-2">
     <label className="block"><span className="label">One-time flat return-call amount (USD)</span>
      <input type="number" inputMode="decimal" min="0.01" max="100000" step="0.01"
       placeholder="e.g. 240.00 (blank = none)" disabled={busy}
       value={editValues[o.id]??String(o.return_call_flat_amount??"")}
       onChange={event=>setEditValues(values=>({...values,[o.id]:event.target.value}))}/></label>
     <p className="muted text-xs">Optional: replaces standard pay/OT for one extra clock-in after the main call. Admin-approved and fixed on invoice submission.</p>
     {validationError&&<p role="alert" className="text-amber-200 text-xs">{validationError}</p>}
     <div className="flex gap-2 flex-wrap">
      <button type="button" className="pill text-blue-300" disabled={busy} onClick={()=>void saveReturn(o)}>Save agreement</button>
      <button type="button" className="pill" disabled={busy} onClick={()=>setEditing(null)}>Cancel</button>
     </div>
    </div>:<button type="button" className="text-blue-300 text-xs underline" disabled={busy} onClick={()=>{setEditing(o.id);setValidationError("")}}>
     {o.return_call_flat_amount===null?"Approve a return-call payment":"Edit return-call agreement"}
    </button>}
   </div>}
 </li>}
 return <section className="space-y-4" aria-label="Crew and bookings">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Crew & bookings</h2><p className="muted text-sm mt-1">{counts.pending+counts.accepted+counts.confirmed} active offers · {counts.confirmed} confirmed</p></div><a href="#send-offers" className="primary">+ Add crew</a></div>
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
