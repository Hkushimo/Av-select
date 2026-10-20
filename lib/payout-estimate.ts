import {agreedRateFromLabel,calculateInvoiceDays,currency,type RateBasis} from "./invoicing";

type ScheduledJob={
 starts_at:string;
 ends_at:string|null;
 rate_basis:RateBasis;
};
export type PayoutEstimate={
 amount:number;
 scheduledHours:number;
 overtimeHours:number;
 label:string;
};

/**
 * Preview only, not an invoice. Uses the technician's individual offer rate.
 * Assumes the job's start/end describe one shift (including overnight shifts).
 * Longer multi-day event windows cannot yield a reliable payout without daily calls.
 * No lunch deduction is assumed before actual worked hours are known.
 */
export function estimateOfferPayout(job:ScheduledJob|null,offeredRate:string):PayoutEstimate|null{
 if(!job?.ends_at||!offeredRate.trim())return null;
 const basis:RateBasis=job.rate_basis==="day"?"day":"hourly";
 const rate=agreedRateFromLabel(offeredRate,basis);
 if(rate===null)return null;
 const start=new Date(job.starts_at).getTime();
 const end=new Date(job.ends_at).getTime();
 const hours=(end-start)/3600000;
 if(!Number.isFinite(hours)||hours<=0||hours>18)return null;
 const scheduledHours=Math.round(hours*100)/100;
 const calculation=calculateInvoiceDays(basis,rate,[{date:"scheduled",hours:scheduledHours}],true);
 return {
  amount:calculation.total,
  scheduledHours,
  overtimeHours:calculation.charges[0]?.otHours||0,
  label:currency(calculation.total)
 };
}
