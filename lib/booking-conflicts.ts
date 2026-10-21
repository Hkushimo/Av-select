/** App-side preview only. Supabase migration 016 enforces this server-side. */
export type BookingWindow={starts_at:string;ends_at:string|null};
const ONE_DAY_MS=24*60*60*1000;
function boundaries(job:BookingWindow|null):[number,number]|null{
 if(!job?.starts_at)return null;
 const start=Date.parse(job.starts_at);
 const end=job.ends_at?Date.parse(job.ends_at):start+ONE_DAY_MS;
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return null;
 return [start,end];
}
export function bookingWindowsOverlap(a:BookingWindow|null,b:BookingWindow|null):boolean{
 const x=boundaries(a),y=boundaries(b);
 return !!x&&!!y&&x[0]<y[1]&&y[0]<x[1];
}
