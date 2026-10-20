import Link from "next/link";
import {currency,dateOnly,invoiceLabel} from "@/lib/invoicing";

export type CrewInvoiceOffer={
 id:string;technician_id:string;status:string;offer_position:string|null;
};
export type JobInvoiceSummary={
 id:string;offer_id:string|null;invoice_number:number;from_name:string;
 issued_on:string;total:number;billed_total:number|null;
};
export default function TechInvoices({offers,technicians,invoices,loadError}:{
 offers:CrewInvoiceOffer[];
 technicians:{user_id:string;full_name:string|null}[];
 invoices:JobInvoiceSummary[];
 loadError:boolean;
}){
 const invoiceByOffer=new Map(invoices.filter(i=>i.offer_id).map(i=>[i.offer_id!,i]));
 // A cancelled offer is only kept in this panel if it already has an invoice.
 const crew=offers.filter(o=>o.status!=="declined"&&(o.status!=="cancelled"||invoiceByOffer.has(o.id)));
 const names=new Map(technicians.map(t=>[t.user_id,t.full_name]));
 const linkedIds=new Set(crew.map(o=>o.id));
 // Kept job association lets admins view invoices after an offer is removed.
 const formerInvoices=invoices.filter(i=>!i.offer_id||!linkedIds.has(i.offer_id));
 const submitted=invoices.length;
 return <details id="job-invoices" className="panel !p-4 sm:!p-5 scroll-mt-24 group">
  <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-3">
   <div className="min-w-0">
    <h2 className="text-lg font-semibold">Tech invoices</h2>
    <p className="muted text-xs mt-1">{loadError?"Unable to check submissions":submitted+" submitted · "+(crew.length+formerInvoices.length)+" crew records"}</p>
   </div>
   <span className="shrink-0 text-blue-300 text-sm group-open:hidden">View ↓</span>
   <span className="shrink-0 text-blue-300 text-sm hidden group-open:inline">Hide ↑</span>
  </summary>
  <div className="border-t border-slate-700/70 mt-4 pt-3 space-y-2">
   {loadError?<p className="text-amber-200 text-sm" role="alert">
     Unable to load invoices. Apply migration 015 in Supabase, then refresh this page.
    </p>:crew.length===0&&formerInvoices.length===0?<p className="muted text-sm py-2">No technicians assigned to this job yet.</p>:
    crew.map(o=>{
     const invoice=invoiceByOffer.get(o.id);
     return <div key={o.id} className="rounded-xl border border-slate-700/70 bg-slate-900/40 px-3 py-3 flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
       <p className="font-semibold text-sm break-words">{names.get(o.technician_id)||invoice?.from_name||"Technician"}</p>
       {o.offer_position&&<p className="muted text-xs mt-1 break-words">{o.offer_position}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
       {invoice?<>
        <div className="text-right">
         <p className="text-green-300 text-xs font-semibold">Submitted · {currency(Number(invoice.billed_total??invoice.total))}</p>
         <p className="muted text-xs mt-1">{invoiceLabel(invoice.invoice_number)} · {dateOnly(invoice.issued_on)}</p>
        </div>
        <Link href={"/billing/invoices/"+invoice.id} className="inline-flex items-center rounded-lg border border-blue-500/40 px-3 py-2 text-sm font-semibold text-blue-300 hover:bg-blue-500/10">
         View invoice ↗
        </Link>
       </>:<span className="text-slate-400 text-xs font-medium">Not submitted</span>}
      </div>
     </div>
    })}
   {formerInvoices.map(invoice=><div key={invoice.id} className="rounded-xl border border-slate-700/70 bg-slate-900/40 px-3 py-3 flex flex-wrap items-center justify-between gap-3">
     <div className="min-w-0 flex-1">
      <p className="font-semibold text-sm break-words">{invoice.from_name||"Technician"}</p>
      <p className="muted text-xs mt-1">Previously assigned · invoice retained</p>
     </div>
     <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <div className="text-right">
       <p className="text-green-300 text-xs font-semibold">Submitted · {currency(Number(invoice.billed_total??invoice.total))}</p>
       <p className="muted text-xs mt-1">{invoiceLabel(invoice.invoice_number)} · {dateOnly(invoice.issued_on)}</p>
      </div>
      <Link href={"/billing/invoices/"+invoice.id} className="inline-flex items-center rounded-lg border border-blue-500/40 px-3 py-2 text-sm font-semibold text-blue-300 hover:bg-blue-500/10">
       View invoice ↗
      </Link>
     </div>
    </div>)}
   <Link href="/admin/invoices" className="inline-block text-blue-300 text-xs font-semibold pt-2 hover:underline">
    View all submitted invoices →
   </Link>
  </div>
 </details>;
}
