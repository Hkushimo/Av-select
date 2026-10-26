import assert from "node:assert/strict";
import {readFile,readdir} from "node:fs/promises";
import {test} from "node:test";
import {PGlite} from "@electric-sql/pglite";

test("database migrations enforce venue dates and frozen pay terms",async t=>{
 const db=new PGlite();
 try {
  await db.exec(`set time zone 'UTC'; create role authenticated; create role anon;
   create schema auth; create table auth.users(id uuid primary key);
   create function auth.uid() returns uuid language sql stable as
   $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;`);
  const dir=new URL("../supabase/migrations/",import.meta.url);
  for(const file of (await readdir(dir)).sort()){
   // Storage objects belong to Supabase, not the scheduling/billing schema.
   if(file.startsWith("003")||file.startsWith("018"))continue;
   await db.exec(await readFile(new URL(file,dir),"utf8"));
  }
  const tech="00000000-0000-0000-0000-000000000001";
  await db.exec(`insert into auth.users values ('${tech}');
   insert into public.profiles(id,email,role) values ('${tech}','tech@example.test','technician');
   insert into public.technicians(user_id,full_name) values ('${tech}','Test Tech');
   select set_config('request.jwt.claim.sub','${tech}',false);`);
  const legacy=(await db.query(`insert into jobs(title,starts_at,ends_at,rate,rate_basis,status)
   values ('Legacy','2020-01-01T09:00Z','2020-01-01T17:00Z','$500/day','day','open') returning id`)).rows[0].id;
  const oldOffer=(await db.query(`insert into job_offers(job_id,technician_id) values ($1,$2) returning id`,[legacy,tech])).rows[0].id;
  await db.exec(await readFile(new URL("018_job_time_and_pay_terms.sql",dir),"utf8"));
  const makeJob=async(overrides={})=>{
   const j={start:"2020-01-02T01:00:00Z",end:"2020-01-02T08:00:00Z",zone:"America/Los_Angeles",basis:"hourly",...overrides};
   return (await db.query(`insert into jobs(title,starts_at,ends_at,time_zone,rate_basis,status)
    values ('Test',$1,$2,$3,$4,'open') returning id`,[j.start,j.end,j.zone,j.basis])).rows[0].id;
  };
  const makeOffer=async(job,rate="$50/hr")=>(await db.query(`insert into job_offers(job_id,technician_id,offer_rate,agreed_basis,agreed_amount)
   values ($1,$2,$3,'day',1) returning *`,[job,tech,rate])).rows[0];
  const invoice=async(offer,days,extra={})=>{
   const payload={offer_id:offer,technician_id:tech,from_name:"Untrusted",bill_to:"Client",job_title:"Untrusted",job_starts_at:"2000-01-01",hours:1,hourly_rate:1,billing_basis:"hourly",work_days:days,due_on:"2099-01-01",...extra};
   const keys=Object.keys(payload);
   return (await db.query(`insert into technician_invoices(${keys.join(",")}) values (${keys.map((_,i)=>`$${i+1}`).join(",")}) returning *`,Object.values(payload).map(x=>Array.isArray(x)?JSON.stringify(x):x))).rows[0];
  };
  const day=(date="2020-01-01",time_in="09:00",time_out="17:00",hours=8)=>({date,time_in,time_out,hours});

  await t.test("legacy instants survive and pay terms are backfilled",async()=>{
   const j=(await db.query("select * from jobs where id=$1",[legacy])).rows[0];
   assert.equal(j.time_zone,null);
   assert.equal(new Date(j.starts_at).toISOString(),"2020-01-01T09:00:00.000Z");
   const o=(await db.query("select * from job_offers where id=$1",[oldOffer])).rows[0];
   assert.equal(o.agreed_basis,"day");assert.equal(Number(o.agreed_amount),500);assert.equal(o.offer_rate,"$500/day");
  });
  await t.test("jobs require valid zones and ordered times",async()=>{
   await assert.rejects(()=>makeJob({zone:null}),/venue time zone/);
   await assert.rejects(()=>makeJob({zone:"Not/AZone"}),/valid venue time zone/);
   await assert.rejects(()=>makeJob({end:"2020-01-01T00:00Z"}),/End time/);
  });
  const job=await makeJob(),offer=await makeOffer(job);
  await t.test("caller cannot forge or mutate frozen offer terms",async()=>{
   assert.equal(offer.agreed_basis,"hourly");assert.equal(Number(offer.agreed_amount),50);
   await assert.rejects(()=>db.query("update job_offers set agreed_amount=1 where id=$1",[offer.id]),/terms are fixed/);
   await assert.rejects(()=>db.query("update job_offers set offer_rate='$1\/hr' where id=$1",[offer.id]),/terms are fixed/);
   await assert.rejects(()=>db.query("update jobs set rate_basis='day' where id=$1",[job]),/Release all active/);
   await db.query("update jobs set rate='$999\/hr' where id=$1",[job]);
   await db.query("update job_offers set status='confirmed' where id=$1",[offer.id]);
  });
  await t.test("invoice rejects out-of-range dates, midnight-end extra day and bad due date",async()=>{
   for(const date of ["2019-12-31","2020-01-02","2099-01-01"])
    await assert.rejects(()=>invoice(offer.id,[day(date)]),/within the job dates/);
   await assert.rejects(()=>invoice(offer.id,[day()],{due_on:"2000-01-01"}),/Due date/);
   await assert.rejects(()=>invoice(offer.id,[day(),day()]),/unique/);
   await assert.rejects(()=>invoice(offer.id,[day("2020-01-01","09:00","17:00",99)]),/do not match/);
  });
  await t.test("valid invoice uses frozen rate and venue snapshot",async()=>{
   const i=await invoice(offer.id,[day()],{issued_on:"1900-01-01",job_time_zone:"UTC",agreed_rate:1,billed_total:1});
   assert.equal(Number(i.billed_total),400);assert.equal(Number(i.agreed_rate),50);
   assert.equal(i.job_time_zone,"America/Los_Angeles");assert.equal(i.from_name,"Test Tech");
   assert.notEqual(i.issued_on,"1900-01-01");
   await assert.rejects(()=>invoice(offer.id,[day()]),/unique constraint/);
  });
  await t.test("legacy zone must be confirmed before invoicing",async()=>{
   await db.query("update job_offers set status='confirmed' where id=$1",[oldOffer]);
   await assert.rejects(()=>invoice(oldOffer,[day()],{billing_basis:"day"}),/confirm the venue time zone/);
   await db.query("update jobs set time_zone='UTC' where id=$1",[legacy]);
   const i=await invoice(oldOffer,[day()],{billing_basis:"day"});assert.equal(Number(i.billed_total),500);
  });
  await t.test("cancelled offers cannot be revived with obsolete terms",async()=>{
   const j=await makeJob({start:"2020-02-01T09:00Z",end:"2020-02-01T17:00Z"}),o=await makeOffer(j);
   await db.query("update job_offers set status='cancelled' where id=$1",[o.id]);
   await db.query("update jobs set rate_basis='day' where id=$1",[j]);
   await assert.rejects(()=>db.query("update job_offers set status='pending' where id=$1",[o.id]),/reissue cancelled/);
   await db.query("delete from job_offers where id=$1",[o.id]);
   await assert.rejects(()=>makeOffer(j,"$50/hr"),/valid agreed/);
   await assert.rejects(()=>makeOffer(j,"$1,2/day"),/valid agreed/);
   await makeOffer(j,"$500/day");
  });
  await t.test("overnight work and hourly overtime remain supported",async()=>{
   const j=await makeJob({start:"2020-03-01T22:00Z",end:"2020-03-02T10:00Z",zone:"UTC"}),o=await makeOffer(j);
   await db.query("update job_offers set status='confirmed' where id=$1",[o.id]);
   const i=await invoice(o.id,[day("2020-03-01","22:00","10:00",12)]);
   assert.equal(Number(i.billed_total),650);
  });
  await t.test("day rate lunch and overtime use the frozen agreement",async()=>{
   const j=await makeJob({start:"2020-04-01T00:00Z",end:"2020-04-02T00:00Z",zone:"UTC",basis:"day"}),o=await makeOffer(j,"$500/day");
   await db.query("update job_offers set status='confirmed' where id=$1",[o.id]);
   const i=await invoice(o.id,[{...day("2020-04-01","08:00","20:00",12),lunch_taken:true}],{billing_basis:"day"});
   assert.equal(Number(i.billed_total),575);
  });
  await t.test("future clock-out is rejected even on an allowed work date",async()=>{
   const {date,start,end}=(await db.query(`select current_date::text as date,
    (current_date-interval '1 day')::timestamptz::text as start,
    (now()-interval '1 second')::text as end`)).rows[0];
   const j=await makeJob({start,end,zone:"UTC"}),o=await makeOffer(j);
   await db.query("update job_offers set status='confirmed' where id=$1",[o.id]);
   await assert.rejects(()=>invoice(o.id,[day(date,"23:00","01:00",2)]),/has not finished|within the job dates/);
  });
  await t.test("other technicians cannot invoice someone else's booking",async()=>{
   await db.exec("select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000099',false)");
   await assert.rejects(()=>invoice(offer.id,[day()]),/owned by you/);
  });
 } finally {await db.close();}
});
