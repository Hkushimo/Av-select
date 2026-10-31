export type PasswordActor={id:string;role:string|null}|null;
type PasswordBackend={technicianRole:(id:string)=>Promise<string|null>;updatePassword:(id:string,password:string)=>Promise<void>};
export class PasswordChangeError extends Error {
 status:number;
 constructor(message:string,status:number){super(message);this.status=status}
}
export async function changeTechnicianPassword(actor:PasswordActor,id:string,password:unknown,backend:PasswordBackend){
 if(!actor)throw new PasswordChangeError("Sign in first.",401);
 if(actor.role!=="admin")throw new PasswordChangeError("Admin access required.",403);
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)||id===actor.id)throw new PasswordChangeError("Invalid technician.",400);
 if(typeof password!=="string"||password.length<12||password.length>128)throw new PasswordChangeError("Use a password between 12 and 128 characters.",400);
 if(await backend.technicianRole(id)!=="technician")throw new PasswordChangeError("Technician not found.",404);
 await backend.updatePassword(id,password);
}
