"use client";
import {useState} from "react";
import SignalFlowEditor,{SignalFlowView} from "./signal-flow";
import {COMMON_ROLES,DEFAULT_ROLE,type RoleFlow} from "./role-flow-types";

export default function RoleFlowEditor({value,onChange,disabled=false}:{value:RoleFlow[];onChange:(next:RoleFlow[])=>void;disabled?:boolean}){
 const [role,setRole]=useState(value[0]?.role||DEFAULT_ROLE);
 const [newRole,setNewRole]=useState("");
 const current=value.find(f=>f.role===role);
 function addRole(){
  const name=newRole.trim().slice(0,100);
  if(!name||value.some(f=>f.role.toLowerCase()===name.toLowerCase())||value.length>=30)return;
  onChange([...value,{role:name,connections:[]}]);setRole(name);setNewRole("");
 }
 function changeConnections(connections:RoleFlow["connections"]){
  onChange(value.some(f=>f.role===role)?value.map(f=>f.role===role?{...f,connections}:f):[...value,{role,connections}]);
 }
 const choices=Array.from(new Set([...COMMON_ROLES,...value.map(f=>f.role)]));
 return <div className="space-y-3">
  <label className="block"><span className="label">Choose assignment role</span>
   <select value={role} onChange={e=>setRole(e.target.value)} disabled={disabled}>
    {choices.map(v=><option key={v} value={v}>{v}</option>)}
   </select>
  </label>
  <p className="muted text-xs">Each role has its own equipment routing. Technicians only see the flow for their assigned role.</p>
  {current?.connections.length?<SignalFlowView connections={current.connections}/>:<p className="muted text-sm">No connections for {role} yet.</p>}
  <SignalFlowEditor key={role} value={current?.connections||[]} onChange={changeConnections} disabled={disabled}/>
  <div className="flex items-end gap-2">
   <label className="block flex-1 min-w-0"><span className="label">Custom role (optional)</span>
    <input value={newRole} maxLength={100} onChange={e=>setNewRole(e.target.value)} placeholder="e.g. LED tech" disabled={disabled}/>
   </label>
   <button type="button" className="pill shrink-0" disabled={disabled||!newRole.trim()||value.length>=30} onClick={addRole}>Add role</button>
  </div>
  {current&&<button type="button" className="text-red-300 text-xs underline" disabled={disabled} onClick={()=>{
   onChange(value.filter(f=>f.role!==role));setRole(DEFAULT_ROLE);
  }}>Remove {role} flow</button>}
 </div>;
}
