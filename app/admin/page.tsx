import PageHeading from "@/app/page-heading";
import InviteForm from "./invite-form";
import RosterFilters from "./roster-filters";
import { currentRole } from "@/lib/server";
import { redirect } from "next/navigation";

export default async function Admin(){
 const {db,user,role}=await currentRole();
 if(!user)redirect("/login");
 if(role!=="admin")redirect("/");
 const [{data:techs,error:techError},{data:ratings,error:ratingsError},{count:jobCount}]=await Promise.all([
  db.from("technicians").select("user_id,full_name,city,travel,roles,equipment,avatar_path").order("full_name"),
  db.from("skill_ratings").select("technician_id,skill,level"),
  db.from("jobs").select("id",{count:"exact",head:true}),
 ]);
 return <main className="mx-auto max-w-5xl px-4 py-5 sm:px-6 space-y-5">
  <PageHeading eyebrow="Admin" title="Your crew"/>
  <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm muted border-b border-slate-800 pb-4">
   <span><strong className="text-white">{techs?.length??0}</strong> technicians</span>
   <span><strong className="text-white">{ratings?.length??0}</strong> ratings</span>
   <span><strong className="text-white">{jobCount??0}</strong> jobs</span>
  </div>
  <InviteForm/>
  {techError||ratingsError?<p role="alert" className="text-red-300 text-sm">Unable to load all roster information. {techError?.message||ratingsError?.message}</p>:
   <RosterFilters technicians={techs||[]} ratings={ratings||[]}/>}
 </main>;
}
