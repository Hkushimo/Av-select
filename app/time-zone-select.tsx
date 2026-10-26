"use client";
import {useEffect,useState} from "react";
const common = ["UTC","America/New_York","America/Chicago","America/Denver","America/Phoenix","America/Los_Angeles","America/Anchorage","Pacific/Honolulu"];
export default function TimeZoneSelect({value,onChange,disabled=false}:{value:string;onChange:(zone:string)=>void;disabled?:boolean}) {
 const [zones,setZones] = useState(common);
 useEffect(() => {
  const intl = Intl as typeof Intl & {supportedValuesOf?:(key:string)=>string[]};
  if (intl.supportedValuesOf) setZones([...new Set([...common,...intl.supportedValuesOf("timeZone")])].sort());
 },[]);
 return <label className="block"><span className="label">Venue time zone *</span><select required value={value} onChange={e=>onChange(e.target.value)} disabled={disabled}>
  <option value="">Choose the venue’s time zone</option>
  {[...new Set([...zones,...(value?[value]:[])])].map(zone=><option key={zone} value={zone}>{zone.replaceAll("_"," ")}</option>)}
 </select></label>;
}
