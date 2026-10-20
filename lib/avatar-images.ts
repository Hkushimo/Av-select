/**
 * Resize a technician photo locally before upload.
 * Works with the browser's native image decoder on iOS Safari and Android Chrome.
 * The avatar is intentionally square because all AV Select avatars render circular.
 */
const AVATAR_SIZE=256;

export async function optimizeAvatarImage(source:Blob):Promise<Blob>{
 const objectUrl=URL.createObjectURL(source);
 const image=new Image();
 image.decoding="async";
 try{
  await new Promise<void>((resolve,reject)=>{
   image.onload=()=>resolve();
   image.onerror=()=>reject(new Error("This image couldn't be opened. Choose a JPG, PNG or WebP photo."));
   image.src=objectUrl;
  });
  const width=image.naturalWidth,height=image.naturalHeight;
  if(!width||!height)throw new Error("The selected photo is invalid.");
  const canvas=document.createElement("canvas");
  canvas.width=AVATAR_SIZE;
  canvas.height=AVATAR_SIZE;
  const ctx=canvas.getContext("2d");
  if(!ctx)throw new Error("Photo processing isn't available on this device.");
  // Fill transparent backgrounds so the JPEG fallback is not black.
  ctx.fillStyle="#121a29";
  ctx.fillRect(0,0,AVATAR_SIZE,AVATAR_SIZE);
  const crop=Math.min(width,height);
  ctx.drawImage(image,(width-crop)/2,(height-crop)/2,crop,crop,0,0,AVATAR_SIZE,AVATAR_SIZE);
  const encode=(type:string,quality:number)=>new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,type,quality));
  // Safari and Chromium both support WebP on current versions. Some older
  // browsers silently return PNG instead, so use a JPEG fallback in that case.
  const webp=await encode("image/webp",0.8);
  if(webp?.type==="image/webp"&&webp.size>0)return webp;
  const jpeg=await encode("image/jpeg",0.82);
  if(jpeg?.type==="image/jpeg"&&jpeg.size>0)return jpeg;
  throw new Error("Unable to compress this photo. Please try another image.");
 }finally{
  image.onload=null;
  image.onerror=null;
  image.src="";
  URL.revokeObjectURL(objectUrl);
 }
}

export function optimizedAvatarPath(path:string|null|undefined):boolean{
 return !!path&&/\/avatar-[a-f0-9-]+\.(?:webp|jpg)$/i.test(path);
}

export function avatarExtension(image:Blob):string{
 return image.type==="image/webp"?"webp":"jpg";
}
