"use client";
import {useState,type FormEvent} from "react";
export default function SetTechnicianPassword({id,name}:{id:string;name:string}){
 const [open,setOpen]=useState(false),[password,setPassword]=useState(""),[repeat,setRepeat]=useState("");
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
 function close(){setOpen(false);setPassword("");setRepeat("");setError("")}
 async function save(event:FormEvent){
  event.preventDefault();setError("");setMessage("");
  if(password!==repeat){setError("Passwords do not match.");return}
  if(password.length<12||password.length>128){setError("Use 12 to 128 characters.");return}
  setBusy(true);
  try{
   const response=await fetch(`/api/admin/technicians/${id}/password`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password})});
   const result=await response.json();
   if(!response.ok)throw new Error(result.error||"Could not update password.");
   close();setMessage(`Password updated for ${name}. Share it with them privately.`);
  }catch(err){setError(err instanceof Error?err.message:"Could not update password.")}
  finally{setBusy(false)}
 }
 return <section className="panel space-y-3">
  <h2 className="text-lg font-semibold">Account access</h2>
  <p className="muted text-sm">The technician can use Forgot password on the sign-in page, or you can set a new password here. Existing passwords cannot be viewed.</p>
  {message&&<p role="status" className="text-green-300 text-sm">{message}</p>}
  {!open?<button type="button" className="pill" onClick={()=>{setOpen(true);setMessage("")}}>Set new password</button>:<form onSubmit={save} className="space-y-3">
   <p className="text-sm">Set a new password for <strong>{name}</strong>. This replaces their current password immediately.</p>
   <label className="block"><span className="label">New password</span><input type="password" autoComplete="new-password" minLength={12} maxLength={128} required disabled={busy} value={password} onChange={e=>setPassword(e.target.value)}/></label>
   <label className="block"><span className="label">Confirm new password</span><input type="password" autoComplete="new-password" minLength={12} maxLength={128} required disabled={busy} value={repeat} onChange={e=>setRepeat(e.target.value)}/></label>
   <p className="muted text-xs">Use at least 12 characters. Share it privately and ask them to choose their own password afterward.</p>
   {error&&<p role="alert" className="text-red-300 text-sm">{error}</p>}
   <div className="flex flex-wrap gap-2"><button className="primary" type="submit" disabled={busy}>{busy?"Updating…":"Update password"}</button><button className="pill" type="button" disabled={busy} onClick={close}>Cancel</button></div>
  </form>}
 </section>;
}
