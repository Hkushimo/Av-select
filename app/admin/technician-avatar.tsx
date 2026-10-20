"use client";
import {useEffect,useRef,useState} from "react";
import {avatarSignedUrl} from "@/lib/avatar-urls";

export default function TechnicianAvatar({path,name,size="sm"}:{path:string|null;name:string;size?:"sm"|"lg"}){
 const container=useRef<HTMLDivElement>(null);
 const [visiblePath,setVisiblePath]=useState<string|null>(null);
 const [signed,setSigned]=useState<{path:string;url:string}|null>(null);

 // On long roster pages, defer even the signed-URL request until the avatar
 // is near the viewport. The single-technician detail avatar loads eagerly.
 useEffect(()=>{
  if(!path)return;
  if(size==="lg"||typeof IntersectionObserver==="undefined"){
   setVisiblePath(path);
   return;
  }
  const element=container.current;
  if(!element){setVisiblePath(path);return}
  const observer=new IntersectionObserver(entries=>{
   if(entries.some(entry=>entry.isIntersecting)){
    setVisiblePath(path);
    observer.disconnect();
   }
  },{rootMargin:"240px"});
  observer.observe(element);
  return()=>observer.disconnect();
 },[path,size]);

 useEffect(()=>{
  if(!path||visiblePath!==path)return;
  let active=true;
  avatarSignedUrl(path)
   .then(url=>{if(active)setSigned({path,url})})
   .catch(()=>{if(active)setSigned(null)});
  return()=>{active=false};
 },[path,visiblePath]);

 const url=signed?.path===path?signed.url:"";
 const dimension=size==="lg"?"h-24 w-24 text-3xl":"h-12 w-12 text-lg";
 return <div ref={container} className={dimension+" relative shrink-0 overflow-hidden rounded-full bg-slate-800 grid place-items-center"} >
  {url?<img
   src={url}
   alt={name+"'s profile"}
   loading={size==="sm"?"lazy":"eager"}
   decoding="async"
   width={size==="lg"?96:48}
   height={size==="lg"?96:48}
   onError={()=>setSigned(current=>current?.path===path?null:current)}
   className="absolute inset-0 h-full w-full object-cover border border-slate-700 rounded-full"
  />:<span aria-hidden="true">👤</span>}
 </div>;
}
