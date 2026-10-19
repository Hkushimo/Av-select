"use client";
import {useState,type FormEvent} from "react";
import {useRouter} from "next/navigation";
import {browserDb} from "@/lib/supabase";
import {currency,calculateInvoiceDays,workDatesForJob,DAY_INCLUDED_HOURS,DAY_OT_MULTIPLIER,type RateBasis,type InvoiceWorkDay} from "@/lib/invoicing";
import AppIcon from "@/app/app-icon";

type JobInfo={title:string;venue:string;address:string;starts_at:string;ends_at:string|null;rate:string;rate_basis:RateBasis;status:string};
type TechnicianInfo={name:string;email:string;phone:string;location:string};
type DateEntry={date:string;hours:string;lunch_taken:boolean;extra:boolean};
function localDate(value:Date){return new Date(value.getTime()-value.getTimezoneOffset()*60000).toISOString().slice(0,10)}
function dateLabel(date:string){return new Date(date+"T12:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}
function validHoursText(text:string){
 if(!text.trim())return true;
 const n=Number(text);
 return Number.isFinite(n)&&n>=0&&n<=24&&Math.abs(n*100-Math.round(n*100))<0.000001;
}
export default function InvoiceForm({offerId,job,position,originalRate,rateBasis,agreedRate,technician}:{
 offerId:string;job:JobInfo;position:string;originalRate:string;rateBasis:RateBasis;agreedRate:number;technician:TechnicianInfo;
}){
 const router=useRouter();
 const [billTo,setBillTo]=useState("");
 const [billToAddress,setBillToAddress]=useState("");
 const [entries,setEntries]=useState<DateEntry[]>(()=>workDatesForJob(job.starts_at,job.ends_at).map(date=>({date,hours:"",lunch_taken:false,extra:false})));
 const [notes,setNotes]=useState("");
 const [issuedOn]=useState(()=>localDate(new Date()));
 const [dueOn,setDueOn]=useState(()=>{const d=new Date();d.setDate(d.getDate()+30);return localDate(d)});
 const [busy,setBusy]=useState(false),[error,setError]=useState("");

 const allValid=entries.every(e=>!!e.date&&validHoursText(e.hours));
 const workDays:InvoiceWorkDay[]=entries.filter(e=>e.hours.trim()!==""&&Number(e.hours)>0&&e.date)
  .map(e=>({date:e.date,hours:Number(e.hours),lunch_taken:e.lunch_taken&&Number(e.hours)>10}));
 const duplicateDates=new Set(entries.map(e=>e.date)).size!==entries.length;
 const calculation=calculateInvoiceDays(rateBasis,agreedRate,workDays);
 const validWork=allValid&&!duplicateDates&&workDays.length>0&&calculation.actualHours<=999;

 function updateEntry(index:number,patch:Partial<DateEntry>){
  setEntries(items=>items.map((entry,i)=>i===index?{...entry,...patch}:entry));
 }
 function addDay(){
  const previous=entries.at(-1)?.date||localDate(new Date());
  const next=new Date(previous+"T12:00:00");next.setDate(next.getDate()+1);
  setEntries(items=>[...items,{date:localDate(next),hours:"",lunch_taken:false,extra:true}]);
 }
 async function save(event:FormEvent){
  event.preventDefault();setError("");
  if(!billTo.trim()||!technician.name.trim()||!validWork||!dueOn){
   setError("Enter the client, hours worked on at least one day, and valid dates.");return;
  }
  if(dueOn<issuedOn){setError("The due date cannot be before the invoice date.");return}
  setBusy(true);
  try{
   const db=browserDb();
   const {data:{user}}=await db.auth.getUser();
   if(!user)throw new Error("Please sign in again.");
   const {data,error:insertError}=await db.from("technician_invoices").insert({
    offer_id:offerId,technician_id:user.id,
    from_name:technician.name.trim(),from_email:technician.email,from_phone:technician.phone,from_location:technician.location,
    bill_to:billTo.trim(),bill_to_address:billToAddress.trim(),
    job_title:job.title,job_venue:job.venue||"",job_address:job.address||"",
    job_starts_at:job.starts_at,job_ends_at:job.ends_at,job_position:position,original_rate:originalRate,
    hours:calculation.hours,hourly_rate:rateBasis==="day"?Math.round(agreedRate/10*100)/100:agreedRate,
    billing_basis:rateBasis,work_days:workDays,agreed_rate:agreedRate,
    issued_on:issuedOn,due_on:dueOn,notes:notes.trim()
   }).select("id").single();
   if(insertError){
    if(insertError.code==="23505"){
     const {data:existing}=await db.from("technician_invoices").select("id").eq("offer_id",offerId).eq("technician_id",user.id).maybeSingle();
     if(existing?.id){router.replace("/billing/invoices/"+existing.id);return}
    }
    throw insertError;
   }
   router.replace("/billing/invoices/"+data.id);
  }catch(e){setError(e instanceof Error?e.message:"Could not create invoice.");setBusy(false)}
 }
 return <form onSubmit={save} className="space-y-4">
  <section className="panel !p-4 sm:!p-5 space-y-3">
   <h2 className="font-semibold text-lg">Invoice details</h2>
   <p className="muted text-xs">From: {technician.name} · {technician.email}{technician.location?" · "+technician.location:""}</p>
   <p className="muted text-sm">{job.venue||"Venue TBD"}{position?" · "+position:""}</p>
   <label className="block"><span className="label">Bill to (company or client) *</span>
    <input required maxLength={250} placeholder="Company that will pay this invoice" value={billTo} onChange={e=>setBillTo(e.target.value)} disabled={busy}/></label>
   <label className="block"><span className="label">Billing address (optional)</span>
    <textarea rows={2} maxLength={500} value={billToAddress} onChange={e=>setBillToAddress(e.target.value)} disabled={busy}/></label>
   <div className="grid grid-cols-2 gap-3">
    <label><span className="label">Date issued</span><input readOnly value={issuedOn}/></label>
    <label><span className="label">Due date</span><input type="date" required min={issuedOn} value={dueOn} onChange={e=>setDueOn(e.target.value)} disabled={busy}/></label>
   </div>
  </section>

  <section className="panel !p-4 sm:!p-5 space-y-3">
   <div className="flex items-center justify-between gap-3">
    <h2 className="font-semibold text-lg">Hours worked</h2>
    <span className="text-xs muted">{workDays.length} day{workDays.length===1?"":"s"} logged</span>
   </div>
   <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-3 flex items-center justify-between gap-3">
    <div className="flex items-center gap-2 text-sm"><AppIcon name="wallet" size={18} className="text-green-300"/><span className="muted">Agreed {rateBasis==="day"?"day":"hourly"} rate</span></div>
    <span className="font-bold text-green-300 text-base text-right">{currency(agreedRate)}{rateBasis==="day"?"/day":"/hr"}</span>
   </div>
   <p className="muted text-xs">Check Lunch taken when applicable. One hour is deducted only if the entered hours for that day exceed 10.</p>
   <p className="muted text-xs">{rateBasis==="day"?
    `Each worked day is billed at the full 10-hour day rate. After ${DAY_INCLUDED_HOURS} hours on a single day, overtime is ${DAY_OT_MULTIPLIER}× the hourly equivalent. Enter actual hours—no need to calculate OT.`:
    "Hourly job: actual hours × the agreed hourly rate. No day-rate minimum or automatic day-rate overtime."}</p>
   <div className="space-y-2">
    {entries.map((entry,index)=>{
     const line=calculation.charges.find(day=>day.date===entry.date);
     return <div key={index} className="rounded-xl border border-slate-700 bg-slate-900/30 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
       {entry.extra?<input type="date" aria-label={"Additional work date "+(index+1)}
        value={entry.date} onChange={e=>updateEntry(index,{date:e.target.value})} disabled={busy} className="!w-auto min-w-0 !py-2"/>:
        <span className="text-sm font-semibold">{dateLabel(entry.date)}</span>}
       <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor={"invoice-hours-"+index}>Hours worked {dateLabel(entry.date)}</label>
        <input id={"invoice-hours-"+index} type="number" inputMode="decimal" step="0.01" min="0" max="24"
         placeholder="Hours" value={entry.hours} onChange={e=>updateEntry(index,{hours:e.target.value})}
         disabled={busy} className="!w-24 !py-2.5 text-right" />
        <span className="muted text-xs">hrs</span>
        {entry.extra&&<button type="button" aria-label={"Remove extra date "+(index+1)}
         onClick={()=>setEntries(items=>items.filter((_,i)=>i!==index))} disabled={busy} className="text-red-300 text-sm px-2">✕</button>}
       </div>
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
       <input type="checkbox" className="!w-auto accent-blue-500" checked={entry.lunch_taken}
        onChange={e=>updateEntry(index,{lunch_taken:e.target.checked})} disabled={busy} />
       Lunch taken <span className="muted">{Number(entry.hours)>10?"(subtract 1 hour)":"(applies only over 10 hours)"}</span>
      </label>
      {line&&<div className="flex items-center justify-between gap-2 border-t border-slate-800 pt-2">
       <span className="muted text-xs">{rateBasis==="day"?
        (line.otHours>0?`Day rate + ${line.otHours.toFixed(2)} OT hrs`:"Day rate · up to 10 hrs"):
        `${line.billableHours.toFixed(2)} billable hrs × ${currency(agreedRate)}`}{line.lunchDeducted>0?" · 1h lunch deducted":""}</span>
       <span className="text-sm font-semibold">{currency(line.total)}</span>
      </div>}
     </div>;
    })}
   </div>
   <button type="button" className="text-blue-300 text-sm font-semibold py-1" onClick={addDay} disabled={busy||entries.length>=366}>+ Add another work day</button>
   {duplicateDates&&<p className="text-amber-200 text-xs">Each date can appear only once.</p>}
   {!allValid&&<p className="text-amber-200 text-xs">Enter 0–24 hours with no more than two decimals for each date.</p>}
   <div className="rounded-xl bg-slate-900/70 border border-slate-700 p-3 space-y-2">
    <div className="flex items-center justify-between text-sm"><span className="muted">Hours entered</span><span>{calculation.actualHours.toFixed(2)}</span></div>
    {calculation.lunchHours>0&&<div className="flex items-center justify-between text-sm"><span className="muted">Lunch deductions</span><span>−{calculation.lunchHours.toFixed(2)} hrs</span></div>}
    <div className="flex items-center justify-between text-sm"><span className="muted">Billable hours</span><span>{calculation.hours.toFixed(2)}</span></div>
    {rateBasis==="day"&&<div className="flex items-center justify-between text-sm"><span className="muted">OT hours</span><span>{calculation.charges.reduce((sum,day)=>sum+day.otHours,0).toFixed(2)}</span></div>}
    <div className="flex items-center justify-between border-t border-slate-700 pt-2">
     <span className="font-semibold text-sm">Invoice total</span>
     <span className="text-xl font-bold text-green-300">{validWork?currency(calculation.total):"—"}</span>
    </div>
   </div>
   <label className="block"><span className="label">Invoice notes (optional)</span>
    <textarea rows={2} maxLength={1500} placeholder="Reference, payment instructions, or agreed terms" value={notes} onChange={e=>setNotes(e.target.value)} disabled={busy}/></label>
  </section>
  <p className="muted text-xs">The rate comes from your confirmed job offer and cannot be changed here. This creates one invoice per booking and does not send it or collect payment.</p>
  {error&&<p className="text-red-300 text-sm" role="alert">{error}</p>}
  <button className="primary w-full" type="submit" disabled={busy||!validWork||!billTo.trim()||!dueOn}>{busy?"Creating invoice…":"Save invoice →"}</button>
 </form>;
}
