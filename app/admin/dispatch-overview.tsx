import Link from "next/link";
import {formatJobTime,zoneLabel} from "@/lib/job-time";
import {dispatchJobs,type DispatchJob} from "@/lib/dispatch";
import {currency,dateOnly,invoiceLabel} from "@/lib/invoicing";

type Invoice={id:string;invoice_number:number;from_name:string;job_title:string;issued_on:string;total:number;billed_total:number|null};
export default function DispatchOverview({jobs,now,loadError=false,truncated=false}:{jobs:DispatchJob[];now:number;loadError?:boolean;truncated?:boolean}) {
 const active=dispatchJobs(jobs,now);
 const accepted=active.reduce((sum,j)=>sum+j.crew.accepted,0),pending=active.reduce((sum,j)=>sum+j.crew.pending,0);
 const unconfirmed=active.filter(j=>j.crew.confirmed===0);
 const attention=active.filter(j=>j.crew.accepted||!j.crew.confirmed||j.crew.pending);
 if(loadError)return <div role="alert" className="panel text-amber-200">Staffing information couldn’t load. <Link className="underline" href="/admin/jobs">Open jobs to try again</Link>.</div>;
 return <div className="space-y-3">
  <div className="grid grid-cols-3 divide-x divide-slate-700 rounded-2xl border border-slate-700/70 bg-[#121a29]" aria-label="Staffing overview">
   {[
    {count:accepted,label:"To confirm",description:"Accepted offers ready for a decision",color:"text-blue-300",href:accepted?"#confirmations":"/admin/jobs"},
    {count:unconfirmed.length,label:"No confirmed crew",description:"Active jobs with no finalized bookings",color:"text-amber-200",href:active.length?"#staffing-attention":"/admin/jobs"},
    {count:pending,label:"Pending replies",description:"Offers still with technicians",color:"text-slate-200",href:pending?"#pending-offers":"/admin/jobs"},
   ].map(item=><a key={item.label} href={item.href} className="min-w-0 p-3 sm:p-5 hover:bg-slate-800/60 first:rounded-l-2xl last:rounded-r-2xl">
    <p className={"text-2xl sm:text-3xl font-bold tabular-nums "+item.color}>{item.count}</p><h2 className="text-xs sm:text-sm font-semibold mt-2">{item.label}</h2><p className="hidden sm:block muted mt-1 text-xs leading-relaxed">{item.description}</p>
   </a>)}
  </div>
  <details className="text-xs muted"><summary className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md"><span aria-hidden="true">ⓘ</span> About these counts</summary><p className="pb-2 leading-relaxed">Counts cover upcoming and in-progress open or draft jobs. Crew totals are not staffing targets.</p></details>
  {truncated&&<p className="text-xs text-amber-200">Showing the next 50 active jobs. <Link href="/admin/jobs" className="underline">View all jobs</Link>.</p>}
  {active.length>0&&<div className={"grid gap-5 "+(accepted||pending?"lg:grid-cols-[1.5fr_1fr]":"")}>
   <section id="staffing-attention" className="space-y-3 scroll-mt-24">
    <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Staffing desk</h2><Link href="/admin/jobs" className="text-blue-300 text-sm underline underline-offset-4">All jobs →</Link></div>
    {!attention.length?<div className="panel"><p className="font-semibold text-green-300">No outstanding offer responses</p><p className="muted text-sm mt-2">Every active job has confirmed crew. Review each job to check that your staffing needs are covered.</p></div>:<div className="space-y-3">{attention.map(job=><article key={job.id} className="panel !p-4 sm:!p-5 space-y-3">
     <div className="flex items-start justify-between gap-3"><h3 className="font-semibold break-words">{job.title}</h3><span className="pill !text-xs capitalize shrink-0">{job.status}</span></div>
     <p className="muted text-sm">{job.venue||"Venue TBD"}</p><p className="text-sm">{formatJobTime(job.starts_at,job.time_zone)}</p><p className="muted text-xs">{zoneLabel(job.time_zone)}</p>
     <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs"><span className="text-blue-300">{job.crew.accepted} accepted</span><span className="text-slate-300">{job.crew.pending} awaiting response</span><span className="text-green-300">{job.crew.confirmed} confirmed</span></div>
     <Link href={`/admin/jobs/${job.id}#${job.crew.accepted?"crew-accepted":"job-staffing"}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-blue-300">{job.crew.accepted?"Review accepted offers":job.crew.confirmed===0?"Plan & confirm crew":"View outstanding offers"} →</Link>
    </article>)}</div>}
   </section>
   {(accepted>0||pending>0)&&<aside className="space-y-5">
    {accepted>0&&<section id="confirmations" className="panel !p-5 space-y-3 scroll-mt-24"><h2 className="font-semibold">Confirmations</h2><p className="muted text-sm">Confirm accepted offers to finalize bookings.</p>{active.filter(j=>j.crew.accepted>0).map(j=><Link key={j.id} href={`/admin/jobs/${j.id}#crew-accepted`} className="flex justify-between items-center gap-3 border-t border-slate-700 pt-3 min-h-11 text-sm"><span className="break-words">{j.title}</span><span className="text-blue-300 shrink-0">{j.crew.accepted} to review →</span></Link>)}</section>}
    {pending>0&&<section id="pending-offers" className="panel !p-5 space-y-3 scroll-mt-24"><h2 className="font-semibold">Waiting on technicians</h2>{active.filter(j=>j.crew.pending>0).map(j=><Link key={j.id} href={`/admin/jobs/${j.id}#crew-pending`} className="flex justify-between items-center gap-3 min-h-11 text-sm"><span className="break-words">{j.title}</span><span className="muted shrink-0">{j.crew.pending} pending →</span></Link>)}</section>}
   </aside>}
  </div>}
 </div>;
}
export function RecentInvoices({invoices,invoiceError=false}:{invoices:Invoice[];invoiceError?:boolean}) {
 return <section className="panel !p-4 sm:!p-5 space-y-3"><div className="flex flex-wrap justify-between items-center gap-2"><h2 className="text-lg font-semibold">Recent invoices</h2><Link href="/admin/invoices" className="text-blue-300 text-sm underline underline-offset-4">All invoices →</Link></div>
  <details className="muted text-xs"><summary className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md"><span aria-hidden="true">ⓘ</span> About invoices</summary><p className="pb-2">Latest submissions. Approval and payment status are not tracked here.</p></details>
  {invoiceError?<p role="alert" className="text-amber-200 text-sm">Invoices couldn’t load. Open All invoices to try again.</p>:!invoices.length?<p className="muted text-sm">No invoices yet.</p>:invoices.map(i=><Link key={i.id} href={`/billing/invoices/${i.id}`} className="flex items-center justify-between gap-3 border-t border-slate-700 py-3 min-h-11"><div className="min-w-0"><p className="font-semibold text-sm break-words">{i.from_name} · {i.job_title}</p><p className="muted text-xs mt-1">{invoiceLabel(i.invoice_number)} · {dateOnly(i.issued_on)}</p></div><span className="text-green-300 text-sm font-semibold shrink-0">{currency(Number(i.billed_total??i.total))}</span></Link>)}
 </section>;
}
