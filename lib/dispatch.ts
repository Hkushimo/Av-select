export type DispatchJob={id:string;title:string;venue:string;starts_at:string;ends_at:string|null;time_zone:string|null;status:string;job_offers:{status:string}[]};
export function crewCounts(offers:{status:string}[]) {
 return {pending:offers.filter(o=>o.status==="pending").length,accepted:offers.filter(o=>o.status==="accepted").length,confirmed:offers.filter(o=>o.status==="confirmed").length};
}
export function dispatchJobs(jobs:DispatchJob[],now:number) {
 return jobs.filter(j=>(j.status==="open"||j.status==="draft")&&Date.parse(j.ends_at||new Date(Date.parse(j.starts_at)+86400000).toISOString())>now)
  .map(job=>({...job,crew:crewCounts(job.job_offers)}))
  .sort((a,b)=>Date.parse(a.starts_at)-Date.parse(b.starts_at));
}
