import {NextRequest,NextResponse} from "next/server";
import {currentRole} from "@/lib/server";
import {adminDb} from "@/lib/admin-supabase";
import {changeTechnicianPassword,PasswordChangeError} from "@/lib/admin-password";

export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store"};
const reply=(error:string,status:number)=>NextResponse.json({error},{status,headers});
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 if(request.headers.get("origin")!==request.nextUrl.origin)return reply("Invalid request origin.",403);
 if(!request.headers.get("content-type")?.startsWith("application/json"))return reply("Expected JSON.",415);
 try{
  const {user,role}=await currentRole();
  const {id}=await params;
  const body=await request.json().catch(()=>null);
  await changeTechnicianPassword(user?{id:user.id,role}:null,id,body?.password,{
   async technicianRole(target){
    const {data,error}=await adminDb().from("profiles").select("role").eq("id",target).maybeSingle();
    if(error)throw new Error("Account lookup failed");
    return data?.role??null;
   },
   async updatePassword(target,password){
    const {error}=await adminDb().auth.admin.updateUserById(target,{password});
    if(error){
     if(error.status===429)throw new PasswordChangeError("Too many requests. Wait before trying again.",429);
     if(error.status&&error.status>=400&&error.status<500)throw new PasswordChangeError("Password was not accepted. Use a different, stronger password.",400);
     throw new Error("Password update failed");
    }
   }
  });
  return NextResponse.json({success:true},{headers});
 }catch(error){
  // Never log request bodies or Auth errors that could contain credentials.
  if(error instanceof PasswordChangeError)return reply(error.message,error.status);
  return reply("Could not update password. Check server configuration or try again later.",500);
 }
}
