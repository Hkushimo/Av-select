import assert from "node:assert/strict";
import test from "node:test";
import {jobDate,jobDateTimeInput,jobTimeToIso,jobWorkDates,formatJobTime} from "../lib/job-time.ts";

test("venue times round-trip independently of device/server zone",()=>{
 for(const [zone,local,iso] of [
  ["America/New_York","2026-07-01T09:00","2026-07-01T13:00:00.000Z"],
  ["America/Los_Angeles","2026-01-01T17:00","2026-01-02T01:00:00.000Z"],
  ["Asia/Kolkata","2026-01-01T09:00","2026-01-01T03:30:00.000Z"],
 ]){
  assert.equal(jobTimeToIso(local,zone),iso);
  assert.equal(jobDateTimeInput(iso,zone),local);
 }
 assert.match(formatJobTime("2026-01-02T01:00:00Z","America/Los_Angeles"),/Jan 1, 2026/);
});
test("reject nonexistent, ambiguous, and invalid local times",()=>{
 assert.throws(()=>jobTimeToIso("2026-03-08T02:30","America/New_York"),/does not exist/);
 assert.throws(()=>jobTimeToIso("2026-11-01T01:30","America/New_York"),/occurs twice/);
 assert.throws(()=>jobTimeToIso("2026-02-30T09:00","UTC"),/valid/);
 assert.throws(()=>jobTimeToIso("2026-01-01T09:00","Not/AZone"));
});
test("work dates use venue dates and an exclusive end",()=>{
 assert.deepEqual(jobWorkDates("2026-01-02T01:00:00Z","2026-01-02T08:00:00Z","America/Los_Angeles"),["2026-01-01"]);
 assert.deepEqual(jobWorkDates("2026-01-02T06:00:00Z","2026-01-02T10:00:00Z","America/Los_Angeles"),["2026-01-01","2026-01-02"]);
 assert.deepEqual(jobWorkDates("2026-03-08T05:00:00Z","2026-03-10T04:00:00Z","America/New_York"),["2026-03-08","2026-03-09"]);
 assert.deepEqual(jobWorkDates("2026-01-01T12:00:00Z",null,"UTC"),["2026-01-01","2026-01-02"]);
 assert.equal(jobDate("2026-01-02T01:00:00Z","America/Los_Angeles"),"2026-01-01");
});
