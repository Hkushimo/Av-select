"use client";
import PageHeading from "@/app/page-heading";
import Breadcrumbs from "@/app/admin/breadcrumbs";
import {ChangeEvent,useEffect,useState} from "react";
import ProfileSelections from "./profile-selections";
import {browserDb} from "@/lib/supabase";
import {formatPhone} from "@/lib/phone";
import {US_STATES,stateFromLegacy} from "@/lib/us-location";
type Rating={skill:string;level:number};
type Profile={full_name:string;phone:string;city:string;state:string;travel:string;other_skills:string;roles:string[];equipment:string[];avatar_path:string|null};
export default function TechnicianProfile(){
 const [id,setId]=useState(""),[profile,setProfile]=useState<Profile|null>(null),[image,setImage]=useState("");
 const [error,setError]=useState(""),[status,setStatus]=useState(""),[busy,setBusy]=useState(false);
 const [ratings,setRatings]=useState<Rating[]>([]),[ratingsError,setRatingsError]=useState("");
 useEffect(()=>{let active=true;async function load(){
  const db=browserDb();const {data:{user}}=await db.auth.getUser();
  if(!active)return;if(!user){location.replace("/login");return}
  const {data:access}=await db.from("profiles").select("role").eq("id",user.id).maybeSingle();
  if(!active)return;if(access?.role!=="technician"){location.replace("/");return}
  setId(user.id);
  const {data,error}=await db.from("technicians").select("full_name,phone,city,state,travel,other_skills,roles,equipment,avatar_path").eq("user_id",user.id).maybeSingle();
  if(!active)return;if(error){setError(error.message);return}
  if(!data){location.replace("/onboarding");return}const homeLocation=data.state?{city:data.city||"",state:data.state}:stateFromLegacy(data.city||"");setProfile({...data,city:homeLocation.city,state:homeLocation.state,phone:formatPhone(data.phone||"")});
  const {data:myRatings,error:myRatingsError}=await db.from("skill_ratings").select("skill,level").eq("technician_id",user.id).order("skill");
  if(active){if(myRatingsError)setRatingsError("Could not load official proficiency ratings.");else setRatings(myRatings||[])}
  if(data.avatar_path){const {data:signed}=await db.storage.from("technician-avatars").createSignedUrl(data.avatar_path,600);
   if(active)setImage(signed?.signedUrl||"")}
 }void load();return()=>{active=false}},[]);
 function field(name:keyof Profile,value:string){setProfile(p=>p?{...p,[name]:value}:p)}
 async function save(){
  if(!profile||!id)return;setBusy(true);setError("");setStatus("");
  try{
   if(!profile.full_name.trim()||!profile.city.trim()||!profile.state)throw new Error("Name, city and state are required.");
   const {error}=await browserDb().from("technicians").update({full_name:profile.full_name.trim(),phone:profile.phone.trim(),city:profile.city.trim(),state:profile.state,travel:profile.travel,other_skills:profile.other_skills.trim()}).eq("user_id",id);
   if(error)throw error;setStatus("Profile saved.");
  }catch(e){setError(e instanceof Error?e.message:"Could not save profile.")}
  finally{setBusy(false)}
 }
 async function upload(e:ChangeEvent<HTMLInputElement>){
  const file=e.target.files?.[0];e.target.value="";if(!file||!id||!profile)return;
  setError("");setStatus("");
  if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>5242880){setError("Use JPG, PNG or WebP under 5 MB.");return}
  setBusy(true);
  try{
   const db=browserDb();const ext=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";
   const path=id+"/"+crypto.randomUUID()+"."+ext;
   const {error:uploaded}=await db.storage.from("technician-avatars").upload(path,file,{contentType:file.type});
   if(uploaded)throw uploaded;
   const {error:updated}=await db.from("technicians").update({avatar_path:path}).eq("user_id",id);
   if(updated){await db.storage.from("technician-avatars").remove([path]);throw updated}
   if(profile.avatar_path)await db.storage.from("technician-avatars").remove([profile.avatar_path]);
   const {data:signed}=await db.storage.from("technician-avatars").createSignedUrl(path,600);
   setProfile({...profile,avatar_path:path});setImage(signed?.signedUrl||"");setStatus("Photo updated.");
  }catch(err){setError(err instanceof Error?err.message:"Photo upload failed.")}
  finally{setBusy(false)}
 }
 async function removePhoto(){
  if(!profile?.avatar_path||!id)return;setBusy(true);setError("");
  try{
   const db=browserDb(),old=profile.avatar_path;
   const {error}=await db.from("technicians").update({avatar_path:null}).eq("user_id",id);
   if(error)throw error;
   await db.storage.from("technician-avatars").remove([old]);
   setProfile({...profile,avatar_path:null});setImage("");setStatus("Photo removed.");
  }catch(e){setError(e instanceof Error?e.message:"Could not remove photo.")}
  finally{setBusy(false)}
 }
 return <main className="mx-auto max-w-2xl px-4 py-6 space-y-5">
  <Breadcrumbs items={[{label:"Dashboard",href:"/dashboard"},{label:"My Profile"}]}/>
  <PageHeading eyebrow="Technician account" title="My profile"/>
  {!profile?<div className="panel muted">{error||"Loading profile…"}</div>:<>
   <section className="panel space-y-4"><h2 className="text-lg font-semibold">Profile photo <span className="muted text-sm font-normal">(optional)</span></h2>
    {image?<img alt="Your profile" src={image} className="h-28 w-28 rounded-full object-cover border border-slate-700"/>:
    <div className="h-28 w-28 rounded-full bg-slate-800 grid place-content-center text-4xl" aria-label="No profile photo">👤</div>}
    <label className="block"><span className="label">Add or change photo · JPG, PNG, WebP · Max 5 MB</span><input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={upload}/></label>
    {profile.avatar_path&&<button type="button" className="pill" disabled={busy} onClick={removePhoto}>Remove photo</button>}
    <p className="muted text-xs">Photos are private to you and AV Select administrators.</p>
   </section>
   <section className="panel space-y-4"><h2 className="text-lg font-semibold">Contact and availability</h2>
    <label className="block"><span className="label">Full name</span><input value={profile.full_name} onChange={e=>field("full_name",e.target.value)}/></label>
    <label className="block"><span className="label">Phone</span><input type="tel" inputMode="tel" autoComplete="tel-national" placeholder="(555) 123-4567" value={profile.phone} onChange={e=>field("phone",formatPhone(e.target.value))}/></label>
    <label className="block"><span className="label">Home city</span><input placeholder="e.g. Providence" value={profile.city} onChange={e=>field("city",e.target.value)}/></label><label className="block"><span className="label">State</span><select value={profile.state||""} onChange={e=>field("state",e.target.value)}><option value="">Select state</option>{US_STATES.map(([code,name])=><option key={code} value={code}>{name} ({code})</option>)}</select></label>
    <label className="block"><span className="label">Travel preference</span><select value={profile.travel} onChange={e=>field("travel",e.target.value)}><option value="local">Local</option><option value="regional">Regional</option><option value="national">Nationwide</option><option value="international">International</option></select></label>
    <label className="block"><span className="label">Other skills or equipment</span><textarea rows={3} value={profile.other_skills} onChange={e=>field("other_skills",e.target.value)}/></label>
    <button type="button" className="primary w-full" disabled={busy} onClick={save}>{busy?"Saving…":"Save profile"}</button>
   </section>
   <section className="panel !p-4 sm:!p-5 space-y-3">
    <h2 className="text-lg font-semibold">Official proficiency ratings</h2>
    <p className="muted text-xs sm:text-sm">Rated by AV Select admins · Read-only</p>
    {ratingsError?<p role="alert" className="text-red-300 text-sm">{ratingsError}</p>:
     ratings.length?ratings.map(r=><div key={r.skill} className="space-y-2 border-t border-slate-700 py-3">
      <div className="flex items-center justify-between gap-3">
       <span className="font-medium text-sm break-words">{r.skill}</span>
       <span className="rounded-full bg-blue-500/15 text-blue-300 px-2.5 py-1 text-xs font-semibold shrink-0">{r.level}/5</span>
      </div>
      <div role="img" aria-label={r.skill+": "+r.level+" of 5"} className="h-2 w-full rounded-full bg-slate-700 overflow-hidden">
       <div className="h-full rounded-full bg-blue-500" style={{width:(r.level/5*100)+"%"}}/>
      </div>
     </div>):<p className="muted text-sm border-t border-slate-700 pt-3">No official ratings assigned yet.</p>}
   </section>
   <ProfileSelections roles={profile.roles||[]} equipment={profile.equipment||[]}/>
  </>}
  {status&&<p role="status" className="text-green-300 text-sm">{status}</p>}
  {profile&&error&&<p role="alert" className="text-red-400 text-sm">{error}</p>}
 </main>;
}
