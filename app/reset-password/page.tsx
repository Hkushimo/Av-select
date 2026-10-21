"use client";
import {useEffect,useState,type FormEvent} from "react";
import Link from "next/link";
import {browserDb} from "@/lib/supabase";

export default function ResetPassword(){
 const [checking,setChecking]=useState(true),[ready,setReady]=useState(false);
 const [password,setPassword]=useState(""),[repeat,setRepeat]=useState("");
 const [busy,setBusy]=useState(false),[done,setDone]=useState(false),[error,setError]=useState("");
 useEffect(()=>{
  let active=true;const db=browserDb();
  const {data:{subscription}}=db.auth.onAuthStateChange((event,session)=>{
   if(active&&session&&(event==="PASSWORD_RECOVERY"||event==="SIGNED_IN")){
    setReady(true);setChecking(false);
   }
  });
  void db.auth.getSession().then(({data:{session},error:sessionError})=>{
   if(!active)return;
   if(sessionError)setError("Unable to verify this recovery link.");
   if(session)setReady(true);
   setChecking(false);
  }).catch(()=>{if(active){setChecking(false);setError("Unable to verify the recovery link.");}});
  return()=>{active=false;subscription.unsubscribe()};
 },[]);
 async function submit(e:FormEvent){
  e.preventDefault();setError("");
  if(password.length<10||password!==repeat){
   setError("Use at least 10 characters and make sure the passwords match.");return;
  }
  setBusy(true);
  try{
   const {error:updateError}=await browserDb().auth.updateUser({password});
   if(updateError)throw updateError;
   setDone(true);setPassword("");setRepeat("");
  }catch(e){setError(e instanceof Error?e.message:"Unable to change password.");}
  finally{setBusy(false);}
 }
 return <main className="mx-auto max-w-md px-4 py-10">
  <section className="panel space-y-4">
   <h1 className="text-2xl font-bold">Choose a new password</h1>
   {checking?<p className="muted text-sm">Checking your recovery link…</p>:
    done?<div role="status" className="space-y-3">
     <p className="text-green-300 text-sm">Your password has been updated.</p>
     <Link href="/" className="text-blue-300 text-sm font-semibold">Continue to AV Select →</Link>
    </div>:ready?<form onSubmit={submit} className="space-y-4">
     <p className="muted text-sm">Use at least 10 characters. This changes the password for your signed-in account.</p>
     <label className="block"><span className="label">New password</span>
      <input type="password" autoComplete="new-password" required minLength={10}
       value={password} onChange={e=>setPassword(e.target.value)} disabled={busy}/></label>
     <label className="block"><span className="label">Confirm new password</span>
      <input type="password" autoComplete="new-password" required minLength={10}
       value={repeat} onChange={e=>setRepeat(e.target.value)} disabled={busy}/></label>
     {error&&<p role="alert" className="text-red-300 text-sm">{error}</p>}
     <button className="primary w-full" type="submit" disabled={busy}>{busy?"Updating…":"Update password"}</button>
    </form>:<div className="space-y-3">
     <p role="alert" className="text-amber-200 text-sm">{error||"This recovery link has expired or couldn't be verified."}</p>
     <Link href="/forgot-password" className="text-blue-300 text-sm font-semibold">Request another link →</Link>
    </div>}
  </section>
 </main>;
}
