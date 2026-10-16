"use client";
import {FormEvent,useEffect,useState} from "react";
import Link from "next/link";
import {browserDb} from "@/lib/supabase";

export default function Login(){
 const [email,setEmail]=useState(""),[password,setPassword]=useState("");
 const [error,setError]=useState(""),[busy,setBusy]=useState(false),[checking,setChecking]=useState(true);
 useEffect(()=>{
  let active=true;
  browserDb().auth.getUser().then(({data:{user}})=>{
   if(!active)return;
   if(user){window.location.replace("/");return}
   setChecking(false);
  }).catch(()=>{if(active)setChecking(false)});
  return()=>{active=false};
 },[]);
 async function submit(e:FormEvent){
  e.preventDefault();setBusy(true);setError("");
  try{
   const {error}=await browserDb().auth.signInWithPassword({email,password});
   if(error)throw error;
   window.location.replace("/");
  }catch(err){setError(err instanceof Error?err.message:"Login failed");setBusy(false)}
 }
 return <main className="min-h-[75vh] flex items-center justify-center p-4 sm:p-6">
  <form onSubmit={submit} className="panel w-full max-w-md space-y-5">
   <div className="inline-flex rounded-xl bg-slate-100 px-3 py-2"><img src="/av-select-logo.png" alt="AV Select" width={240} height={80} className="h-auto w-[210px]" /></div>
   <h1 className="text-3xl font-bold">Welcome back</h1>
   {checking?<p className="muted text-sm">Checking your saved login…</p>:<>
    <p className="muted text-sm">Sign in with your invited account. AV Select keeps you signed in on this device unless you log out or the session is revoked.</p>
    <div><label className="label" htmlFor="email">Email</label><input id="email" type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></div>
    <div><label className="label" htmlFor="password">Password</label><input id="password" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></div>
    {error&&<p role="alert" className="text-red-400 text-sm">{error}</p>}
    <button disabled={busy} className="primary w-full">{busy?"Signing in…":"Sign in"}</button>
    <p className="muted text-xs">Use Log out in the top menu whenever you want to end your session.</p>
   </>}
  </form>
 </main>;
}
