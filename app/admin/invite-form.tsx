"use client";
import {useEffect,useState} from "react";
import AppIcon from "@/app/app-icon";

type Invite={token_hash:string;created_at:string;expires_at:string};
export default function InviteForm(){
 const [inviteUrl,setInviteUrl]=useState("");
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [panel,setPanel]=useState<"create"|"active"|null>(null);
 const [invites,setInvites]=useState<Invite[]>([]);
 const [loading,setLoading]=useState(false),[revoking,setRevoking]=useState<string|null>(null);
 const [listError,setListError]=useState("");
 const [confirmHash,setConfirmHash]=useState<string|null>(null);

 useEffect(()=>{
  if(!panel)return;
  const onKey=(event:KeyboardEvent)=>{if(event.key==="Escape"&&!revoking)setPanel(null)};
  document.addEventListener("keydown",onKey);
  return()=>document.removeEventListener("keydown",onKey);
 },[panel,revoking]);

 async function loadInvites(){
  setLoading(true);setListError("");
  try{
   const response=await fetch("/api/admin/invites",{cache:"no-store"});
   const result=await response.json() as {invites?:Invite[];error?:string};
   if(!response.ok)throw new Error(result.error||"Unable to load invites.");
   setInvites(result.invites||[]);
  }catch(e){setListError(e instanceof Error?e.message:"Unable to load invites.")}
  finally{setLoading(false)}
 }
 function showActive(){
  setPanel("active");setConfirmHash(null);
  void loadInvites();
 }
 function showCreate(){
  setPanel("create");setError("");setNotice("");
 }

 async function generate(){
  setBusy(true);setError("");setNotice("");setInviteUrl("");
  try{
   const response=await fetch("/api/admin/invite",{method:"POST"});
   const result=await response.json() as {inviteUrl?:string;error?:string};
   if(!response.ok||!result.inviteUrl)throw new Error(result.error||"Could not create invitation.");
   setInviteUrl(result.inviteUrl);
  }catch(e){setError(e instanceof Error?e.message:"Invite failed.")}
  finally{setBusy(false)}
 }
 async function copy(){
  if(!inviteUrl)return;
  try{await navigator.clipboard.writeText(inviteUrl);setNotice("Invite link copied.");setError("")}
  catch{setError("Select and copy the link from the field below.")}
 }
 async function share(){
  if(!inviteUrl)return;
  if(navigator.share){
   try{await navigator.share({title:"Join AV Select",text:"You're invited to join AV Select. This one-use link is for you:",url:inviteUrl});return}
   catch(e){if(e instanceof Error&&e.name==="AbortError")return}
  }
  await copy();
 }
 async function revoke(hash:string){
  if(revoking)return;
  setRevoking(hash);setListError("");
  try{
   const response=await fetch("/api/admin/invites",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({tokenHash:hash})});
   const result=await response.json() as {error?:string};
   if(!response.ok)throw new Error(result.error||"Unable to revoke invite.");
   setInvites(items=>items.filter(i=>i.token_hash!==hash));
   setConfirmHash(null);
   setNotice("Invitation revoked.");
  }catch(e){setListError(e instanceof Error?e.message:"Unable to revoke invite.")}
  finally{setRevoking(null)}
 }
 const format=(v:string)=>new Date(v).toLocaleString("en-US",{dateStyle:"medium",timeStyle:"short"});
 return <section className="rounded-xl border border-slate-700/70 bg-[#121a29] p-3 sm:p-4" id="invite-technician">
  <div className="grid grid-cols-2 gap-2">
   <button type="button" className="button-secondary" aria-expanded={panel==="create"} onClick={()=>panel==="create"?setPanel(null):showCreate()}>
    <span aria-hidden="true" className="text-lg leading-none">+</span> Create invite
   </button>
   <button type="button" className="button-secondary" aria-expanded={panel==="active"} onClick={()=>panel==="active"?setPanel(null):showActive()}>
    <AppIcon name="activity" size={17}/> Active invites
   </button>
  </div>
  {panel==="create"&&<div className="space-y-3 pt-4">
   <p className="muted text-xs">Private, single-use invitation · Expires after 7 days.</p>
   <button type="button" className="primary w-full" disabled={busy} onClick={inviteUrl?share:generate}>
    {busy?"Generating…":inviteUrl?"Share invite":"Generate invite link"}
   </button>
   {inviteUrl&&<div className="flex items-center justify-center gap-4 text-sm">
    <button type="button" className="text-blue-300 underline" onClick={copy}>Copy link</button>
    <button type="button" className="muted underline" disabled={busy} onClick={generate}>New link</button>
   </div>}
   {notice&&<p role="status" className="text-green-300 text-xs">{notice}</p>}
   {error&&<p role="alert" className="text-red-300 text-sm">{error}</p>}
  </div>}
  {panel==="active"&&<div className="pt-4 space-y-3">
   <div className="flex justify-between items-center gap-2">
    <div><h2 className="text-sm font-semibold">Unused active invitations</h2>
     <p className="muted text-xs">Unclaimed links that have not expired.</p></div>
    <button type="button" className="text-blue-300 text-xs underline" disabled={loading||!!revoking} onClick={()=>void loadInvites()}>Refresh</button>
   </div>
   <div className="max-h-72 overflow-y-auto space-y-2" aria-live="polite">
    {loading?<p className="muted text-sm py-3">Loading invitations…</p>:
     !invites.length?<p className="muted text-sm py-3">No active invitations.</p>:
     invites.map(invite=><div key={invite.token_hash} className="rounded-lg border border-slate-700 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
       <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium">Invite created {format(invite.created_at)}</p>
        <p className="muted text-xs">Expires {format(invite.expires_at)}</p>
       </div>
       {confirmHash!==invite.token_hash&&<button type="button" className="text-red-300 text-xs font-medium shrink-0" disabled={!!revoking} onClick={()=>setConfirmHash(invite.token_hash)}>Revoke</button>}
      </div>
      {confirmHash===invite.token_hash&&<div className="space-y-2 border-t border-slate-700 pt-2">
       <p className="text-xs text-amber-200">Revoke this link? It will stop working immediately.</p>
       <div className="flex gap-2 flex-wrap">
        <button type="button" className="rounded-lg bg-red-700 px-3 py-2 text-xs font-semibold text-white" disabled={!!revoking} onClick={()=>void revoke(invite.token_hash)}>{revoking===invite.token_hash?"Revoking…":"Confirm revoke"}</button>
        <button type="button" className="pill !py-1.5 text-xs" disabled={!!revoking} onClick={()=>setConfirmHash(null)}>Cancel</button>
       </div>
      </div>}
     </div>)}
   </div>
   <p className="muted text-xs">For security, previously generated invite links cannot be retrieved or copied here. They can only be revoked.</p>
   {listError&&<p role="alert" className="text-red-300 text-xs">{listError}</p>}
   {notice&&<p role="status" className="text-green-300 text-xs">{notice}</p>}
  </div>}
 </section>;
}
