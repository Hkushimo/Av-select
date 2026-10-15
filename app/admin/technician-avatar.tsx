"use client";
import {useEffect,useState} from "react";
import {browserDb} from "@/lib/supabase";
export default function TechnicianAvatar({path,name}:{path:string|null;name:string}){
 const [url,setUrl]=useState("");
 useEffect(()=>{let active=true;setUrl("");if(!path)return;
  browserDb().storage.from("technician-avatars").createSignedUrl(path,600)
   .then(({data})=>{if(active)setUrl(data?.signedUrl||"")});
  return()=>{active=false};
 },[path]);
 if(!url)return <div className="h-12 w-12 shrink-0 rounded-full bg-slate-800 grid place-content-center text-lg" aria-hidden="true">👤</div>;
 return <img src={url} alt={name+"'s profile"} className="h-12 w-12 shrink-0 rounded-full object-cover border border-slate-700"/>;
}
