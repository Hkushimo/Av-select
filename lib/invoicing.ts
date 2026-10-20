export type InvoiceRow={
 id:string;invoice_number:number;offer_id:string|null;
 from_name:string;from_email:string;from_phone:string;from_location:string;
 bill_to:string;bill_to_address:string;
 job_title:string;job_venue:string;job_address:string;
 job_starts_at:string;job_ends_at:string|null;job_position:string;original_rate:string;
 hours:number;hourly_rate:number;total:number;
 billing_basis?:"hourly"|"day"|"legacy";work_days?:InvoiceWorkDay[];agreed_rate?:number|null;billed_total?:number|null;
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

export type RateBasis="hourly"|"day";
export type InvoiceWorkDay={date:string;hours:number;lunch_taken?:boolean;time_in?:string;time_out?:string};
export const DAY_INCLUDED_HOURS=10;
export const DAY_OT_MULTIPLIER=1.5;

// A job chooses the billing basis. An individual offer fixes the agreed rate.
// Only a single unambiguous money amount is eligible for auto-invoicing.
export function agreedRateFromLabel(label:string,basis:RateBasis):number|null{
 const value=label.trim();
 const match=value.match(/^\$?\s*(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?\s*(?:\/\s*(?:hr|hrs|hour|hours|day|days)|per\s+(?:hour|day)|hourly|daily)?$/i);
 if(!match)return null;
 if(basis==="hourly"&&/(?:\/\s*days?|per\s+day|daily)$/i.test(value))return null;
 if(basis==="day"&&/(?:\/\s*(?:hr|hrs|hour|hours)|per\s+hour|hourly)$/i.test(value))return null;
 const amount=Number(match[1].replace(/,/g,"")+(match[2]?"."+match[2]:""));
 return Number.isFinite(amount)&&amount>0&&amount<=100000?amount:null;
}

export function workDatesForJob(startsAt:string,endsAt:string|null){
 const start=new Date(startsAt),end=new Date(endsAt||startsAt);
 if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime()))return [] as string[];
 const date=new Date(start.getFullYear(),start.getMonth(),start.getDate());
 const last=new Date(end.getFullYear(),end.getMonth(),end.getDate());
 const days:string[]=[];
 for(let i=0;i<366&&date<=last;i++){
  days.push([date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-"));
  date.setDate(date.getDate()+1);
 }
 return days;
}
export type DayCharge={date:string;hours:number;timeIn?:string;timeOut?:string;lunchTaken:boolean;lunchDeducted:number;billableHours:number;regular:number;otHours:number;overtime:number;total:number};
export function calculateInvoiceDays(basis:RateBasis,rate:number,days:InvoiceWorkDay[]){
 const cents=Math.round(rate*100);
 const charges:DayCharge[]=days.filter(day=>day.hours>0).map(day=>{
  // Lunch applies only to days exceeding 10 actual hours, regardless of pay basis.
  const lunchTaken=day.lunch_taken===true&&day.hours>DAY_INCLUDED_HOURS;
  const lunchDeducted=lunchTaken?1:0;
  const billableHours=Math.max(0,day.hours-lunchDeducted);
  const otHours=basis==="day"?Math.max(0,billableHours-DAY_INCLUDED_HOURS):0;
  const regular=basis==="day"?cents:Math.round(billableHours*cents);
  const overtime=basis==="day"?Math.round(otHours*cents*DAY_OT_MULTIPLIER/DAY_INCLUDED_HOURS):0;
  return {date:day.date,hours:day.hours,timeIn:day.time_in,timeOut:day.time_out,lunchTaken,lunchDeducted,billableHours,regular:regular/100,otHours,overtime:overtime/100,total:(regular+overtime)/100};
 });
 return {charges,total:charges.reduce((sum,day)=>sum+Math.round(day.total*100),0)/100,
  hours:charges.reduce((sum,day)=>sum+day.billableHours,0),
  actualHours:charges.reduce((sum,day)=>sum+day.hours,0),
  lunchHours:charges.reduce((sum,day)=>sum+day.lunchDeducted,0)};
}

/** Work dates use local wall-clock times. When out is before in, it ends the following day. */
export function shiftHours(timeIn:string,timeOut:string):number|null{
 const pattern=/^([01]\\d|2[0-3]):([0-5]\\d)$/;
 const start=timeIn.match(pattern),end=timeOut.match(pattern);
 if(!start||!end)return null;
 const inMinutes=Number(start[1])*60+Number(start[2]);
 const outMinutes=Number(end[1])*60+Number(end[2]);
 const minutes=(outMinutes-inMinutes+1440)%1440;
 // Equal in/out requires clarification rather than silently assuming a 24h shift.
 if(minutes===0)return null;
 return Math.round(minutes/60*100)/100;
}
