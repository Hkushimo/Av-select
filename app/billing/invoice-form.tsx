"use client";
import {jobDate,jobWorkDates} from "@/lib/job-time";
import {useState,type FormEvent} from "react";
import {useRouter} from "next/navigation";
import {browserDb} from "@/lib/supabase";
import {currency,calculateInvoiceDays,DAY_INCLUDED_HOURS,DAY_OT_MULTIPLIER,shiftHours,validateWorkPeriods,type RateBasis,type InvoiceWorkDay,type InvoiceShift} from "@/lib/invoicing";
import AppIcon from "@/app/app-icon";

type JobInfo={time_zone:string|null;title:string;venue:string;address:string;starts_at:string;ends_at:string|null;rate:string;rate_basis:RateBasis;status:string};
type TechnicianInfo={name:string;email:string;phone:string;location:string};
type ShiftEntry={timeIn:string;timeOut:string;payType:"standard"|"return_flat"};
type DateEntry={date:string;shifts:ShiftEntry[];lunch_taken:boolean};
function dateLabel(date:string){return new Date(date+"T12:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}
export default function InvoiceForm({offerId,job,position,originalRate,rateBasis,agreedRate,returnCallFlatAmount,technician}:{
 offerId:string;job:JobInfo;position:string;originalRate:string;rateBasis:RateBasis;agreedRate:number;returnCallFlatAmount:number|null;technician:TechnicianInfo;
}){
 const router=useRouter();
 const [billTo,setBillTo]=useState("");
 const [billToAddress,setBillToAddress]=useState("");
 const [entries,setEntries]=useState<DateEntry[]>(()=>jobWorkDates(job.starts_at,job.ends_at,job.time_zone||"UTC").map(date=>({date,shifts:[{timeIn:"",timeOut:"",payType:"standard" as const}],lunch_taken:false})));
 const [notes,setNotes]=useState("");
 const [issuedOn]=useState(()=>jobDate(new Date(),job.time_zone));
 const [dueOn,setDueOn]=useState(()=>{const d=new Date(issuedOn+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+30);return d.toISOString().slice(0,10)});
 const [busy,setBusy]=useState(false),[error,setError]=useState("");

 const allValid=entries.every(entry=>entry.shifts.every((shift,index)=>{
  if(!shift.timeIn&&!shift.timeOut)return index===0&&entry.shifts.length===1;
  return !!shift.timeIn&&!!shift.timeOut&&shiftHours(shift.timeIn,shift.timeOut)!==null;
 }));
 const workDays:InvoiceWorkDay[]=entries.flatMap(entry=>{
  const shifts:InvoiceShift[]=entry.shifts.flatMap(shift=>{
   const hours=shiftHours(shift.timeIn,shift.timeOut);
   return hours===null?[]:[{time_in:shift.timeIn,time_out:shift.timeOut,hours,pay_type:shift.payType}];
  });
  if(!shifts.length)return [];
  return [{date:entry.date,shifts,
   hours:Math.round(shifts.reduce((sum,shift)=>sum+shift.hours,0)*100)/100,
   lunch_taken:entry.lunch_taken}];
 });
 const duplicateDates=new Set(entries.map(e=>e.date)).size!==entries.length;
 const workError=validateWorkPeriods(workDays,returnCallFlatAmount);
 const calculation=calculateInvoiceDays(rateBasis,agreedRate,workDays,true,returnCallFlatAmount);
 const validWork=allValid&&!duplicateDates&&!workError&&workDays.length>0&&calculation.actualHours<=999
  &&workDays.every(day=>day.hours<=24);
 const flatCount=workDays.flatMap(day=>day.shifts||[]).filter(shift=>shift.pay_type==="return_flat").length;

 function updateEntry(index:number,patch:Partial<DateEntry>){
  setEntries(items=>items.map((entry,i)=>i===index?{...entry,...patch}:entry));
 }
 function updateShift(dayIndex:number,shiftIndex:number,patch:Partial<ShiftEntry>){
  setEntries(items=>items.map((entry,i)=>i===dayIndex?{
   ...entry,shifts:entry.shifts.map((shift,j)=>j===shiftIndex?{...shift,...patch}:shift)
  }:entry));
 }
 function addShift(index:number){
  setEntries(items=>items.map((entry,i)=>i===index&&entry.shifts.length<8?{
   ...entry,shifts:[...entry.shifts,{timeIn:"",timeOut:"",payType:"standard" as const}]
  }:entry));
 }
 function removeShift(dayIndex:number,shiftIndex:number){
  if(shiftIndex===0)return;
  setEntries(items=>items.map((entry,i)=>i===dayIndex?{
   ...entry,shifts:entry.shifts.filter((_,j)=>j!==shiftIndex)
  }:entry));
 }
 async function save(event:FormEvent){
  event.preventDefault();setError("");
  if(!billTo.trim()||!technician.name.trim()||!validWork||!dueOn){
   setError(workError||"Enter the client and valid clock times on at least one work period.");return;
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
    billing_basis:rateBasis,overtime_policy:"after_10_1_5",work_days:workDays,agreed_rate:agreedRate,
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
  }catch(e){
   const message=e&&typeof e==="object"&&"message" in e&&typeof e.message==="string"?e.message:"Could not create invoice.";
   setError(message);setBusy(false);
  }
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
    <h2 className="font-semibold text-lg">Daily time log</h2>
    <span className="text-xs muted">{workDays.length} day{workDays.length===1?"":"s"} logged</span>
   </div>
   <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
    <AppIcon name="wallet" size={18} className="text-green-300 shrink-0"/>
    <span className="muted text-sm">Agreed {rateBasis==="day"?"day":"hourly"} rate</span>
    <span className="font-bold text-green-300 text-base">{currency(agreedRate)}{rateBasis==="day"?"/day":"/hr"}</span>
   </div>
   {returnCallFlatAmount!==null&&<p className="text-green-300 text-xs">
    Approved one-time return-call payment: {currency(returnCallFlatAmount)}. Select this payment type for one additional work period only.
   </p>}
   <p className="muted text-xs">Add each on-clock period separately. The gap between clock-out and the next clock-in is unpaid and is never included in hours worked.</p>
   <p className="muted text-xs">Lunch taken is a separate 1-hour deduction only when the day's actual worked hours exceed 10. Do not check it for an already-unpaid split between work periods.</p>
   <p className="muted text-xs">{rateBasis==="day"?
    `One full day rate covers the first ${DAY_INCLUDED_HOURS} regular worked hours per day. Additional regular hours are ${DAY_OT_MULTIPLIER}× overtime. A flat-priced return call, if approved, replaces normal pay for that period.`:
    `Hourly rate: the first ${DAY_INCLUDED_HOURS} regular billable hours per day pay the agreed rate; later regular hours are ${DAY_OT_MULTIPLIER}× overtime. An approved flat return call replaces standard hourly pay for that period.`}</p>
   <div className="space-y-3">
    {entries.map((entry,index)=>{
     const line=calculation.charges.find(day=>day.date===entry.date);
     return <div key={entry.date} className="rounded-xl border border-slate-700 bg-slate-900/30 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
       <span className="text-sm font-semibold">{dateLabel(entry.date)}</span>
       <span className="muted text-xs">{entry.shifts.length} period{entry.shifts.length===1?"":"s"}</span>
      </div>
      {entry.shifts.map((shift,shiftIndex)=><div key={shiftIndex} className="rounded-lg border border-slate-700/70 p-3 space-y-2">
       <div className="flex flex-wrap justify-between items-center gap-2">
        <p className="text-xs font-semibold text-blue-200">Work period {shiftIndex+1}</p>
        {shiftIndex>0&&<button type="button" className="text-xs text-red-300 underline" disabled={busy}
         onClick={()=>removeShift(index,shiftIndex)}>Remove</button>}
       </div>
       <div className="grid grid-cols-2 gap-3">
        <label className="min-w-0 block"><span className="label">Time in</span>
         <input type="time" step={60} aria-label={`Time in ${dateLabel(entry.date)}, period ${shiftIndex+1}`}
          value={shift.timeIn} onChange={event=>updateShift(index,shiftIndex,{timeIn:event.target.value})}
          disabled={busy} className="!min-w-0 !w-full !px-2.5 !py-2.5 !text-base"/></label>
        <label className="min-w-0 block"><span className="label">Time out</span>
         <input type="time" step={60} aria-label={`Time out ${dateLabel(entry.date)}, period ${shiftIndex+1}`}
          value={shift.timeOut} onChange={event=>updateShift(index,shiftIndex,{timeOut:event.target.value})}
          disabled={busy} className="!min-w-0 !w-full !px-2.5 !py-2.5 !text-base"/></label>
       </div>
       {shift.timeIn&&shift.timeOut&&shiftHours(shift.timeIn,shift.timeOut)!==null&&
        <p className="muted text-xs">Worked {shiftHours(shift.timeIn,shift.timeOut)?.toFixed(2)}h
         {shift.timeOut<shift.timeIn?" · Ends next day":""}</p>}
       {returnCallFlatAmount!==null&&shiftIndex>0&&<label className="block">
        <span className="label">Payment for this period</span>
        <select disabled={busy} value={shift.payType} onChange={event=>updateShift(index,shiftIndex,{payType:event.target.value as ShiftEntry["payType"]})}>
         <option value="standard">Standard daily rate / overtime rules</option>
         <option value="return_flat">Approved flat return call · {currency(returnCallFlatAmount)}</option>
        </select>
       </label>}
      </div>)}
      <button type="button" disabled={busy||entry.shifts.length>=8} className="pill text-blue-300 text-sm" onClick={()=>addShift(index)}>
       + Add another work period
      </button>
      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
       <input type="checkbox" className="!w-auto accent-blue-500" checked={entry.lunch_taken}
        onChange={event=>updateEntry(index,{lunch_taken:event.target.checked})} disabled={busy}/>
       Lunch taken <span className="muted">(subtract 1h only when worked time exceeds 10h)</span>
      </label>
      {line&&<div className="border-t border-slate-800 pt-2 space-y-1">
       <p className="muted text-xs">{line.hours.toFixed(2)}h actually worked
        {line.lunchDeducted?" · 1h lunch deducted":""}
        {line.otHours>0?" · "+line.otHours.toFixed(2)+"h regular OT":""}
        {line.flatReturnAmount>0?" · "+currency(line.flatReturnAmount)+" flat return call":""}</p>
       <p className="font-semibold text-base">{currency(line.total)}</p>
      </div>}
     </div>;
    })}
   </div>
   {flatCount>1&&<p role="alert" className="text-amber-200 text-xs">Only one work period per invoice may use the approved flat return-call payment.</p>}
   {workError&&<p role="alert" className="text-amber-200 text-xs">{workError}</p>}
   {duplicateDates&&<p className="text-amber-200 text-xs">Each date may appear only once.</p>}
   {!allValid&&<p className="text-amber-200 text-xs">Finish or remove incomplete work periods. Overnight shifts are supported.</p>}
   <p className="muted text-xs">Work dates and clock times use {job.time_zone}. For additional work dates, ask the admin to update the job schedule before invoicing.</p>
   <div className="rounded-xl bg-slate-900/70 border border-slate-700 p-3 space-y-3">
    <h3 className="font-semibold text-sm">Invoice summary</h3>
    <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
     <span className="muted">Worked <strong className="text-slate-100 ml-1">{calculation.actualHours.toFixed(2)}h</strong></span>
     {calculation.lunchHours>0&&<span className="muted">Lunch <strong className="text-slate-100 ml-1">−{calculation.lunchHours.toFixed(2)}h</strong></span>}
     <span className="muted">Billable <strong className="text-slate-100 ml-1">{calculation.hours.toFixed(2)}h</strong></span>
     <span className="muted">OT <strong className="text-slate-100 ml-1">{calculation.charges.reduce((sum,day)=>sum+day.otHours,0).toFixed(2)}h</strong></span>
    </div>
    <div className="border-t border-slate-700 pt-3">
     <p className="muted text-xs">Invoice total</p>
     <p className="text-2xl font-bold text-green-300 mt-1">{validWork?currency(calculation.total):"—"}</p>
    </div>
   </div>
   <label className="block"><span className="label">Invoice notes (optional)</span>
    <textarea rows={2} maxLength={1500} placeholder="Reference, payment instructions, or agreed terms" value={notes} onChange={e=>setNotes(e.target.value)} disabled={busy}/></label>
  </section>
  <p className="muted text-xs">The rate comes from your confirmed job offer and cannot be changed here. Submitting makes this invoice visible to AV Select admins. It does not email the client or collect payment.</p>
  {error&&<p className="text-red-300 text-sm" role="alert">{error}</p>}
  <button className="primary w-full" type="submit" disabled={busy||!validWork||!billTo.trim()||!dueOn}>{busy?"Submitting invoice…":"Submit invoice →"}</button>
 </form>;
}
