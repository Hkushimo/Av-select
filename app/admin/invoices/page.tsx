import Link from "next/link";
import {redirect} from "next/navigation";
import PageHeading from "@/app/page-heading";
import Breadcrumbs from "../breadcrumbs";
import {currentRole} from "@/lib/server";
import {currency,dateOnly,invoiceLabel} from "@/lib/invoicing";

export const dynamic="force-dynamic";
const PAGE_SIZE=50;
type Props={searchParams:Promise<{page?:string}>};
type InvoiceItem={
 id:string;invoice_number:number;from_name:string;job_title:string;
 job_position:string;bill_to:string;issued_on:string;total:number;
 billed_total:number|null;
};
export default async function AdminInvoices({searchParams}:Props){
 const {db,user,role}=await currentRole();
 if(!user)redirect("/login");
 if(role!=="admin")redirect("/");
 const params=await searchParams;
 const proposed=Number(params.page||"1");
 const page=Number.isSafeInteger(proposed)&&proposed>=1?proposed:1;
 const from=(page-1)*PAGE_SIZE;
 const {data,error,count}=await db.from("technician_invoices")
  .select("id,invoice_number,from_name,job_title,job_position,bill_to,issued_on,total,billed_total,created_at",{count:"exact"})
  .order("created_at",{ascending:false})
  .range(from,from+PAGE_SIZE-1);
 const invoices=(data||[]) as InvoiceItem[];
 const total=count??0;
 return <main className="mx-auto max-w-4xl px-4 py-6 space-y-5">
  <Breadcrumbs items={[{label:"Dashboard",href:"/admin"},{label:"Invoices"}]}/>
  <PageHeading eyebrow="Admin billing" title="Submitted invoices" description="Read-only access to technician invoices across all jobs."/>
  <section className="panel !p-4 sm:!p-5 space-y-3">
   <div className="flex items-center justify-between gap-2">
    <h2 className="font-semibold text-lg">All invoices</h2>
    {!error&&<span className="muted text-sm">{total} total</span>}
   </div>
   {error?<p role="alert" className="text-amber-200 text-sm">
    Could not load technician invoices. Check that Supabase migration 015 is applied, then reload.
   </p>:invoices.length===0?
    <p className="muted text-sm py-3">{page>1?"No invoices on this page. Go to an earlier page.":"No technician invoices submitted yet."}</p>:
    <div className="divide-y divide-slate-700/70">
     {invoices.map(i=><Link key={i.id} href={"/billing/invoices/"+i.id}
      className="block py-3.5 px-1 hover:bg-slate-800/40">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
       <div className="min-w-0 flex-1 space-y-1">
        <p className="font-semibold text-sm break-words">{i.from_name||"Technician"} <span className="muted font-normal">· {i.job_title}</span></p>
        <p className="muted text-xs break-words">{invoiceLabel(i.invoice_number)} · {dateOnly(i.issued_on)}{i.job_position?" · "+i.job_position:""}</p>
        <p className="muted text-xs break-words">Bill to: {i.bill_to}</p>
       </div>
       <div className="flex items-center gap-3 shrink-0">
        <span className="text-green-300 font-semibold text-sm">{currency(Number(i.billed_total??i.total))}</span>
        <span className="text-blue-300 text-sm font-semibold">View ↗</span>
       </div>
      </div>
     </Link>)}
    </div>}
   {!error&&total>PAGE_SIZE&&<nav aria-label="Invoice pages" className="flex items-center justify-between gap-3 border-t border-slate-700 pt-3">
    {page>1?<Link href={"/admin/invoices?page="+(page-1)} className="pill text-blue-300">← Previous</Link>:<span/>}
    <span className="muted text-xs">Page {page} of {Math.ceil(total/PAGE_SIZE)}</span>
    {from+invoices.length<total&&invoices.length>0?<Link href={"/admin/invoices?page="+(page+1)} className="pill text-blue-300">Next →</Link>:<span/>}
   </nav>}
  </section>
 </main>;
}
