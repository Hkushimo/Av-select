// Standardized US location options shared by registration, profiles and staffing.
export const US_STATES=[["AL","Alabama"],["AK","Alaska"],["AZ","Arizona"],["AR","Arkansas"],["CA","California"],["CO","Colorado"],["CT","Connecticut"],["DE","Delaware"],["DC","District of Columbia"],["FL","Florida"],["GA","Georgia"],["HI","Hawaii"],["ID","Idaho"],["IL","Illinois"],["IN","Indiana"],["IA","Iowa"],["KS","Kansas"],["KY","Kentucky"],["LA","Louisiana"],["ME","Maine"],["MD","Maryland"],["MA","Massachusetts"],["MI","Michigan"],["MN","Minnesota"],["MS","Mississippi"],["MO","Missouri"],["MT","Montana"],["NE","Nebraska"],["NV","Nevada"],["NH","New Hampshire"],["NJ","New Jersey"],["NM","New Mexico"],["NY","New York"],["NC","North Carolina"],["ND","North Dakota"],["OH","Ohio"],["OK","Oklahoma"],["OR","Oregon"],["PA","Pennsylvania"],["RI","Rhode Island"],["SC","South Carolina"],["SD","South Dakota"],["TN","Tennessee"],["TX","Texas"],["UT","Utah"],["VT","Vermont"],["VA","Virginia"],["WA","Washington"],["WV","West Virginia"],["WI","Wisconsin"],["WY","Wyoming"]] as const;
export function stateName(code:string){return US_STATES.find(([value])=>value===code)?.[1]||code}
export function stateFromLegacy(value:string){
 const input=value.trim();
 const match=US_STATES.find(([code,name])=>input.toLowerCase()===name.toLowerCase()||input.toUpperCase()===code);
 if(match)return {city:"",state:match[0]};
 const suffix=input.match(/^(.+?)(?:,|\s+)\s*([A-Za-z]{2})$/);
 if(suffix&&US_STATES.some(([code])=>code===suffix[2].toUpperCase()))return {city:suffix[1].trim(),state:suffix[2].toUpperCase()};
 const names=US_STATES.find(([,name])=>input.toLowerCase().endsWith(", "+name.toLowerCase()));
 if(names)return {city:input.slice(0,-names[1].length-2).trim(),state:names[0]};
 return {city:input,state:""};
}
export function locationText(city:string,state:string){
 const parsed=state?{city:city.trim(),state}:stateFromLegacy(city||"");
 if(!parsed.city)return parsed.state?`City needed · ${parsed.state}`:"Location incomplete";
 if(!parsed.state)return `${parsed.city} · State needed`;
 return `${parsed.city}, ${parsed.state}`;
}
