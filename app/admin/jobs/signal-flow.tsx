"use client";
import {useState} from "react";

export type FlowConnection={from:string;to:string;signal:string};
type Props={value:FlowConnection[];onChange:(next:FlowConnection[])=>void;disabled?:boolean};

export function SignalFlowView({connections}:{connections:FlowConnection[]}){
 if(!connections.length)return <p className="muted text-sm">No signal flow added.</p>;
 return <div className="space-y-2">
  {connections.map((connection,i)=><div key={i} className="rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2.5">
   <div className="flex flex-wrap items-center gap-2 text-sm">
    <span className="font-medium break-words">{connection.from}</span>
    <span aria-hidden="true" className="text-blue-300 font-semibold">→</span>
    <span className="font-medium break-words">{connection.to}</span>
   </div>
   {connection.signal&&<p className="muted text-xs mt-1">{connection.signal}</p>}
  </div>)}
 </div>;
}

export default function SignalFlowEditor({value,onChange,disabled=false}:Props){
 const [source,setSource]=useState("");
 const [destination,setDestination]=useState("");
 const [signal,setSignal]=useState("");
 const [expanded,setExpanded]=useState(false);
 function add(){
  const from=source.trim(),to=destination.trim();
  if(!from||!to||value.length>=40)return;
  onChange([...value,{from:from.slice(0,120),to:to.slice(0,120),signal:signal.trim().slice(0,120)}]);
  setSource("");setDestination("");setSignal("");
 }
 return <div className="space-y-3">
  <button type="button" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)}
   className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-700 px-3 py-3 text-left">
   <span className="font-semibold text-sm">Signal flow <span className="muted font-normal">(optional)</span></span>
   <span className="text-blue-300 text-xs">{expanded?"Hide":"Add / edit"}</span>
  </button>
  {expanded&&<div className="space-y-3 rounded-lg border border-slate-700/70 p-3">
   <p className="muted text-xs">One simple connection per row. Example: Laptop → ATEM (HDMI), then ATEM → Projector (SDI).</p>
   <div className="grid gap-2 sm:grid-cols-2">
    <label className="block min-w-0"><span className="label">From equipment</span><input maxLength={120} placeholder="Laptop 1" value={source} disabled={disabled} onChange={e=>setSource(e.target.value)}/></label>
    <label className="block min-w-0"><span className="label">To equipment</span><input maxLength={120} placeholder="Blackmagic ATEM" value={destination} disabled={disabled} onChange={e=>setDestination(e.target.value)}/></label>
   </div>
   <label className="block"><span className="label">Signal / connector (optional)</span><input maxLength={120} placeholder="HDMI, SDI, Dante…" value={signal} disabled={disabled} onChange={e=>setSignal(e.target.value)}/></label>
   <button type="button" className="pill w-full" disabled={disabled||!source.trim()||!destination.trim()||value.length>=40} onClick={add}>+ Add connection</button>
   <div className="space-y-2">
    {value.length>0&&<p className="label">Flow preview · {value.length} connection{value.length===1?"":"s"}</p>}
    {value.map((connection,i)=><div key={i} className="flex items-start gap-2 rounded-lg border border-slate-700 p-2">
     <div className="flex-1 min-w-0 text-sm">
      <p className="break-words">{connection.from} <span className="text-blue-300">→</span> {connection.to}</p>
      {connection.signal&&<p className="muted text-xs">{connection.signal}</p>}
     </div>
     <button type="button" disabled={disabled} className="text-red-300 text-xs shrink-0 px-2 py-1" onClick={()=>onChange(value.filter((_,index)=>i!==index))}>Remove</button>
    </div>)}
   </div>
  </div>}
 </div>;
}
