"use client";
import {useState} from "react";
import SignalFlowEditor,{SignalFlowView,type FlowConnection} from "./signal-flow";

export type DepartmentFlow=FlowConnection & {department?:string};
const tabs=["Video","Audio"] as const;
type Tab=(typeof tabs)[number];

// Connections made before departments existed are kept under Video.
function belongsTo(connection:DepartmentFlow,tab:Tab){
 const department=connection.department||"General";
 return department===tab||(tab==="Video"&&department==="General");
}
function FlowSwitcher({tab,onChange,label}:{tab:Tab;onChange:(tab:Tab)=>void;label:string}){
 return <div className="flex rounded-xl bg-slate-800 p-1 gap-1" role="tablist" aria-label={label}>
  {tabs.map(t=><button key={t} type="button" role="tab" aria-selected={tab===t}
   onClick={()=>onChange(t)} className={"flex-1 rounded-lg px-3 py-3 text-sm font-semibold "+(tab===t?"bg-blue-600 text-white":"text-slate-300 hover:bg-slate-700")}>{t}</button>)}
 </div>;
}
export function FlowTabs({connections}:{connections:DepartmentFlow[]}){
 const [tab,setTab]=useState<Tab>("Video");
 return <div className="space-y-3">
  <FlowSwitcher tab={tab} onChange={setTab} label="Signal flow"/>
  <SignalFlowView connections={connections.filter(c=>belongsTo(c,tab))}/>
 </div>;
}
export default function DepartmentFlowEditor({value,onChange,disabled=false}:{value:DepartmentFlow[];onChange:(v:DepartmentFlow[])=>void;disabled?:boolean}){
 const [tab,setTab]=useState<Tab>("Video");
 const selected=value.filter(c=>belongsTo(c,tab));
 function setSelected(next:FlowConnection[]){
  const remaining=value.filter(c=>!belongsTo(c,tab));
  if(remaining.length+next.length>40)return;
  onChange([...remaining,...next.map(c=>({...c,department:tab}))]);
 }
 return <div className="space-y-3">
  <FlowSwitcher tab={tab} onChange={setTab} label="Edit signal flow"/>
  <SignalFlowEditor key={tab} value={selected} onChange={setSelected} disabled={disabled}/>
 </div>;
}
