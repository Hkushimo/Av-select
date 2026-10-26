"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {browserDb} from "@/lib/supabase";
import JobActivityBadge,{UnreadBubble,useJobActivityCount} from "./job-activity-badge";
import AppIcon from "./app-icon";

export default function AccountNav(){
 const [email,setEmail]=useState<string|null>(null);
 const [role,setRole]=useState<string|null>(null);
 const [userId,setUserId]=useState<string|null>(null);
 const [open,setOpen]=useState(false);
 const pathname=usePathname();
 const unread=useJobActivityCount(userId,role);
 useEffect(()=>{setOpen(false)},[pathname]);
 useEffect(()=>{
  if(!open)return;
  const onKey=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false)};
  document.addEventListener("keydown",onKey);
  return()=>document.removeEventListener("keydown",onKey);
 },[open]);
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
   if(user)await loadRole(user.id);else setRole(null);
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
 const scheduleLabel="My Schedule";
 const activityLabel=isAdmin?"Activity":scheduleLabel;
 const activityHref=isAdmin?"/admin/activity":"/offers";
 return <nav aria-label="Account" className="sticky top-0 z-50 border-b border-slate-800 bg-[#0e1523]">
  <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3 text-sm">
   <Link href="/" className="inline-flex shrink-0 items-center" aria-label="AV Select home" onClick={()=>setOpen(false)}>
    <img src="/av-select-logo.png" alt="AV Select" width={150} height={50} className="h-9 w-auto max-w-[140px] object-contain"/>
   </Link>
   <div className="hidden sm:flex items-center gap-2">
    {email?<>{isTech&&<><Link className="pill" aria-current={pathname==="/dashboard"?"page":undefined} href="/dashboard">Dashboard</Link><JobActivityBadge role="technician" count={unread}/><Link className="pill" aria-current={pathname==="/billing"?"page":undefined} href="/billing">Billing</Link><Link className="pill" aria-current={pathname==="/profile"?"page":undefined} href="/profile">My profile</Link></>}
     {isAdmin&&<><Link className="pill" aria-current={pathname==="/admin"?"page":undefined} href="/admin">Dashboard</Link><Link className="pill" aria-current={pathname==="/admin/jobs"?"page":undefined} href="/admin/jobs">Jobs</Link><Link className="pill" aria-current={pathname==="/admin/invoices"?"page":undefined} href="/admin/invoices">Invoices</Link><JobActivityBadge role="admin" count={unread}/></>}
     <button type="button" className="pill" onClick={logout}>Log out</button></>:
     <Link className="pill" aria-current={pathname==="/login"?"page":undefined} href="/login">Sign in</Link>}
   </div>
   <button type="button" className="sm:hidden relative flex h-10 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-600 text-slate-100 hover:bg-slate-800"
    aria-label={open?"Close menu":"Open menu"} aria-expanded={open} aria-controls="mobile-account-menu" onClick={()=>setOpen(v=>!v)}>
    <AppIcon name={open?"x":"menu"} size={22}/>
    {(isTech||isAdmin)&&<UnreadBubble count={unread}/>}
   </button>
  </div>
  {open&&<div className="sm:hidden">
   <button type="button" aria-label="Close navigation menu" onClick={()=>setOpen(false)}
     className="fixed inset-0 z-[-1] bg-black/30 cursor-default"/>
   <div id="mobile-account-menu" className="absolute top-full right-4 z-40 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-slate-700 bg-[#172235] p-2 shadow-2xl">
    {email?<div className="flex flex-col gap-1">
     {(isTech||isAdmin)&&<Link href={isAdmin?"/admin":"/dashboard"} onClick={()=>setOpen(false)}
       className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-slate-700/60"><AppIcon name="home" className="text-blue-300"/> Dashboard</Link>}
     {isAdmin&&<Link href="/admin/jobs" onClick={()=>setOpen(false)}
       className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-slate-700/60">
       <AppIcon name="jobs" className="text-blue-300"/> Jobs
      </Link>}
     {isAdmin&&<Link href="/admin/invoices" onClick={()=>setOpen(false)}
       className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-slate-700/60">
       <AppIcon name="wallet" className="text-blue-300"/> Invoices
      </Link>}
     {(isTech||isAdmin)&&<Link href={activityHref} onClick={()=>setOpen(false)}
       className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-slate-700/60">
       <AppIcon name={isAdmin?"activity":"calendar"} className="text-blue-300"/>
       <span className="flex-1">{activityLabel}</span>
       {unread>0&&<span className="rounded-full bg-red-600 px-2 py-0.5 min-w-6 text-center text-xs font-bold text-white">{unread>99?"99+":unread}</span>}
      </Link>}
     {isTech&&<Link href="/billing" onClick={()=>setOpen(false)}
       className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-slate-700/60"><AppIcon name="wallet" className="text-blue-300"/> Billing</Link>}
     {isTech&&<Link href="/profile" onClick={()=>setOpen(false)}
       className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-slate-700/60"><AppIcon name="user" className="text-blue-300"/> My profile</Link>}
     <div className="my-1 border-t border-slate-700"/>
     <button type="button" onClick={logout} className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-slate-300 hover:bg-slate-700/60"><AppIcon name="logout"/> Log out</button>
    </div>:<Link href="/login" onClick={()=>setOpen(false)} className="block rounded-lg px-3 py-3 text-sm hover:bg-slate-700/60">Sign in</Link>}
   </div>
  </div>}
 </nav>;
}
