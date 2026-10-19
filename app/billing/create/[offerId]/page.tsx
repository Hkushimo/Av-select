import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import Breadcrumbs from "@/app/admin/breadcrumbs";
import PageHeading from "@/app/page-heading";
import {currentRole} from "@/lib/server";
import {finishedAt,agreedRateFromLabel,type RateBasis} from "@/lib/invoicing";
import InvoiceForm from "../../invoice-form";

export const dynamic="force-dynamic";
type Props={params:Promise<{offerId:string}>};
type JobInfo={title:string;venue:string;address:string;starts_at:string;ends_at:string|null;rate:string;rate_basis:RateBasis;status:string};
export default async function CreateInvoice({params}:Props){
 const {db,user,role}=await currentRole();
 if(!user)redirect("/login");
 if(role!=="technician")redirect("/");
 const {offerId}=await params;
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(offerId))notFound();
 const [{data:offer,error},{data:tech},{data:existing}]=await Promise.all([
  db.from("job_offers").select("id,status,offer_position,offer_rate,jobs(title,venue,address,starts_at,ends_at,rate,rate_basis,status)")
   .eq("id",offerId).eq("technician_id",user.id).maybeSingle(),
  db.from("technicians").select("full_name,phone,city,state").eq("user_id",user.id).maybeSingle(),
  db.from("technician_invoices").select("id").eq("offer_id",offerId).eq("technician_id",user.id).maybeSingle()
 ]);
 if(error||!offer)notFound();
 if(existing?.id)redirect("/billing/invoices/"+existing.id);
 const job=offer.jobs as unknown as JobInfo|null;
 if(!job)notFound();
 const eligible=offer.status==="confirmed"&&finishedAt(job)<=Date.now();
 if(!eligible)return <main className="mx-auto max-w-2xl px-4 py-6 space-y-5">
  <Breadcrumbs items={[{label:"Dashboard",href:"/dashboard"},{label:"Billing",href:"/billing"},{label:"New invoice"}]}/>
  <PageHeading eyebrow="Billing" title="Invoice not available yet"/>
  <div className="panel space-y-3"><p className="muted text-sm">Invoices can be created after an admin-confirmed booking has finished. If your job has ended but is still marked Accepted, ask the admin to confirm it.</p>
   <Link href="/offers" className="text-blue-300 text-sm font-semibold">Back to My Schedule →</Link></div>
 </main>;
 const rateLabel=offer.offer_rate||job.rate||"";
 const rateBasis:RateBasis=job.rate_basis==="day"?"day":"hourly";
 const agreedRate=agreedRateFromLabel(rateLabel,rateBasis);
 const fromLocation=[tech?.city,tech?.state].filter(Boolean).join(", ");
 return <main className="mx-auto max-w-2xl px-4 py-6 space-y-5">
  <Breadcrumbs items={[{label:"Dashboard",href:"/dashboard"},{label:"Billing",href:"/billing"},{label:"New invoice"}]}/>
  <PageHeading eyebrow="Technician billing" title="Create invoice" description={job.title}/>
  {agreedRate===null?<section className="panel space-y-3">
    <p className="text-amber-200 text-sm font-semibold">Agreed rate needs clarification</p>
    <p className="muted text-sm">This booking's saved rate ({rateLabel||"missing"}) isn't an unambiguous {rateBasis==="day"?"day":"hourly"} amount. Invoice creation is paused rather than allowing a technician to change the agreed rate.</p>
    <p className="muted text-xs">Ask the administrator to correct the job's pay structure and agreed offer rate.</p>
    <Link href="/offers" className="text-blue-300 text-sm font-semibold">Back to My Schedule →</Link>
   </section>:<InvoiceForm offerId={offer.id} job={job} position={offer.offer_position||""}
    originalRate={rateLabel} rateBasis={rateBasis} agreedRate={agreedRate}
    technician={{name:tech?.full_name||"",email:user.email||"",phone:tech?.phone||"",location:fromLocation}}/>}
 </main>;
}
