import Link from "next/link";

type Crumb={label:string;href?:string};
export default function Breadcrumbs({items}:{items:Crumb[]}){
 return <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm">
  {items.map((item,index)=><span key={index} className="inline-flex items-center gap-2 min-w-0">
    {index>0&&<span className="text-slate-600" aria-hidden="true">/</span>}
    {item.href?<Link href={item.href} className="text-blue-300 hover:text-blue-200 hover:underline underline-offset-4 py-1">{item.label}</Link>:
     <span className="text-slate-400 py-1 truncate max-w-[180px] sm:max-w-[280px]" aria-current="page">{item.label}</span>}
   </span>)}
 </nav>;
}
