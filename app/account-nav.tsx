"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {browserDb} from "@/lib/supabase";

export default function AccountNav(){
 const [email,setEmail]=useState<string|null>(null);
 const [role,setRole]=useState<string|null>(null);
 const pathname=usePathname();
 useEffect(()=>{
  let active=true;
  const db=browserDb();
  async function loadRole(userId:string){
   const {data}=await db.from("profiles").select("role").eq("id",userId).maybeSingle();
   if(active)setRole(data?.role||null);
  }
  async function restore(){
   const {data:{user}}=await db.auth.getUser();
   if(!active)return;
   setEmail(user?.email||null);
   if(user)await loadRole(user.id);
   else setRole(null);
  }
  void restore();
  const {data:{subscription}}=db.auth.onAuthStateChange((_event,session)=>{
   if(!active)return;
   setEmail(session?.user.email||null);
   if(!session){setRole(null);return}
   // Supabase auth events hold an internal lock: load profile only after callback returns.
   queueMicrotask(()=>{if(active)void loadRole(session.user.id)});
  });
  return()=>{active=false;subscription.unsubscribe()};
 },[pathname]);
 async function logout(){
  const {error}=await browserDb().auth.signOut();
  if(error){alert(error.message);return}
  window.location.assign("/login");
 }
 return <nav aria-label="Account" className="border-b border-slate-800 bg-[#0e1523]">
  <div className="mx-auto max-w-6xl px-4 py-3 flex flex-wrap items-center gap-2 text-sm">
   <Link href="/" className="mr-auto inline-flex shrink-0 items-center" aria-label="AV Select home"><img src="/av-select-logo.png" alt="AV Select" width={150} height={50} className="h-9 w-auto max-w-[140px] object-contain" /></Link>
   {email?<>{role==="technician"&&<><Link className="pill" href="/offers">Offers</Link><Link className="pill" href="/profile">My profile</Link></>}
    {role==="admin"&&!pathname.startsWith("/admin")&&<Link className="pill" href="/admin">Dashboard</Link>}
    <button type="button" className="pill" onClick={logout}>Log out</button></>:
    <Link className="pill" href="/login">Sign in</Link>}
  </div>
 </nav>;
}
