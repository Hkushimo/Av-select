import assert from "node:assert/strict";
import test from "node:test";
import {calculateInvoiceDays,validateWorkPeriods,shiftHours} from "../lib/invoicing.ts";

const regular=(time_in,time_out)=>({time_in,time_out,hours:shiftHours(time_in,time_out),pay_type:"standard"});
const flat=(time_in,time_out)=>({time_in,time_out,hours:shiftHours(time_in,time_out),pay_type:"return_flat"});
const date="2026-10-29";
const split=[{date,hours:13,lunch_taken:false,shifts:[regular("10:00","18:00"),flat("21:00","02:00")]}];

test("day-rate split shift: $400 guaranteed plus approved $240 return call = $640",()=>{
 assert.equal(validateWorkPeriods(split,240),null);
 const amount=calculateInvoiceDays("day",400,split,true,240);
 assert.equal(amount.total,640);
 assert.equal(amount.hours,13);
 assert.equal(amount.charges[0].regular,400);
 assert.equal(amount.charges[0].overtime,0);
 assert.equal(amount.charges[0].flatReturnAmount,240);
 assert.equal(amount.charges[0].flatReturnHours,5);
});

test("normal split shifts share the overtime threshold and do not include off-clock gap",()=>{
 const shifts=[{...split[0],shifts:[regular("10:00","18:00"),regular("21:00","02:00")]}];
 assert.equal(validateWorkPeriods(shifts,null),null);
 const amount=calculateInvoiceDays("day",400,shifts);
 assert.equal(amount.hours,13);
 assert.equal(amount.charges[0].otHours,3);
 assert.equal(amount.total,580);
});

test("hourly overtime remains applicable across non-flat periods",()=>{
 const shifts=[{...split[0],shifts:[regular("10:00","18:00"),regular("21:00","02:00")]}];
 assert.equal(calculateInvoiceDays("hourly",50,shifts).total,725);
 assert.equal(calculateInvoiceDays("hourly",50,split,true,240).total,640);
});

test("lunch is only subtracted when explicitly marked and actual work exceeds ten hours",()=>{
 const withLunch=[{...split[0],lunch_taken:true}];
 assert.equal(calculateInvoiceDays("day",400,withLunch,true,240).hours,12);
 assert.equal(calculateInvoiceDays("day",400,withLunch,true,240).total,640);
});

test("detect overlap, forged hours and more than one approved flat return call",()=>{
 assert.match(validateWorkPeriods([{date,hours:14,shifts:[regular("10:00","18:00"),regular("17:00","23:00")]}],null),/overlap/);
 assert.match(validateWorkPeriods([{date,hours:14,shifts:[regular("10:00","18:00"),regular("21:00","02:00")]}],null),/match/);
 assert.match(validateWorkPeriods(split,null),/approve/);
 assert.match(validateWorkPeriods([{date,hours:18,shifts:[regular("10:00","18:00"),flat("19:00","00:00"),flat("00:00","05:00")]}],240),/one flat/);
});

test("single-period historical invoice math is unchanged",()=>{
 assert.equal(calculateInvoiceDays("day",600,[{date,hours:12}]).total,780);
 assert.equal(calculateInvoiceDays("hourly",50,[{date,hours:12}]).total,650);
});
