"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {browserDb} from "@/lib/supabase";
import SignalFlowEditor,{SignalFlowView,type FlowConnection} from "./signal-flow";

export default function JobProductionEditor({jobId,initialVenue,initialAddress,initialFlow}:{
 jobId:string;initialVenue:string;initialAddress:string;initialFlow:FlowConnection[];
}){
 const router=useRouter();
 const [editing,setEditing]=useState(false),[venue,setVenue]=useState(initialVenue),[address,setAddress]=useState(initialAddress);
 const [flow,setFlow]=useState<FlowConnection[]>(initialFlow);
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState(""),[error,setError]=useState("");
 async function save(){
  setBusy(true);setError("");setNotice("");
  const {error}=await browserDb().from("jobs").update({
   venue:venue.trim(),address:address.trim(),signal_flow:flow
  }).eq("id",jobId);
  if(error)setError(error.message);
  else{setEditing(false);setNotice("Venue and signal flow saved.");router.refresh()}
  setBusy(false);
 }
 return <section className="panel !p-4 sm:!p-5 space-y-3">
  <div className="flex justify-between items-center gap-3">
   <h2 className="text-lg font-semibold">Venue & signal flow</h2>
   <button type="button" className="text-blue-300 text-sm underline" onClick={()=>setEditing(v=>!v)} disabled={busy}>{editing?"Close":"Edit"}</button>
  </div>
  {!editing?<div className="space-y-3 text-sm">
   <div><p className="label">Venue</p><p>{venue||"Venue TBD"}</p></div>
   {address&&<div><p className="label">Address</p>
    <a href={"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(address)} target="_blank" rel="noopener noreferrer" className="text-blue-300 underline break-words">{address} ↗</a>
   </div>}
   <div><p className="label">Simple signal flow</p><SignalFlowView connections={flow}/></div>
  </div>:<div className="space-y-3">
   <label className="block"><span className="label">Venue name</span><input maxLength={250} value={venue} onChange={e=>setVenue(e.target.value)} disabled={busy}/></label>
   <label className="block"><span className="label">Venue address</span><input maxLength={500} value={address} onChange={e=>setAddress(e.target.value)} disabled={busy} placeholder="Street, city, state, ZIP"/></label>
   <SignalFlowEditor value={flow} onChange={setFlow} disabled={busy}/>
   <button type="button" className="primary w-full" onClick={save} disabled={busy}>{busy?"Saving…":"Save venue & signal flow"}</button>
  </div>}
  {notice&&<p role="status" className="text-green-300 text-xs">{notice}</p>}
  {error&&<p role="alert" className="text-red-300 text-sm">{error}</p>}
 </section>;
}
