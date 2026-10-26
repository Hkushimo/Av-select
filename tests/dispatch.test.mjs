import assert from "node:assert/strict";
import test from "node:test";
import {crewCounts,dispatchJobs} from "../lib/dispatch.ts";
test("staffing counts exclude inactive offers",()=>{
 assert.deepEqual(crewCounts([{status:"pending"},{status:"accepted"},{status:"confirmed"},{status:"cancelled"},{status:"declined"}]),{pending:1,accepted:1,confirmed:1});
});
test("dispatch includes in-progress jobs, excludes closed and ended jobs, and sorts by call",()=>{
 const job={id:"1",title:"Test",venue:"Venue",time_zone:"UTC",status:"open",starts_at:"2026-10-25T09:00Z",ends_at:"2026-10-27T17:00Z",job_offers:[{status:"accepted"}]};
 const result=dispatchJobs([{...job,id:"later",starts_at:"2026-10-27T09:00Z"},job,{...job,id:"closed",status:"closed"},{...job,id:"ended",ends_at:"2026-10-26T12:00Z"},{...job,id:"no-end",ends_at:null}],Date.parse("2026-10-26T12:00Z"));
 assert.deepEqual(result.map(j=>j.id),["1","later"]);
 assert.equal(result[0].crew.accepted,1);
});
