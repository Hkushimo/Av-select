"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {browserDb} from "@/lib/supabase";
export default function AccountNav(){
 const [email,setEmail]=useState<string|null>(null),[role,setRole]=useState<string|null>(null);
 const pathname=usePathname();
 useEffect(()=>{
  let active=true;const db=browserDb();
  async function refresh(){
   const {data:{user}}=await db.auth.getUser();
   if(!active)return;
   setEmail(user?.email||null);
   if(!user){setRole(null);return}
   const {data}=await db.from("profiles").select("role").eq("id",user.id).maybeSingle();
   if(active)setRole(data?.role||null);
  }
  void refresh();
  const {data:{subscription}}=db.auth.onAuthStateChange(()=>{void refresh()});
  return ()=>{active=false;subscription.unsubscribe()};
 },[pathname]);
 async function logout(){
  const {error}=await browserDb().auth.signOut();
  if(error){alert(error.message);return}
  window.location.assign("/login");
 }
 return <nav aria-label="Account" className="border-b border-slate-800 bg-[#0e1523]">
  <div className="mx-auto max-w-6xl px-4 py-3 flex flex-wrap items-center gap-2 text-sm">
   <Link href="/" className="font-bold tracking-widest text-blue-400 mr-auto">AV SELECT</Link>
   {email?<>{role==="technician"&&<><Link className="pill" href="/offers">Offers</Link><Link className="pill" href="/profile">My profile</Link></>}
    {role==="admin"&&<Link className="pill" href="/admin">Dashboard</Link>}
    <button type="button" className="pill" onClick={logout}>Log out</button></>:
    <Link className="pill" href="/login">Sign in</Link>}
  </div>
 </nav>;
}
