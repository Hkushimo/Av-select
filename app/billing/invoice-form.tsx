"use client";
import {useState,type FormEvent} from "react";
import {useRouter} from "next/navigation";
import {browserDb} from "@/lib/supabase";
import {currency} from "@/lib/invoicing";

type JobInfo={title:string;venue:string;address:string;starts_at:string;ends_at:string|null;rate:string;status:string};
type TechnicianInfo={name:string;email:string;phone:string;location:string};
function localDate(value:Date){return new Date(value.getTime()-value.getTimezoneOffset()*60000).toISOString().slice(0,10)}
export default function InvoiceForm({offerId,job,position,originalRate,suggestedHourly,technician}:{
 offerId:string;job:JobInfo;position:string;originalRate:string;suggestedHourly:number|null;technician:TechnicianInfo;
}){
 const router=useRouter();
 const [billTo,setBillTo]=useState("");
 const [billToAddress,setBillToAddress]=useState("");
 const [hours,setHours]=useState("");
 const [hourly,setHourly]=useState(suggestedHourly?.toString()||"");
 const [notes,setNotes]=useState("");
 const [issuedOn]=useState(()=>localDate(new Date()));
 const [dueOn,setDueOn]=useState(()=>{const d=new Date();d.setDate(d.getDate()+30);return localDate(d)});
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 const hoursNumber=Number(hours),rateNumber=Number(hourly);
 const validHours=hours.trim()!==""&&Number.isFinite(hoursNumber)&&hoursNumber>0&&hoursNumber<=999&&Math.abs(Math.round(hoursNumber*100)-hoursNumber*100)<0.000001;
 const validRate=hourly.trim()!==""&&Number.isFinite(rateNumber)&&rateNumber>0&&rateNumber<=100000&&Math.abs(Math.round(rateNumber*100)-rateNumber*100)<0.000001;
 const total=validHours&&validRate?hoursNumber*rateNumber:null;
 async function save(event:FormEvent){
  event.preventDefault();setError("");
  if(!billTo.trim()||!technician.name.trim()||!validHours||!validRate||!dueOn){setError("Add a bill-to name, valid hours and hourly rate.");return}
  if(dueOn<issuedOn){setError("Due date cannot be before the invoice date.");return}
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
    hours:hoursNumber,hourly_rate:rateNumber,issued_on:issuedOn,due_on:dueOn,notes:notes.trim()
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
 const inputClass="block";
 return <form onSubmit={save} className="space-y-4">
  <section className="panel !p-4 sm:!p-5 space-y-3">
   <h2 className="font-semibold text-lg">Invoice details</h2>
   <p className="muted text-xs">From: {technician.name} · {technician.email}{technician.location?" · "+technician.location:""}</p>
   <p className="muted text-sm">{job.venue||"Venue TBD"}{position?" · "+position:""}</p>
   <label className={inputClass}><span className="label">Bill to (company or client) *</span>
    <input required maxLength={250} placeholder="Company that will pay this invoice" value={billTo} onChange={e=>setBillTo(e.target.value)} disabled={busy}/></label>
   <label className={inputClass}><span className="label">Billing address (optional)</span>
    <textarea rows={2} maxLength={500} value={billToAddress} onChange={e=>setBillToAddress(e.target.value)} disabled={busy}/></label>
   <div className="grid grid-cols-2 gap-3">
    <label><span className="label">Date issued</span><input readOnly value={issuedOn}/></label>
    <label><span className="label">Due date</span><input type="date" required min={issuedOn} value={dueOn} onChange={e=>setDueOn(e.target.value)} disabled={busy}/></label>
   </div>
  </section>
  <section className="panel !p-4 sm:!p-5 space-y-3">
   <h2 className="font-semibold text-lg">Work & pay</h2>
   <p className="muted text-xs">Rate on your job offer: {originalRate||"Not specified"}</p>
   {originalRate&&suggestedHourly===null&&<p className="rounded-lg border border-amber-700/50 bg-amber-500/10 p-3 text-xs text-amber-200">This booking's rate isn't expressed hourly. Enter the agreed hourly equivalent before invoicing, or confirm the calculation with your client.</p>}
   <div className="grid grid-cols-2 gap-3">
    <label><span className="label">Hours worked *</span><input type="number" required min="0.01" max="999" step="0.01" inputMode="decimal" placeholder="e.g. 10" value={hours} onChange={e=>setHours(e.target.value)} disabled={busy}/></label>
    <label><span className="label">Hourly rate (USD) *</span><input type="number" required min="0.01" max="100000" step="0.01" inputMode="decimal" placeholder="e.g. 50.00" value={hourly} onChange={e=>setHourly(e.target.value)} disabled={busy}/></label>
   </div>
   <div className="rounded-xl bg-slate-900/70 border border-slate-700 p-3 flex items-center justify-between">
    <span className="muted text-sm">Invoice total</span><span className="text-lg font-bold text-green-300">{total===null?"—":currency(total)}</span>
   </div>
   <label><span className="label">Invoice notes (optional)</span><textarea rows={2} maxLength={1500} placeholder="Reference, payment instructions, or agreed terms" value={notes} onChange={e=>setNotes(e.target.value)} disabled={busy}/></label>
  </section>
  <p className="muted text-xs">Save creates one invoice for this booking. It does not send the invoice or collect payment. Review the amount and client before saving.</p>
  {error&&<p className="text-red-300 text-sm" role="alert">{error}</p>}
  <button className="primary w-full" type="submit" disabled={busy||!validHours||!validRate||!billTo.trim()||!dueOn}>{busy?"Creating invoice…":"Save invoice →"}</button>
 </form>;
}
