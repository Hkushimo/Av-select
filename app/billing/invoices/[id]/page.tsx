import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import Breadcrumbs from "@/app/admin/breadcrumbs";
import {currentRole} from "@/lib/server";
import {currency,dateOnly,invoiceLabel,calculateInvoiceDays,type RateBasis,type InvoiceRow} from "@/lib/invoicing";
import PrintInvoice from "../../print-button";

export const dynamic="force-dynamic";
type Props={params:Promise<{id:string}>};
export default async function InvoiceDetails({params}:Props){
 const {db,user,role}=await currentRole();
 if(!user)redirect("/login");
 if(role!=="technician")redirect("/");
 const {id}=await params;
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))notFound();
 const {data,error}=await db.from("technician_invoices").select("*").eq("id",id).eq("technician_id",user.id).maybeSingle();
 if(error)throw new Error("Unable to load invoice.");
 if(!data)notFound();
 const invoice=data as InvoiceRow;
 const basis:RateBasis=invoice.billing_basis==="day"?"day":"hourly";
 const itemized=(invoice.billing_basis==="day"||invoice.billing_basis==="hourly")&&Array.isArray(invoice.work_days)&&invoice.work_days.length>0&&Number(invoice.agreed_rate)>0;
 const breakdown=itemized?calculateInvoiceDays(basis,Number(invoice.agreed_rate),invoice.work_days||[]):null;
 const total=Number(invoice.billed_total??invoice.total);
 const workDate=new Date(invoice.job_starts_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
 return <main className="invoice-page mx-auto max-w-3xl px-4 py-6 space-y-5">
  <div className="invoice-chrome space-y-4">
   <Breadcrumbs items={[{label:"Dashboard",href:"/dashboard"},{label:"Billing",href:"/billing"},{label:invoiceLabel(invoice.invoice_number)}]}/>
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div><p className="text-blue-400 text-xs font-bold tracking-widest uppercase">Technician billing</p><h1 className="text-2xl font-bold mt-1">{invoiceLabel(invoice.invoice_number)}</h1></div>
    <PrintInvoice/>
   </div>
  </div>
  <article className="invoice-sheet rounded-xl bg-white text-slate-900 p-6 sm:p-10 space-y-7 shadow-sm">
   <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-6">
    <div><p className="text-2xl font-black tracking-tight">INVOICE</p><p className="text-sm text-slate-500 mt-1">{invoiceLabel(invoice.invoice_number)}</p></div>
    <div className="text-right text-xs sm:text-sm">
     <p><span className="text-slate-500">Issued:</span> {dateOnly(invoice.issued_on)}</p>
     <p className="mt-1"><span className="text-slate-500">Due:</span> {dateOnly(invoice.due_on)}</p>
    </div>
   </div>
   <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
    <div className="space-y-1">
     <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">From</p>
     <p className="font-bold break-words">{invoice.from_name}</p>
     {invoice.from_location&&<p className="break-words">{invoice.from_location}</p>}
     {invoice.from_email&&<p className="break-all">{invoice.from_email}</p>}
     {invoice.from_phone&&<p>{invoice.from_phone}</p>}
    </div>
    <div className="space-y-1">
     <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Bill to</p>
     <p className="font-bold break-words">{invoice.bill_to}</p>
     {invoice.bill_to_address&&<p className="whitespace-pre-wrap break-words">{invoice.bill_to_address}</p>}
    </div>
   </div>
   <div className="space-y-1 text-sm">
    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Job</p>
    <p className="font-semibold">{invoice.job_title}</p>
    {invoice.job_position&&<p>{invoice.job_position}</p>}
    <p className="text-slate-600">{invoice.job_venue||"Venue not specified"} · {workDate}</p>
    {itemized&&<p className="text-xs text-slate-500 mt-1">{basis==="day"?"Day rate · 10 hours included · overtime at 1.5× after 10 billable hours":"Hourly rate · actual billable hours"}</p>}
    {invoice.job_address&&<p className="text-slate-600 break-words">{invoice.job_address}</p>}
   </div>
   <div className="overflow-x-auto">
    <table className="w-full text-sm border-collapse">
     <thead><tr className="border-b-2 border-slate-900 text-left">
      <th className="py-3 pr-2">Work performed</th><th className="py-3 px-2 text-right">Quantity</th>
      <th className="py-3 px-2 text-right">Rate</th><th className="py-3 pl-2 text-right">Amount</th>
     </tr></thead>
     <tbody>
      {breakdown?breakdown.charges.map(day=><tr key={day.date} className="border-b border-slate-200">
       <td colSpan={4} className="!p-0">
        <table className="w-full text-sm table-fixed"><tbody>
         <tr>
          <td className="py-3 pr-2 break-words w-[43%]">{dateOnly(day.date)}<span className="block text-xs text-slate-500">{[day.timeIn&&day.timeOut?day.timeIn+" – "+day.timeOut+(day.timeOut<day.timeIn?" (+1 day)":""):null,day.hours.toFixed(2)+"h worked",day.lunchDeducted?"1h lunch deducted":null].filter(Boolean).join(" · ")}</span></td>
          <td className="py-3 px-2 text-right w-[16%]">{basis==="day"?"1 day":day.billableHours.toFixed(2)+" hrs"}</td>
          <td className="py-3 px-2 text-right w-[20%]">{currency(Number(invoice.agreed_rate))}/{basis==="day"?"day":"hr"}</td>
          <td className="py-3 pl-2 text-right font-semibold w-[21%]">{currency(day.regular)}</td>
         </tr>
         {basis==="hourly"&&day.lunchDeducted>0&&<tr className="text-slate-600">
          <td colSpan={4} className="pb-2 text-xs">Lunch taken · 1 hour deducted from {day.hours.toFixed(2)} entered hours</td>
         </tr>}
         {basis==="day"&&day.otHours>0&&<tr className="text-slate-600">
          <td className="pb-3 pr-2">Overtime after 10h <span className="block text-xs text-slate-500">1.5× hourly equivalent</span></td>
          <td className="pb-3 px-2 text-right">{day.otHours.toFixed(2)} hrs</td>
          <td className="pb-3 px-2 text-right">{currency(Number(invoice.agreed_rate)/10*1.5)}/hr</td>
          <td className="pb-3 pl-2 text-right font-semibold">{currency(day.overtime)}</td>
         </tr>}
        </tbody></table>
       </td>
      </tr>):<tr className="border-b border-slate-200">
       <td className="py-4 pr-2 break-words">{invoice.job_position||"AV technician services"}</td>
       <td className="py-4 px-2 text-right">{Number(invoice.hours).toFixed(2)} hrs</td>
       <td className="py-4 px-2 text-right">{currency(Number(invoice.hourly_rate))}/hr</td>
       <td className="py-4 pl-2 text-right font-semibold">{currency(total)}</td>
      </tr>}
     </tbody>
    </table>
   </div>
   <div className="flex justify-end">
    <div className="min-w-40 flex items-center justify-between gap-4 border-t-2 border-slate-900 pt-3">
     <span className="font-semibold">Total due</span><span className="font-bold text-xl">{currency(total)}</span>
    </div>
   </div>
   {invoice.notes&&<div className="text-sm border-t border-slate-200 pt-5"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Notes</p><p className="whitespace-pre-wrap break-words">{invoice.notes}</p></div>}
   <p className="text-slate-400 text-xs border-t border-slate-200 pt-4">Prepared by {invoice.from_name}. Payment is arranged directly with the billed client.</p>
  </article>
  <p className="invoice-chrome muted text-xs">Use “Print / Save PDF” to download a copy or print it, then send the file to your client. AV Select does not send invoices automatically.</p>
  <Link className="invoice-chrome inline-block text-blue-300 text-sm" href="/billing">← All invoices</Link>
 </main>;
}
