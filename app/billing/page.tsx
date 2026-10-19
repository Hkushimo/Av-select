import Link from "next/link";
import {redirect} from "next/navigation";
import PageHeading from "@/app/page-heading";
import Breadcrumbs from "@/app/admin/breadcrumbs";
import AppIcon from "@/app/app-icon";
import {currentRole} from "@/lib/server";
import {currency,dateOnly,invoiceLabel,type InvoiceRow} from "@/lib/invoicing";

export const dynamic="force-dynamic";
export default async function Billing(){
 const {db,user,role}=await currentRole();
 if(!user)redirect("/login");
 if(role!=="technician")redirect("/");
 const {data,error}=await db.from("technician_invoices")
  .select("id,invoice_number,job_title,job_position,bill_to,hours,hourly_rate,total,billed_total,issued_on,due_on,created_at")
  .eq("technician_id",user.id).order("created_at",{ascending:false});
 type Summary=Pick<InvoiceRow,"id"|"invoice_number"|"job_title"|"job_position"|"bill_to"|"total"|"billed_total"|"issued_on"|"due_on">;
 const invoices=(data||[]) as Summary[];
 return <main className="mx-auto max-w-3xl px-4 py-6 space-y-5">
  <Breadcrumbs items={[{label:"Dashboard",href:"/dashboard"},{label:"Billing"}]}/>
  <PageHeading eyebrow="Technician account" title="Billing" description="Create invoices from finished bookings and keep your records in one place."/>
  <section className="panel !p-4 sm:!p-5 space-y-3">
   <div className="flex items-center justify-between gap-3">
    <h2 className="text-lg font-semibold">Your invoices</h2>
    <span className="muted text-sm">{invoices.length}</span>
   </div>
   {error?<p className="text-red-300 text-sm" role="alert">Could not load invoices. The billing database migration may still need to be applied.</p>:
    invoices.length?<div className="divide-y divide-slate-700/70">
     {invoices.map(invoice=><Link href={"/billing/invoices/"+invoice.id} key={invoice.id}
      className="flex items-center justify-between gap-3 py-3.5 hover:bg-slate-800/30">
       <div className="min-w-0">
        <p className="font-semibold text-sm truncate">{invoice.job_title}</p>
        <p className="muted text-xs mt-1">{invoiceLabel(invoice.invoice_number)} · {dateOnly(invoice.issued_on)}</p>
        <p className="muted text-xs mt-1 truncate">{invoice.bill_to}{invoice.job_position?" · "+invoice.job_position:""}</p>
       </div>
       <div className="shrink-0 flex items-center gap-2">
        <span className="text-green-300 font-semibold text-sm">{currency(Number(invoice.billed_total??invoice.total))}</span>
        <AppIcon name="chevron-right" className="text-blue-300"/>
       </div>
      </Link>)}
    </div>:
    <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-4 space-y-2">
     <p className="text-sm font-medium">No invoices yet</p>
     <p className="muted text-sm">After a confirmed job finishes, open My Schedule → Past jobs → Create invoice.</p>
     <Link href="/offers" className="inline-flex items-center gap-2 text-blue-300 text-sm font-semibold">My Schedule →</Link>
    </div>}
  </section>
  <section className="panel !p-4 sm:!p-5 space-y-3">
   <div className="flex items-center gap-2"><AppIcon name="wallet" size={21} className="text-blue-300"/><h2 className="text-lg font-semibold">Forms & tools</h2></div>
   <a href="https://www.irs.gov/pub/irs-pdf/fw9.pdf" target="_blank" rel="noopener noreferrer"
    className="flex items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-900/40 px-4 py-3 hover:border-blue-500">
    <div><p className="font-semibold text-sm text-blue-300">Download IRS Form W-9 ↗</p><p className="muted text-xs mt-1">Official, blank PDF from the IRS</p></div>
    <AppIcon name="chevron-right" className="text-blue-300"/>
   </a>
   <p className="muted text-xs">Complete your W-9 outside AV Select and share it securely with the payer. AV Select does not collect tax ID numbers, store W-9s, send invoices, or process payments.</p>
  </section>
 </main>;
}
