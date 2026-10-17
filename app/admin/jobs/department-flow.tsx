"use client";
import {useState} from "react";
import SignalFlowEditor,{SignalFlowView,type FlowConnection} from "./signal-flow";
export type DepartmentFlow=FlowConnection & {department?:string};
const defaults=["Video","Audio","Lighting","Graphics","General"];
export function FlowTabs({connections}:{connections:DepartmentFlow[]}){
 const groups=Array.from(new Set([...defaults.filter(x=>connections.some(c=>(c.department||"General")===x)),...connections.map(c=>c.department||"General")]));
 const [tab,setTab]=useState(groups[0]||"Video");
 const shown=connections.filter(c=>(c.department||"General")===tab);
 return <div className="space-y-3">
  <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Signal flow department">
   {groups.map(g=><button type="button" role="tab" aria-selected={tab===g} key={g} onClick={()=>setTab(g)} className={"pill !py-2 text-sm shrink-0 "+(tab===g?"bg-blue-600 border-blue-500":"")}>{g}</button>)}
  </div>
  <SignalFlowView connections={shown}/>
 </div>;
}
export default function DepartmentFlowEditor({value,onChange,disabled=false}:{value:DepartmentFlow[];onChange:(v:DepartmentFlow[])=>void;disabled?:boolean}){
 const tabs=Array.from(new Set([...defaults,...value.map(c=>c.department||"General")]));
 const [tab,setTab]=useState("Video");
 const [custom,setCustom]=useState("");
 const selected=value.filter(c=>(c.department||"General")===tab);
 function setSelected(next:FlowConnection[]){
  if(value.filter(c=>(c.department||"General")!==tab).length+next.length>40)return;
  onChange([...value.filter(c=>(c.department||"General")!==tab),...next.map(c=>({...c,department:tab}))]);
 }
 return <div className="space-y-3">
  <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Edit department flow">
   {tabs.map(t=><button type="button" role="tab" aria-selected={tab===t} key={t} onClick={()=>setTab(t)} className={"pill !py-2 text-sm shrink-0 "+(tab===t?"bg-blue-600 border-blue-500":"")}>{t}</button>)}
  </div>
  <p className="muted text-xs">Editing {tab} · {selected.length} connections. Simple connections are shared with everyone on the job.</p>
  <SignalFlowEditor key={tab} value={selected} onChange={setSelected} disabled={disabled}/>
  <div className="flex items-end gap-2"><label className="flex-1 min-w-0"><span className="label">Another department (optional)</span><input value={custom} onChange={e=>setCustom(e.target.value)} maxLength={60} placeholder="e.g. Camera"/></label>
  <button type="button" className="pill !py-2 text-sm" disabled={!custom.trim()||disabled} onClick={()=>{setTab(custom.trim());setCustom("")}}>Open tab</button></div>
 </div>;
}
