"use client";
import {useState} from "react";
import Link from "next/link";
import TechnicianAvatar from "./technician-avatar";
export type RosterTech={user_id:string;full_name:string;city:string;travel:string;roles:string[];equipment:string[];avatar_path:string|null};
export type RosterRating={technician_id:string;skill:string;level:number};
const norm=(s:string)=>s.trim().toLowerCase();
export function rosterMatch(t:RosterTech,ratings:RosterRating[],query:string,role:string,equipment:string,travel:string,ratingSkill:string,minLevel:number){
 const q=norm(query);
 const searchable=[t.full_name,t.city,...(t.roles||[]),...(t.equipment||[])].join(" ").toLowerCase();
 return (!q||searchable.includes(q))&&(!role||(t.roles||[]).includes(role))&&(!equipment||(t.equipment||[]).includes(equipment))&&(!travel||t.travel===travel)&&(!ratingSkill||ratings.some(r=>r.technician_id===t.user_id&&r.skill===ratingSkill&&r.level>=minLevel));
}
export default function RosterFilters({technicians,ratings}:{technicians:RosterTech[];ratings:RosterRating[]}){
 const [query,setQuery]=useState("");
 const filtered=technicians.filter(t=>rosterMatch(t,ratings,query,"","","","",1));
 const active=!!query.trim();
 function clear(){setQuery("")}
 return <section className="space-y-3" aria-label="Technician roster">
  <div className="flex items-center justify-between gap-3">
   <h2 className="text-lg font-semibold">Technician roster</h2>
   <span className="text-xs muted">{filtered.length} of {technicians.length}</span>
  </div>
  <input aria-label="Search roster" type="search" placeholder="Search name, city, position, equipment…" value={query} onChange={e=>setQuery(e.target.value)}/>
  <div className="rounded-2xl border border-slate-700/70 bg-[#121a29] px-3 sm:px-4">
   {!filtered.length?<div className="py-6 space-y-2"><p className="muted text-sm">{technicians.length?"No technicians match your search.":"No technicians yet. Invite your first technician above."}</p>{active&&<button type="button" className="text-blue-300 text-sm underline" onClick={clear}>Clear search</button>}</div>:
    filtered.map((t,index)=>{
     const matched=ratings.filter(r=>r.technician_id===t.user_id);
     return <Link href={`/admin/technicians/${t.user_id}`} key={t.user_id}
      className={`flex items-center gap-3 py-3.5 hover:bg-slate-800/60 focus-visible:outline-2 focus-visible:outline-blue-400 ${index?"border-t border-slate-700/70":""}`}>
      <TechnicianAvatar path={t.avatar_path} name={t.full_name||"Technician"}/>
      <div className="flex-1 min-w-0">
       <p className="font-semibold truncate">{t.full_name||"Incomplete profile"}</p>
       <p className="muted text-xs sm:text-sm mt-0.5 truncate">{[t.city,t.roles?.[0]].filter(Boolean).join(" · ")||"Profile incomplete"}</p>
       {!!matched.length&&<p className="text-blue-300 text-xs truncate mt-1">{matched.slice(0,3).map(r=>`${r.skill} ${r.level}/5`).join(" · ")}</p>}
      </div><span className="text-blue-300 text-xl pr-1" aria-hidden="true">›</span>
     </Link>
    })}
  </div>
  <p className="muted text-xs">Open a technician to review their full profile, then send offers from a job's staffing page.</p>
 </section>;
}
