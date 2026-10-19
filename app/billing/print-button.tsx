"use client";
export default function PrintInvoice(){
 return <button type="button" onClick={()=>window.print()} className="primary !px-4 !py-2.5 text-sm">
  Print / Save PDF
 </button>;
}
