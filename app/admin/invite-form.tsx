"use client";
import {useState} from "react";
export default function InviteForm(){
 const [inviteUrl,setInviteUrl]=useState("");
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 async function generate(){
  setBusy(true);setError("");setNotice("");setInviteUrl("");
  try{
   const response=await fetch("/api/admin/invite",{method:"POST"});
   const result=await response.json() as {inviteUrl?:string;error?:string};
   if(!response.ok||!result.inviteUrl)throw new Error(result.error||"Could not create invitation.");
   setInviteUrl(result.inviteUrl);
  }catch(e){setError(e instanceof Error?e.message:"Invite failed.");}
  finally{setBusy(false)}
 }
 async function copy(){
  if(!inviteUrl)return;
  try{await navigator.clipboard.writeText(inviteUrl);setNotice("Link copied.");setError("")}
  catch{setError("Copy the link from the field below.")}
 }
 async function share(){
  if(!inviteUrl)return;
  if(navigator.share){
   try{
    await navigator.share({title:"Join AV Select",text:"You're invited to join AV Select. This one-use link is for you:",url:inviteUrl});
    return;
   }catch(e){if(e instanceof Error&&e.name==="AbortError")return}
  }
  await copy();
 }
 return <details className="rounded-xl border border-slate-700/70 bg-[#121a29] px-4 py-3" id="invite-technician">
  <summary className="flex cursor-pointer items-center justify-between gap-3 font-semibold list-none [&::-webkit-details-marker]:hidden">
   <span className="flex items-center gap-2"><span className="text-blue-300">＋</span> Invite technician</span>
   <span className="muted text-xs font-normal">Create & share link</span>
  </summary>
  <div className="pt-4 space-y-3">
   <button type="button" className="primary w-full" disabled={busy} onClick={inviteUrl?share:generate}>
    {busy?"Generating…":inviteUrl?"↗  Share invite":"Generate invite link"}
   </button>
   {inviteUrl?<div className="flex items-center justify-center gap-4 text-sm">
    <button type="button" className="text-blue-300 underline" onClick={copy}>Copy link</button>
    <button type="button" className="muted underline" disabled={busy} onClick={generate}>New link</button>
   </div>:<p className="muted text-xs text-center">Single-use private link · Expires in 7 days</p>}
   {inviteUrl&&<details className="text-xs muted"><summary className="cursor-pointer">View private link</summary><textarea aria-label="Private invite link" readOnly value={inviteUrl} rows={2} className="text-xs mt-2" onFocus={e=>e.currentTarget.select()}/></details>}
   {inviteUrl&&<p className="muted text-xs text-center">Share privately. Anyone with the link can claim it once.</p>}
   {notice&&<p role="status" className="text-green-300 text-xs text-center">{notice}</p>}
   {error&&<p role="alert" className="text-red-300 text-sm">{error}</p>}
  </div>
 </details>;
}
