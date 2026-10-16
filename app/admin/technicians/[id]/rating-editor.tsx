"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {browserDb} from "@/lib/supabase";

type Rating={skill:string;level:number};
const labels=["","Beginner","Developing","Competent","Advanced","Expert"];
export default function RatingEditor({technicianId,initialRatings,suggestions}:{
 technicianId:string;initialRatings:Rating[];suggestions:string[];
}){
 const router=useRouter();
 const [ratings,setRatings]=useState<Rating[]>(initialRatings);
 const [skill,setSkill]=useState(""),[customSkill,setCustomSkill]=useState(""),[level,setLevel]=useState(3);
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const options=Array.from(new Set(suggestions.map(s=>s.trim()).filter(Boolean))).filter(s=>!ratings.some(r=>r.skill===s));
 async function save(name:string,value:number){
  if(busy)return;
  setBusy(true);setError("");setNotice("");
  try{
   const db=browserDb();
   const {data:{user},error:authError}=await db.auth.getUser();
   if(authError||!user)throw new Error("Sign in to rate technicians.");
   const {error:writeError}=await db.from("skill_ratings").upsert({
    technician_id:technicianId,skill:name,level:value,rated_by:user.id,updated_at:new Date().toISOString()
   },{onConflict:"technician_id,skill"});
   if(writeError)throw writeError;
   setRatings(old=>[...old.filter(r=>r.skill!==name),{skill:name,level:value}].sort((a,b)=>a.skill.localeCompare(b.skill)));
   setNotice("Proficiency rating saved.");setSkill("");setCustomSkill("");router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Could not save rating.")}
  finally{setBusy(false)}
 }
 async function remove(name:string){
  if(busy)return;
  setBusy(true);setError("");setNotice("");
  const {error}=await browserDb().from("skill_ratings").delete().eq("technician_id",technicianId).eq("skill",name);
  if(error)setError(error.message);
  else{setRatings(old=>old.filter(r=>r.skill!==name));setNotice("Rating removed.");router.refresh()}
  setBusy(false);
 }
 return <section className="panel space-y-4">
  <div><h2 className="text-lg font-semibold">Official proficiency ratings</h2>
   <p className="muted text-sm mt-1">Your 1–5 assessment. Technicians see these ratings on their own profile but cannot edit them.</p>
  </div>
  {ratings.length?<div className="divide-y divide-slate-700">
   {ratings.map(r=><div key={r.skill} className="py-4 space-y-2">
    <div className="flex justify-between items-center gap-3">
     <span className="font-medium break-words">{r.skill}</span>
     <span className="text-blue-300 whitespace-nowrap text-sm">{r.level}/5 · {labels[r.level]}</span>
    </div>
    <label className="sr-only" htmlFor={"rating-"+r.skill}>Rate {r.skill}</label>
    <input id={"rating-"+r.skill} type="range" min={1} max={5} step={1} disabled={busy}
     value={r.level} onChange={e=>setRatings(old=>old.map(item=>item.skill===r.skill?{...item,level:Number(e.target.value)}:item))}
     onPointerUp={e=>{const value=Number(e.currentTarget.value);void save(r.skill,value)}}
     onKeyUp={e=>{if(["ArrowLeft","ArrowRight","Home","End"].includes(e.key))void save(r.skill,Number(e.currentTarget.value))}}
     className="w-full !p-0 accent-blue-500 cursor-pointer" />
    <div className="flex items-center justify-between">
     <span className="muted text-xs">1 · Beginner</span>
     <button type="button" className="text-xs text-blue-300 underline" disabled={busy} onClick={()=>save(r.skill,r.level)}>Save</button>
     <button type="button" className="text-xs text-red-300 underline" disabled={busy} onClick={()=>remove(r.skill)}>Remove</button>
     <span className="muted text-xs">5 · Expert</span>
    </div>
   </div>)}
  </div>:<p className="muted text-sm">No ratings yet. Add the first skill below.</p>}
  <div className="border-t border-slate-700 pt-4 space-y-3">
   <h3 className="font-semibold">Rate another position or skill</h3>
   <label className="block"><span className="label">Position or equipment</span>
    <select value={skill} onChange={e=>{setSkill(e.target.value);setCustomSkill("");setError("")}}>
     <option value="">Select a skill to rate…</option>
     {options.map(item=><option value={item} key={item}>{item}</option>)}
     <option value="__other__">Other skill (not listed)</option>
    </select>
   </label>
   {skill==="__other__"&&<label className="block"><span className="label">Other skill name</span>
    <input value={customSkill} onChange={e=>setCustomSkill(e.target.value)}
     placeholder="Enter a skill or position" maxLength={120} autoFocus/>
   </label>}
   <div className="flex items-center justify-between gap-3"><span className="text-sm">Proficiency</span>
    <span className="text-blue-300 text-sm">{level}/5 · {labels[level]}</span></div>
   <input aria-label="New proficiency level" type="range" min={1} max={5} step={1} value={level} onChange={e=>setLevel(Number(e.target.value))} className="w-full !p-0 accent-blue-500"/>
   <button type="button" className="primary w-full" disabled={busy||!skill||(skill==="__other__"&&!customSkill.trim())} onClick={()=>{
    const name=(skill==="__other__"?customSkill:skill).trim();if(ratings.some(r=>r.skill.toLowerCase()===name.toLowerCase())){setError("That skill already has a rating. Edit it above.");return}
    void save(name,level);
   }}>{busy?"Saving…":"Save proficiency rating"}</button>
  </div>
  {notice&&<p role="status" className="text-green-300 text-sm">{notice}</p>}
  {error&&<p role="alert" className="text-red-300 text-sm">{error}</p>}
 </section>;
}
