"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";

export default function DeleteTechnician({id,name}:{id:string;name:string}){
 const router=useRouter();
 const [confirming,setConfirming]=useState(false);
 const [typed,setTyped]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 async function remove(){
  if(typed!=="DELETE"||busy)return;
  setBusy(true);setError("");
  try{
   const response=await fetch("/api/admin/technicians/"+id,{method:"DELETE"});
   const data=await response.json() as {error?:string};
   if(!response.ok)throw new Error(data.error||"Deletion failed.");
   router.replace("/admin");
   router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Could not delete technician.");setBusy(false)}
 }
 return <section className="panel space-y-3 border-red-900/60">
  <h2 className="text-lg font-semibold">Remove technician</h2>
  {!confirming?<><p className="muted text-sm">Permanently remove this technician and their login, ratings, offers, and profile. They may register again later using a new invitation.</p>
   <button type="button" className="pill text-red-300" onClick={()=>setConfirming(true)}>Delete technician…</button></>:
   <div className="space-y-3">
    <p className="text-red-300 text-sm font-semibold">This permanently deletes {name} from AV Select. This cannot be undone.</p>
    <p className="muted text-sm">To confirm, type DELETE below.</p>
    <input aria-label="Type DELETE to confirm" autoComplete="off" value={typed} onChange={e=>setTyped(e.target.value)} placeholder="DELETE"/>
    <div className="flex flex-wrap gap-2">
     <button type="button" disabled={busy||typed!=="DELETE"} onClick={remove} className="rounded-lg px-4 py-3 font-semibold text-white bg-red-700 disabled:opacity-40">Permanently delete</button>
     <button type="button" disabled={busy} className="pill" onClick={()=>{setConfirming(false);setTyped("");setError("")}}>Cancel</button>
    </div>
   </div>}
  {error&&<p role="alert" className="text-red-300 text-sm">{error}</p>}
 </section>;
}
