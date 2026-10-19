export type InvoiceRow={
 id:string;invoice_number:number;offer_id:string|null;
 from_name:string;from_email:string;from_phone:string;from_location:string;
 bill_to:string;bill_to_address:string;
 job_title:string;job_venue:string;job_address:string;
 job_starts_at:string;job_ends_at:string|null;job_position:string;original_rate:string;
 hours:number;hourly_rate:number;total:number;
 issued_on:string;due_on:string;notes:string;created_at:string;
};
export function finishedAt(job:{starts_at:string;ends_at:string|null}){
 const start=new Date(job.starts_at).getTime();
 if(!Number.isFinite(start))return Number.POSITIVE_INFINITY;
 const end=job.ends_at?new Date(job.ends_at).getTime():start+24*60*60*1000;
 return Number.isFinite(end)?end:Number.POSITIVE_INFINITY;
}
export function hourlyRateFromLabel(label:string):number|null{
 const rate=label.trim();
 if(!/(?:\/\s*(?:hr|hrs|hour|hours)\b|\bper\s*hour\b|\bhourly\b)/i.test(rate))return null;
 const match=rate.match(/\$?\s*(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?/);
 if(!match)return null;
 const value=Number(match[1].replace(/,/g,"")+(match[2]?"."+match[2]:""));
 return value>0&&Number.isFinite(value)?value:null;
}
export function invoiceLabel(value:number){return "AVS-"+String(value).padStart(6,"0")}
export function currency(value:number){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(value)}
export function dateOnly(value:string){
 return new Date(value+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
}
