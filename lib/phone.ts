/** Format North American phone numbers while leaving international numbers intact. */
export function formatPhone(value:string):string {
 const digits=value.replace(/\D/g,"");
 if(!digits)return "";
 const hasCountry=digits.length===11&&digits.startsWith("1");
 if(digits.length>10&&!hasCountry)return value;
 const n=hasCountry?digits.slice(1):digits;
 const result=n.length<=3?n:n.length<=6:`(${n.slice(0,3)}) ${n.slice(3)}`:`(${n.slice(0,3)}) ${n.slice(3,6)}-${n.slice(6,10)}`;
 return hasCountry?"+1 "+result:result;
}
