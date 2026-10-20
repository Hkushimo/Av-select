import {browserDb} from "./supabase";

// Signed URLs are bearer links: cache only in memory, never localStorage.
// Keeping the *same* signed URL allows the browser's image cache to be reused
// across the roster, staffing screens, and profile views.
const SIGNED_URL_SECONDS=3600;
const REUSE_MS=55*60*1000;
const MAX_ENTRIES=300;
type CachedUrl={promise:Promise<string>;expiresAt:number};
const signedUrls=new Map<string,CachedUrl>();

export function avatarSignedUrl(path:string):Promise<string>{
 const existing=signedUrls.get(path);
 if(existing&&existing.expiresAt>Date.now())return existing.promise;
 const entry:CachedUrl={promise:Promise.resolve(""),expiresAt:Date.now()+REUSE_MS};
 const promise=browserDb().storage.from("technician-avatars")
  .createSignedUrl(path,SIGNED_URL_SECONDS)
  .then(({data,error})=>{
   if(error||!data?.signedUrl)throw error||new Error("Unable to load profile photo.");
   entry.expiresAt=Date.now()+REUSE_MS;
   return data.signedUrl;
  }).catch((error:unknown)=>{
   if(signedUrls.get(path)===entry)signedUrls.delete(path);
   throw error;
  });
 entry.promise=promise;
 signedUrls.set(path,entry);
 if(signedUrls.size>MAX_ENTRIES)signedUrls.delete(signedUrls.keys().next().value!);
 return promise;
}

export function invalidateAvatarUrl(path:string|null|undefined){
 if(path)signedUrls.delete(path);
}
