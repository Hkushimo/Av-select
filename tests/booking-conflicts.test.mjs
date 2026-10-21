import assert from "node:assert/strict";
import test from "node:test";
import {bookingWindowsOverlap} from "../lib/booking-conflicts.ts";
const job=(start,end)=>({starts_at:start,ends_at:end});
test("overlapping bookings conflict",()=>{
 assert.equal(bookingWindowsOverlap(
  job("2026-11-01T09:00:00Z","2026-11-01T17:00:00Z"),
  job("2026-11-01T15:00:00Z","2026-11-01T21:00:00Z")),true);
});
test("back to back bookings are allowed",()=>{
 assert.equal(bookingWindowsOverlap(
  job("2026-11-01T09:00:00Z","2026-11-01T17:00:00Z"),
  job("2026-11-01T17:00:00Z","2026-11-01T22:00:00Z")),false);
});
test("overnight overlap is detected",()=>{
 assert.equal(bookingWindowsOverlap(
  job("2026-11-01T22:00:00Z","2026-11-02T06:00:00Z"),
  job("2026-11-02T05:00:00Z","2026-11-02T12:00:00Z")),true);
});
test("missing end time reserves a 24 hour booking",()=>{
 assert.equal(bookingWindowsOverlap(
  job("2026-11-01T09:00:00Z",null),
  job("2026-11-02T08:59:00Z","2026-11-02T10:00:00Z")),true);
 assert.equal(bookingWindowsOverlap(
  job("2026-11-01T09:00:00Z",null),
  job("2026-11-02T09:00:00Z","2026-11-02T10:00:00Z")),false);
});
test("invalid or zero-length windows are not previewed",()=>{
 assert.equal(bookingWindowsOverlap(
  job("bad","2026-11-01T12:00:00Z"),
  job("2026-11-01T09:00:00Z","2026-11-01T12:00:00Z")),false);
 assert.equal(bookingWindowsOverlap(
  job("2026-11-01T09:00:00Z","2026-11-01T09:00:00Z"),
  job("2026-11-01T09:00:00Z","2026-11-01T12:00:00Z")),false);
});
