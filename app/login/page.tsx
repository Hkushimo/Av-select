"use client";
import {FormEvent,useEffect,useState} from "react";
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
 return <main className="min-h-[70vh] flex items-center justify-center px-4 py-8 sm:p-6">
  <form onSubmit={submit} className="panel w-full max-w-md space-y-5">
   <div><h1 className="text-2xl sm:text-3xl font-bold">Sign in</h1><p className="muted text-sm mt-1">Welcome back to AV Select.</p></div>
   {checking?<p className="muted text-sm">Checking your session…</p>:<>
    <div><label className="label" htmlFor="email">Email</label><input id="email" type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></div>
    <div><label className="label" htmlFor="password">Password</label><input id="password" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></div>
    {error&&<p role="alert" className="text-red-400 text-sm">{error}</p>}
    <button disabled={busy} className="primary w-full">{busy?"Signing in…":"Sign in"}</button>
    <a href="/forgot-password" className="inline-block text-blue-300 text-sm hover:underline">Forgot password?</a>
   </>}
  </form>
 </main>;
}
