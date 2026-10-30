export type InvoiceRow={
 job_time_zone?:string|null;
 id:string;invoice_number:number;offer_id:string|null;
 from_name:string;from_email:string;from_phone:string;from_location:string;
 bill_to:string;bill_to_address:string;
 job_title:string;job_venue:string;job_address:string;
 job_starts_at:string;job_ends_at:string|null;job_position:string;original_rate:string;
 hours:number;hourly_rate:number;total:number;
 billing_basis?:"hourly"|"day"|"legacy";overtime_policy?:"legacy"|"after_10_1_5";work_days?:InvoiceWorkDay[];agreed_rate?:number|null;billed_total?:number|null;return_call_flat_amount?:number|null;
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
export type InvoiceShift={
 time_in:string;time_out:string;hours:number;pay_type?:"standard"|"return_flat";
};
export type InvoiceWorkDay={
 date:string;hours:number;lunch_taken?:boolean;
 time_in?:string;time_out?:string;shifts?:InvoiceShift[];
};
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

/** Formats plain and labeled offer rates for technician-facing screens only. */
export function displayOfferRate(raw:string,basis:RateBasis):string{
 const rate=agreedRateFromLabel(raw,basis);
 if(rate===null)return raw;
 const amount=rate.toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:2});
 return "$"+amount+(basis==="day"?"/day":"/hr");
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
export type DayCharge={
 date:string;hours:number;timeIn?:string;timeOut?:string;
 shifts?:InvoiceShift[];
 lunchTaken:boolean;lunchDeducted:number;billableHours:number;
 regularHours:number;regular:number;otHours:number;overtime:number;total:number;
 flatReturnAmount:number;flatReturnHours:number;standardHours:number;
};

/**
 * For a split shift the day rate is charged once. Standard periods share the
 * day's 10-hour threshold; an admin-approved flat return call replaces, rather
 * than stacks with, ordinary overtime for that one period.
 * Old invoices without shifts retain their historical calculation behavior.
 */
export function calculateInvoiceDays(basis:RateBasis,rate:number,days:InvoiceWorkDay[],hourlyOvertime=true,returnCallAmount:number|null=null){
 const cents=Math.round(rate*100);
 const flatCents=returnCallAmount===null?0:Math.round(returnCallAmount*100);
 const charges:DayCharge[]=days.filter(day=>day.hours>0).map(day=>{
  const shifts=day.shifts&&day.shifts.length?day.shifts:undefined;
  const flatShifts=shifts?.filter(shift=>shift.pay_type==="return_flat")||[];
  const flatReturnHours=flatShifts.reduce((sum,shift)=>sum+shift.hours,0);
  const standardHours=shifts?
   shifts.filter(shift=>shift.pay_type!=="return_flat").reduce((sum,shift)=>sum+shift.hours,0):
   day.hours;
  const lunchTaken=day.lunch_taken===true&&day.hours>DAY_INCLUDED_HOURS;
  const lunchDeducted=lunchTaken?1:0;
  const standardBillable=Math.max(0,standardHours-lunchDeducted);
  const billableHours=Math.max(0,day.hours-lunchDeducted);
  const otHours=(basis==="day"||hourlyOvertime)?Math.max(0,standardBillable-DAY_INCLUDED_HOURS):0;
  const regularHours=basis==="hourly"?(hourlyOvertime?Math.min(standardBillable,DAY_INCLUDED_HOURS):standardBillable):Math.min(standardBillable,DAY_INCLUDED_HOURS);
  const regular=basis==="day"?cents:Math.round(regularHours*cents);
  const overtime=basis==="day"?Math.round(otHours*cents*DAY_OT_MULTIPLIER/DAY_INCLUDED_HOURS):Math.round(otHours*cents*DAY_OT_MULTIPLIER);
  const flatReturnAmount=flatShifts.length?flatCents/100:0;
  return {date:day.date,hours:day.hours,timeIn:day.time_in,timeOut:day.time_out,shifts,
   lunchTaken,lunchDeducted,billableHours,regularHours,regular:regular/100,otHours,overtime:overtime/100,
   flatReturnAmount,flatReturnHours,standardHours,total:(regular+overtime)/100+flatReturnAmount};
 });
 return {charges,total:charges.reduce((sum,day)=>sum+Math.round(day.total*100),0)/100,
  hours:charges.reduce((sum,day)=>sum+day.billableHours,0),
  actualHours:charges.reduce((sum,day)=>sum+day.hours,0),
  lunchHours:charges.reduce((sum,day)=>sum+day.lunchDeducted,0)};
}

/** Check all entered shift intervals, including overlaps across midnight. */
export function validateWorkPeriods(days:InvoiceWorkDay[],returnCallAmount:number|null):string|null{
 const intervals:{start:number;end:number}[]=[];
 let flatCount=0;
 for(const day of days){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day.date))return "Invalid work date.";
  const date=Date.parse(day.date+"T00:00:00Z");
  if(!Number.isFinite(date)||new Date(date).toISOString().slice(0,10)!==day.date)return "Invalid work date.";
  const shifts=day.shifts?.length?day.shifts:
   (day.time_in&&day.time_out?[{time_in:day.time_in,time_out:day.time_out,hours:day.hours}]:[]);
  if(!shifts.length||shifts.length>8)return "Each worked day needs 1 to 8 work periods.";
  let sumHours=0;
  for(const [index,shift] of shifts.entries()){
   const hours=shiftHours(shift.time_in,shift.time_out);
   if(hours===null||Math.abs(hours-shift.hours)>0.001)return "Check each clock-in and clock-out.";
   const [h,m]=shift.time_in.split(":").map(Number);
   const start=date+(h*60+m)*60000;
   intervals.push({start,end:start+Math.round(hours*60)*60000});
   sumHours+=hours;
   if(shift.pay_type==="return_flat"){
    flatCount++;
    if(index===0)return "A flat return call must be a second or later work period.";
    if(returnCallAmount===null)return "Ask the admin to approve the flat return-call amount.";
   }else if(shift.pay_type&&shift.pay_type!=="standard")return "Invalid work period pay type.";
  }
  if(Math.abs(Number(sumHours.toFixed(2))-day.hours)>0.001)return "Work hours do not match the periods.";
  if(day.lunch_taken&&day.hours>10&&sumHours-(shifts.filter(x=>x.pay_type==="return_flat").reduce((sum,x)=>sum+x.hours,0))<1)
   return "Lunch needs at least one regular worked hour.";
 }
 if(flatCount>1)return "Only one flat return call can be billed per invoice.";
 intervals.sort((a,b)=>a.start-b.start);
 if(intervals.some((range,i)=>i>0&&range.start<intervals[i-1].end))return "Work periods cannot overlap.";
 return null;
}

/** Work dates use local wall-clock times. When out is before in, it ends the following day. */
export function shiftHours(timeIn:string,timeOut:string):number|null{
 const pattern=/^([01][0-9]|2[0-3]):([0-5][0-9])$/;
 const start=timeIn.match(pattern),end=timeOut.match(pattern);
 if(!start||!end)return null;
 const inMinutes=Number(start[1])*60+Number(start[2]);
 const outMinutes=Number(end[1])*60+Number(end[2]);
 const minutes=(outMinutes-inMinutes+1440)%1440;
 // Equal in/out requires clarification rather than silently assuming a 24h shift.
 if(minutes===0)return null;
 return Math.round(minutes/60*100)/100;
}
