"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {browserDb} from "@/lib/supabase";
import JobActivityBadge,{UnreadBubble,useJobActivityCount} from "./job-activity-badge";

export default function AccountNav(){
 const [email,setEmail]=useState<string|null>(null);
 const [role,setRole]=useState<string|null>(null);
 const [userId,setUserId]=useState<string|null>(null);
 const [open,setOpen]=useState(false);
 const pathname=usePathname();
 const unread=useJobActivityCount(userId,role);
 useEffect(()=>{setOpen(false)},[pathname]);
 useEffect(()=>{
  let active=true;
  const db=browserDb();
  async function loadRole(id:string){
   const {data}=await db.from("profiles").select("role").eq("id",id).maybeSingle();
   if(active)setRole(data?.role||null);
  }
  async function restore(){
   const {data:{user}}=await db.auth.getUser();
   if(!active)return;
   setEmail(user?.email||null);setUserId(user?.id||null);
   if(user)await loadRole(user.id);
   else setRole(null);
  }
  void restore();
  const {data:{subscription}}=db.auth.onAuthStateChange((_event,session)=>{
   if(!active)return;
   setEmail(session?.user.email||null);setUserId(session?.user.id||null);
   if(!session){setRole(null);setOpen(false);return}
   queueMicrotask(()=>{if(active)void loadRole(session.user.id)});
  });
  return()=>{active=false;subscription.unsubscribe()};
 },[]);
 async function logout(){
  const {error}=await browserDb().auth.signOut();
  if(error){alert(error.message);return}
  window.location.assign("/login");
 }
 const isTech=role==="technician"&&!!userId;
 const isAdmin=role==="admin"&&!!userId;
 return <nav aria-label="Account" className="border-b border-slate-800 bg-[#0e1523]">
  <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3 text-sm">
   <Link href="/" className="inline-flex shrink-0 items-center" aria-label="AV Select home" onClick={()=>setOpen(false)}>
    <img src="/av-select-logo.png" alt="AV Select" width={150} height={50} className="h-9 w-auto max-w-[140px] object-contain"/>
   </Link>
   <div className="hidden sm:flex items-center gap-2">
    {email?<>{isTech&&<><JobActivityBadge role="technician" count={unread}/><Link className="pill" href="/profile">My profile</Link></>}
     {isAdmin&&<><JobActivityBadge role="admin" count={unread}/>{!pathname.startsWith("/admin")&&<Link className="pill" href="/admin">Dashboard</Link>}</>}
     <button type="button" className="pill" onClick={logout}>Log out</button></>:
     <Link className="pill" href="/login">Sign in</Link>}
   </div>
   <button type="button" className="sm:hidden relative flex h-10 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-600 text-slate-100 hover:bg-slate-800"
    aria-label={open?"Close menu":"Open menu"} aria-expanded={open} aria-controls="mobile-account-menu" onClick={()=>setOpen(v=>!v)}>
    {open?<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg>:
     <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>}
    {(isTech||isAdmin)&&<UnreadBubble count={unread}/>}
   </button>
  </div>
  {open&&<div id="mobile-account-menu" className="sm:hidden border-t border-slate-800 px-4 py-3">
   <div className="mx-auto max-w-6xl flex flex-col items-stretch gap-3">
    {email?<>{isTech&&<><JobActivityBadge role="technician" count={unread} onNavigate={()=>setOpen(false)}/><Link href="/profile" className="pill text-center" onClick={()=>setOpen(false)}>My profile</Link></>}
     {isAdmin&&<><Link href="/admin" className="pill text-center" onClick={()=>setOpen(false)}>Dashboard</Link><JobActivityBadge role="admin" count={unread} onNavigate={()=>setOpen(false)}/></>}
     <button type="button" className="pill" onClick={logout}>Log out</button></>:
     <Link href="/login" className="pill text-center" onClick={()=>setOpen(false)}>Sign in</Link>}
   </div>
  </div>}
 </nav>;
}
