"use client";
import {useState} from "react";
import Link from "next/link";

function SelectionCard({title,items}:{title:string;items:string[]}){
 const [expanded,setExpanded]=useState(false);
 const visible=expanded?items:items.slice(0,6);
 return <section className="panel !p-4 sm:!p-5 space-y-3">
  <div className="flex items-baseline justify-between gap-2">
   <h2 className="text-lg font-semibold">{title}</h2>
   <span className="muted text-xs">{items.length} selected</span>
  </div>
  {items.length?<div className="flex flex-wrap gap-2">{visible.map((item,index)=>
   <span key={item+"-"+index} className="inline-flex max-w-full items-center rounded-full border border-slate-600/80 bg-slate-800/70 px-3 py-1.5 text-xs sm:text-sm text-slate-200 break-words">{item}</span>
  )}</div>:<p className="muted text-sm">No {title.toLowerCase()} selected yet.</p>}
  {items.length>6&&<button type="button" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)}
   className="text-blue-300 hover:text-blue-200 text-sm font-medium py-1">
   {expanded?"Show fewer":`Show all ${items.length} ${title.toLowerCase()}`} <span aria-hidden="true">{expanded?"↑":"↓"}</span>
  </button>}
 </section>;
}
export default function ProfileSelections({roles,equipment}:{roles:string[];equipment:string[]}){
 return <div className="space-y-4">
  <SelectionCard title="Positions" items={roles}/>
  <SelectionCard title="Equipment" items={equipment}/>
  <Link href="/onboarding" className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-2.5 text-sm font-medium text-blue-300 hover:bg-slate-800/60">
   Edit positions & equipment <span aria-hidden="true">→</span>
  </Link>
 </div>;
}
