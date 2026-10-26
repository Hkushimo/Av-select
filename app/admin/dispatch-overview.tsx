import Link from "next/link";
import {formatJobTime,zoneLabel} from "@/lib/job-time";
import {dispatchJobs,type DispatchJob} from "@/lib/dispatch";
import {currency,dateOnly,invoiceLabel} from "@/lib/invoicing";

type Invoice={id:string;invoice_number:number;from_name:string;job_title:string;issued_on:string;total:number;billed_total:number|null};
export default function DispatchOverview({jobs,invoices,now,loadError=false,invoiceError=false,truncated=false}:{jobs:DispatchJob[];invoices:Invoice[];now:number;loadError?:boolean;invoiceError?:boolean;truncated?:boolean}) {
 const active=dispatchJobs(jobs,now);
 const accepted=active.reduce((sum,j)=>sum+j.crew.accepted,0),pending=active.reduce((sum,j)=>sum+j.crew.pending,0);
 const unconfirmed=active.filter(j=>j.crew.confirmed===0);
 const attention=active.filter(j=>j.crew.accepted||!j.crew.confirmed||j.crew.pending);
 return <div className="space-y-6">
  {loadError?<div role="alert" className="panel text-amber-200">Staffing information couldn’t load. <Link className="underline" href="/admin/jobs">Open jobs to try again</Link>.</div>:<>
   <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Staffing overview">
    {[
     {count:accepted,label:"Awaiting your confirmation",description:"Accepted offers ready for a decision",color:"text-blue-300",href:"#confirmations"},
     {count:unconfirmed.length,label:"No confirmed crew",description:"Active jobs with no finalized bookings",color:"text-amber-200",href:"#staffing-attention"},
     {count:pending,label:"Awaiting a response",description:"Offers still with technicians",color:"text-slate-200",href:"#pending-offers"},
    ].map(item=><a key={item.label} href={item.href} className="panel !p-5 flex items-center gap-4 sm:block hover:border-blue-400 focus-visible:outline-2 focus-visible:outline-blue-400">
     <p className={"text-4xl font-bold tabular-nums "+item.color}>{item.count}</p><div><h2 className="text-sm font-semibold sm:mt-3">{item.label}</h2><p className="muted mt-1 text-xs leading-relaxed">{item.description}</p></div>
    </a>)}
   </div>
   <p className="muted text-xs">{truncated?"Showing the next 50 active jobs. Open All jobs for the full list.":"Counts cover upcoming and in-progress open or draft jobs."} Crew totals are not staffing targets.</p>
   <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
    <section id="staffing-attention" className="space-y-3 scroll-mt-24">
     <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Staffing desk</h2><Link href="/admin/jobs" className="text-blue-300 text-sm underline underline-offset-4">All jobs →</Link></div>
     {!active.length?<div className="panel space-y-3"><h3 className="font-semibold">Ready for your next show</h3><p className="muted text-sm">Create a job, set the call times, and start inviting your crew.</p><Link href="/admin/jobs" className="primary inline-flex">Create a job</Link></div>:
      !attention.length?<div className="panel"><p className="font-semibold text-green-300">No outstanding offer responses</p><p className="muted text-sm mt-2">Every active job has confirmed crew. Review each job to check that your staffing needs are covered.</p></div>:
      <div className="space-y-3">{attention.map(job=><article key={job.id} className="panel !p-4 sm:!p-5 space-y-3">
       <div className="flex items-start justify-between gap-3"><h3 className="font-semibold break-words">{job.title}</h3><span className="pill !text-xs capitalize shrink-0">{job.status}</span></div>
       <p className="muted text-sm">{job.venue||"Venue TBD"}</p><p className="text-sm">{formatJobTime(job.starts_at,job.time_zone)}</p><p className="muted text-xs">{zoneLabel(job.time_zone)}</p>
       <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs"><span className="text-blue-300">{job.crew.accepted} accepted</span><span className="text-slate-300">{job.crew.pending} awaiting response</span><span className="text-green-300">{job.crew.confirmed} confirmed</span></div>
       <Link href={`/admin/jobs/${job.id}#${job.crew.accepted?"crew-accepted":"job-staffing"}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-blue-300">{job.crew.accepted?"Review accepted offers":job.crew.confirmed===0?"Plan & confirm crew":"View outstanding offers"} →</Link>
      </article>)}</div>}
    </section>
    <aside className="space-y-5">
     <section id="confirmations" className="panel !p-5 space-y-3 scroll-mt-24"><h2 className="font-semibold">Confirmations</h2><p className="muted text-sm">Accepted means available. Confirm a booking to finalize it.</p>{active.filter(j=>j.crew.accepted>0).map(j=><Link key={j.id} href={`/admin/jobs/${j.id}#crew-accepted`} className="flex justify-between items-center gap-3 border-t border-slate-700 pt-3 min-h-11 text-sm"><span className="break-words">{j.title}</span><span className="text-blue-300 shrink-0">{j.crew.accepted} to review →</span></Link>)}{!accepted&&<p className="text-sm text-slate-300">No offers awaiting confirmation.</p>}</section>
     <section id="pending-offers" className="panel !p-5 space-y-3 scroll-mt-24"><h2 className="font-semibold">Waiting on technicians</h2>{active.filter(j=>j.crew.pending>0).map(j=><Link key={j.id} href={`/admin/jobs/${j.id}#crew-pending`} className="flex justify-between items-center gap-3 min-h-11 text-sm"><span className="break-words">{j.title}</span><span className="muted shrink-0">{j.crew.pending} pending →</span></Link>)}{!pending&&<p className="muted text-sm">No unanswered offers.</p>}</section>
    </aside>
   </div>
  </>}
  <section className="panel !p-4 sm:!p-5 space-y-3"><div className="flex flex-wrap justify-between items-center gap-2"><h2 className="text-lg font-semibold">Recent invoices</h2><Link href="/admin/invoices" className="text-blue-300 text-sm underline underline-offset-4">All invoices →</Link></div>
   <p className="muted text-xs">Latest submissions. Approval and payment status are not tracked here.</p>
   {invoiceError?<p role="alert" className="text-amber-200 text-sm">Invoices couldn’t load. Open All invoices to try again.</p>:!invoices.length?<p className="muted text-sm">Submitted technician invoices will appear here.</p>:invoices.map(i=><Link key={i.id} href={`/billing/invoices/${i.id}`} className="flex items-center justify-between gap-3 border-t border-slate-700 py-3 min-h-11"><div className="min-w-0"><p className="font-semibold text-sm break-words">{i.from_name} · {i.job_title}</p><p className="muted text-xs mt-1">{invoiceLabel(i.invoice_number)} · {dateOnly(i.issued_on)}</p></div><span className="text-green-300 text-sm font-semibold shrink-0">{currency(Number(i.billed_total??i.total))}</span></Link>)}
  </section>
 </div>;
}
