"use client";
import {useMemo,useState} from "react";
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
 const [query,setQuery]=useState(""),[role,setRole]=useState(""),[equipment,setEquipment]=useState("");
 const [travel,setTravel]=useState(""),[ratingSkill,setRatingSkill]=useState(""),[minLevel,setMinLevel]=useState(3);
 const [showFilters,setShowFilters]=useState(false);
 const roles=useMemo(()=>Array.from(new Set(technicians.flatMap(t=>t.roles||[]))).sort(),[technicians]);
 const equipmentOptions=useMemo(()=>Array.from(new Set(technicians.flatMap(t=>t.equipment||[]))).sort(),[technicians]);
 const skills=useMemo(()=>Array.from(new Set(ratings.map(r=>r.skill))).sort(),[ratings]);
 const filtered=technicians.filter(t=>rosterMatch(t,ratings,query,role,equipment,travel,ratingSkill,minLevel));
 const active=!!(query||role||equipment||travel||ratingSkill);
 function clear(){setQuery("");setRole("");setEquipment("");setTravel("");setRatingSkill("");setMinLevel(3)}
 return <section className="space-y-3" aria-label="Technician roster">
  <div className="flex items-center justify-between gap-3">
   <h2 className="text-lg font-semibold">Technician roster</h2>
   <span className="text-xs muted">{filtered.length} of {technicians.length}</span>
  </div>
  <div className="space-y-3">
   <input aria-label="Search roster" type="search" placeholder="Search name, city, position, equipment…" value={query} onChange={e=>setQuery(e.target.value)}/>
   <div className="flex items-center gap-3">
    <button type="button" aria-expanded={showFilters} className="pill flex-1 text-sm text-blue-300" onClick={()=>setShowFilters(v=>!v)}>{showFilters?"Hide filters":"Filter crew"}{active?" · Active":""} <span aria-hidden="true">⌄</span></button>
    {active&&<button type="button" className="text-sm text-blue-300 underline" onClick={clear}>Clear all</button>}
   </div>
   {showFilters&&<div className="rounded-xl border border-slate-700 bg-[#121a29] p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
    <label className="block"><span className="label">Position (self-reported)</span><select value={role} onChange={e=>setRole(e.target.value)}><option value="">All positions</option>{roles.map(r=><option key={r} value={r}>{r}</option>)}</select></label>
    <label className="block"><span className="label">Equipment familiarity</span><select value={equipment} onChange={e=>setEquipment(e.target.value)}><option value="">All equipment</option>{equipmentOptions.map(s=><option key={s} value={s}>{s}</option>)}</select></label>
    <label className="block"><span className="label">Travel preference</span><select value={travel} onChange={e=>setTravel(e.target.value)}><option value="">Any travel preference</option><option value="local">Local</option><option value="regional">Regional</option><option value="national">Nationwide</option><option value="international">International</option></select></label>
    <label className="block"><span className="label">Official admin-rated skill</span><select value={ratingSkill} onChange={e=>setRatingSkill(e.target.value)}><option value="">Any rating / unrated</option>{skills.map(s=><option key={s} value={s}>{s}</option>)}</select></label>
    {ratingSkill&&<label className="block sm:col-span-2"><span className="label">Minimum official proficiency: {minLevel}/5</span><input aria-label="Minimum official proficiency" type="range" min={1} max={5} value={minLevel} onChange={e=>setMinLevel(Number(e.target.value))} className="!p-0 accent-blue-500"/></label>}
    <p className="muted text-xs sm:col-span-2">Filters combine to narrow results. Unrated technicians are excluded only when an official rating filter is selected. Travel preference is self-reported, not availability confirmation.</p>
   </div>}
  </div>
  <div className="rounded-2xl border border-slate-700/70 bg-[#121a29] px-3 sm:px-4">
   {!filtered.length?<div className="py-6 space-y-2"><p className="muted text-sm">{technicians.length?"No technicians match your filters.":"No technicians yet. Invite your first technician above."}</p>{active&&<button type="button" className="text-blue-300 text-sm underline" onClick={clear}>Clear filters</button>}</div>:
    filtered.map((t,index)=>{
     const matched=ratings.filter(r=>r.technician_id===t.user_id&&(ratingSkill?r.skill===ratingSkill:true));
     return <Link href={`/admin/technicians/${t.user_id}`} key={t.user_id}
      className={`flex items-center gap-3 py-3.5 hover:bg-slate-800/60 focus-visible:outline-2 focus-visible:outline-blue-400 ${index?"border-t border-slate-700/70":""}`}>
      <TechnicianAvatar path={t.avatar_path} name={t.full_name||"Technician"}/>
      <div className="flex-1 min-w-0">
       <p className="font-semibold truncate">{t.full_name||"Incomplete profile"}</p>
       <p className="muted text-xs sm:text-sm mt-0.5 truncate">{[t.city,role||t.roles?.[0]].filter(Boolean).join(" · ")||"Profile incomplete"}</p>
       {!!matched.length&&<p className="text-blue-300 text-xs truncate mt-1">{matched.slice(0,3).map(r=>`${r.skill} ${r.level}/5`).join(" · ")}</p>}
      </div><span className="text-blue-300 text-xl pr-1" aria-hidden="true">›</span>
     </Link>
    })}
  </div>
  <p className="muted text-xs">Open a technician to review their full profile, then send offers from a job's staffing page.</p>
 </section>;
}
