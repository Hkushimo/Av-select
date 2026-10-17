import {NextRequest,NextResponse} from "next/server";
import {currentRole} from "@/lib/server";
import {adminDb} from "@/lib/admin-supabase";

export const dynamic="force-dynamic";
const noStore={"Cache-Control":"no-store"};

async function authorize(){
 const {user,role}=await currentRole();
 if(!user)return {error:NextResponse.json({error:"Sign in first."},{status:401,headers:noStore})};
 if(role!=="admin")return {error:NextResponse.json({error:"Admin access required."},{status:403,headers:noStore})};
 return {error:null};
}

export async function GET(){
 try{
  const {error:accessError}=await authorize();
  if(accessError)return accessError;
  const {data,error}=await adminDb().from("technician_invites")
   .select("token_hash,created_at,expires_at")
   .is("claimed_at",null)
   .gt("expires_at",new Date().toISOString())
   .order("created_at",{ascending:false});
  if(error)throw error;
  return NextResponse.json({invites:data||[]},{headers:noStore});
 }catch(error){
  console.error("List active technician invites:",error);
  return NextResponse.json({error:"Unable to load active invitations."},{status:500,headers:noStore});
 }
}

export async function DELETE(request:NextRequest){
 try{
  const {error:accessError}=await authorize();
  if(accessError)return accessError;
  const body=await request.json() as {tokenHash?:unknown};
  if(typeof body.tokenHash!=="string"||!/^[a-f0-9]{64}$/.test(body.tokenHash))
   return NextResponse.json({error:"Invalid invitation."},{status:400,headers:noStore});
  // Delete only unused tokens. Validation and redemption will reject them immediately.
  const {data,error}=await adminDb().from("technician_invites")
   .delete().eq("token_hash",body.tokenHash).is("claimed_at",null)
   .select("token_hash").maybeSingle();
  if(error)throw error;
  if(!data)return NextResponse.json({error:"This invite is no longer active. Refresh the list."},{status:409,headers:noStore});
  return NextResponse.json({success:true},{headers:noStore});
 }catch(error){
  console.error("Revoke technician invite:",error);
  return NextResponse.json({error:"Unable to revoke invitation."},{status:500,headers:noStore});
 }
}
