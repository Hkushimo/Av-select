import type {ReactNode} from "react";
type IconName="map-pin"|"home"|"jobs"|"calendar"|"user"|"logout"|"activity"|"chevron-left"|"chevron-right"|"clock"|"check"|"sliders"|"menu"|"x";
const paths:Record<IconName,ReactNode>={
 "map-pin":<><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
 home:<><path d="m3 10 9-7 9 7"/><path d="M5 9.5V21h14V9.5M9 21v-7h6v7"/></>,
 jobs:<><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18M10 13v2h4v-2"/></>,
 calendar:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></>,
 user:<><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
 logout:<><path d="M10 17l5-5-5-5M15 12H3"/><path d="M12 3h6a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-6"/></>,
 activity:<><path d="M3 12h4l3-7 4 14 3-7h4"/></>,
 "chevron-left":<path d="m15 18-6-6 6-6"/>,
 "chevron-right":<path d="m9 18 6-6-6-6"/>,
 clock:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/></>,
 check:<path d="m5 12 4 4L19 6"/>,
 sliders:<><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2" fill="#172235"/><circle cx="15" cy="17" r="2" fill="#172235"/></>,
 menu:<path d="M4 6h16M4 12h16M4 18h16"/>,
 x:<path d="M5 5l14 14M19 5L5 19"/>
};
export default function AppIcon({name,size=18,className=""}:{name:IconName;size?:number;className?:string}){
 return <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name]}</svg>;
}
