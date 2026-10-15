"use client";
import {useEffect,useState} from "react";
import {browserDb} from "@/lib/supabase";
export default function TechnicianAvatar({path,name,size="sm"}:{path:string|null;name:string;size?:"sm"|"lg"}){
 const [url,setUrl]=useState("");
 useEffect(()=>{let active=true;setUrl("");if(!path)return;
  browserDb().storage.from("technician-avatars").createSignedUrl(path,600)
   .then(({data})=>{if(active)setUrl(data?.signedUrl||"")});
  return()=>{active=false};
 },[path]);
 const dimension=size==="lg"?"h-24 w-24 text-3xl":"h-12 w-12 text-lg";
 if(!url)return <div className={dimension+" shrink-0 rounded-full bg-slate-800 grid place-content-center"} aria-hidden="true">👤</div>;
 return <img src={url} alt={name+"'s profile"} className={dimension+" shrink-0 rounded-full object-cover border border-slate-700"}/>;
}
