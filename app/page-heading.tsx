import type {ReactNode} from "react";
export default function PageHeading({eyebrow,title,description,className=""}:{eyebrow:string;title:ReactNode;description?:ReactNode;className?:string}){
 return <header className={className}>
  <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-400">{eyebrow}</p>
  <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight sm:text-3xl break-words">{title}</h1>
  {description&&<p className="muted mt-2 text-sm leading-relaxed">{description}</p>}
 </header>;
}
