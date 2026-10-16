import {NextRequest,NextResponse} from "next/server";
import {currentRole} from "@/lib/server";
import {adminDb} from "@/lib/admin-supabase";

export const dynamic="force-dynamic";
type Props={params:Promise<{id:string}>};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(_request:NextRequest,{params}:Props){
 try{
  const {user,role}=await currentRole();
  if(!user)return NextResponse.json({error:"Sign in first."},{status:401});
  if(role!=="admin")return NextResponse.json({error:"Admin access required."},{status:403});
  const {id}=await params;
  if(!uuid.test(id)||id===user.id)return NextResponse.json({error:"Invalid technician."},{status:400});
  const db=adminDb();
  const {data:profile,error:profileError}=await db.from("profiles").select("id,role").eq("id",id).maybeSingle();
  if(profileError)throw profileError;
  if(!profile||profile.role!=="technician")return NextResponse.json({error:"Technician not found."},{status:404});

  // Supabase Storage can block auth-user removal if object ownership remains.
  // Remove all technician avatars, not merely the one currently on their profile.
  let offset=0;
  while(true){
   const {data:files,error:listError}=await db.storage.from("technician-avatars").list(id,{limit:100,offset});
   if(listError)throw listError;
   const paths=(files||[]).filter(f=>f.id).map(f=>id+"/"+f.name);
   if(paths.length){
    const {error:removeError}=await db.storage.from("technician-avatars").remove(paths);
    if(removeError)throw removeError;
   }
   if((files||[]).length<100)break;
   if(!paths.length)offset+=100;
  }

  // Hard-delete the Auth user (not a soft ban); database cascades clear
  // technician profile, job offers, ratings and read cursors.
  // This also permits future sign-up with the same email via a fresh invite.
  const {error:deleteError}=await db.auth.admin.deleteUser(id,false);
  if(deleteError)throw deleteError;
  return NextResponse.json({success:true},{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  console.error("Delete technician:",error);
  return NextResponse.json({error:"Could not permanently delete technician. Ensure migration 006 is applied and check server logs."},{status:500});
 }
}
