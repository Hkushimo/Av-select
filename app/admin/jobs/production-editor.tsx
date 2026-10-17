"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {browserDb} from "@/lib/supabase";
import RoleFlowEditor from "./role-flow-editor";
import type {RoleFlow} from "./role-flow-types";

export default function JobProductionEditor({jobId,initialVenue,initialAddress}:{
 jobId:string;initialVenue:string;initialAddress:string;
}){
 const router=useRouter();
 const [editing,setEditing]=useState(false),[venue,setVenue]=useState(initialVenue),[address,setAddress]=useState(initialAddress);
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState(""),[error,setError]=useState("");
 async function save(){
  setBusy(true);setError("");setNotice("");
  const {error}=await browserDb().from("jobs").update({venue:venue.trim(),address:address.trim()}).eq("id",jobId);
  if(error)setError(error.message);
  else{setEditing(false);setNotice("Venue saved.");router.refresh()}
  setBusy(false);
 }
 return <section className="panel !p-4 sm:!p-5 space-y-3">
  <div className="flex justify-between items-center gap-3">
   <h2 className="text-lg font-semibold">Venue & address</h2>
   <button type="button" className="text-blue-300 text-sm underline" onClick={()=>setEditing(v=>!v)} disabled={busy}>{editing?"Close":"Edit"}</button>
  </div>
  {!editing?<div className="space-y-3 text-sm">
   <div><p className="label">Venue</p><p>{venue||"Venue TBD"}</p></div>
   {address&&<div><p className="label">Address</p>
    <a href={"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(address)} target="_blank" rel="noopener noreferrer" className="text-blue-300 underline break-words">{address} ↗</a>
   </div>}
  </div>:<div className="space-y-3">
   <label className="block"><span className="label">Venue name</span><input maxLength={250} value={venue} onChange={e=>setVenue(e.target.value)} disabled={busy}/></label>
   <label className="block"><span className="label">Venue address</span><input maxLength={500} value={address} onChange={e=>setAddress(e.target.value)} disabled={busy} placeholder="Street, city, state, ZIP"/></label>
   <button type="button" className="primary w-full" onClick={save} disabled={busy}>{busy?"Saving…":"Save venue"}</button>
  </div>}
  {notice&&<p role="status" className="text-green-300 text-xs">{notice}</p>}
  {error&&<p role="alert" className="text-red-300 text-sm">{error}</p>}
 </section>;
}

export function JobSignalFlowSection({jobId,initialFlows}:{jobId:string;initialFlows:RoleFlow[]}){
 const router=useRouter();
 const [editing,setEditing]=useState(false),[flows,setFlows]=useState<RoleFlow[]>(initialFlows);
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState(""),[error,setError]=useState("");
 async function save(){
  setBusy(true);setError("");setNotice("");
  const {error}=await browserDb().from("jobs").update({role_flows:flows}).eq("id",jobId);
  if(error)setError(error.message);
  else{setEditing(false);setNotice("Role-based signal flows saved.");router.refresh()}
  setBusy(false);
 }
 return <section className="panel !p-4 sm:!p-5 space-y-3">
  <div className="flex justify-between items-center gap-3">
   <h2 className="text-lg font-semibold">Equipment & signal flow</h2>
   <button type="button" className="text-blue-300 text-sm underline" onClick={()=>setEditing(v=>!v)} disabled={busy}>{editing?"Close":"Edit"}</button>
  </div>
  {!editing?<div className="space-y-2">
   {flows.length?flows.map(f=><div key={f.role} className="rounded-lg border border-slate-700/70 px-3 py-2.5">
    <p className="font-medium text-sm">{f.role}</p>
    <p className="muted text-xs">{f.connections.length} connection{f.connections.length===1?"":"s"}</p>
   </div>):<p className="muted text-sm">No role-specific flows yet.</p>}
  </div>:<div className="space-y-3">
   <RoleFlowEditor value={flows} onChange={setFlows} disabled={busy}/>
   <button type="button" className="primary w-full" onClick={save} disabled={busy}>{busy?"Saving…":"Save role flows"}</button>
  </div>}
  {notice&&<p role="status" className="text-green-300 text-xs">{notice}</p>}
  {error&&<p role="alert" className="text-red-300 text-sm">{error}</p>}
 </section>;
}
