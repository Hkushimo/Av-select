"use client";
import Link from "next/link";
import {useState,type FormEvent} from "react";
import {browserDb} from "@/lib/supabase";

export default function ForgotPassword(){
 const [email,setEmail]=useState("");
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[sent,setSent]=useState(false);
 async function request(e:FormEvent){
  e.preventDefault();setError("");setBusy(true);
  try{
   const {error:authError}=await browserDb().auth.resetPasswordForEmail(email.trim(),{
    redirectTo:window.location.origin+"/reset-password"
   });
   if(authError)throw authError;
   setSent(true);
  }catch(e){setError(e instanceof Error?e.message:"Unable to request password recovery.");}
  finally{setBusy(false);}
 }
 return <main className="mx-auto max-w-md px-4 py-10">
  <section className="panel space-y-4">
   <h1 className="text-2xl font-bold">Reset your password</h1>
   <p className="muted text-sm">Enter the email used for your AV Select account. We'll email a secure link if an account exists.</p>
   {sent?<div role="status" className="space-y-3">
    <p className="text-green-300 text-sm">If an account exists for that email, a recovery link is on its way. Check your inbox and spam folder.</p>
    <Link href="/login" className="text-blue-300 text-sm font-semibold">Back to sign in →</Link>
   </div>:<form onSubmit={request} className="space-y-4">
    <label className="block"><span className="label">Email address</span>
     <input type="email" autoComplete="email" required maxLength={254}
      value={email} onChange={e=>setEmail(e.target.value)} disabled={busy}/></label>
    {error&&<p role="alert" className="text-red-300 text-sm">{error}</p>}
    <button type="submit" className="primary w-full" disabled={busy}>{busy?"Sending…":"Email recovery link"}</button>
    <Link href="/login" className="inline-block text-blue-300 text-sm">← Back to sign in</Link>
   </form>}
  </section>
 </main>;
}
