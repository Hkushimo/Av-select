/** All job dates use the venue's IANA zone, never the server/device default. */
export function jobDate(instant: string | Date, zone: string | null): string {
 const parts = new Intl.DateTimeFormat("en-US", {timeZone: zone || "UTC", year:"numeric", month:"2-digit", day:"2-digit"}).formatToParts(new Date(instant));
 const value = (type: string) => parts.find(p => p.type === type)!.value;
 return `${value("year")}-${value("month")}-${value("day")}`;
}
export function jobDateTimeInput(instant: string, zone: string): string {
 const time = new Intl.DateTimeFormat("en-GB", {timeZone:zone, hour:"2-digit", minute:"2-digit", hourCycle:"h23"}).format(new Date(instant));
 return `${jobDate(instant, zone)}T${time}`;
}
export function formatJobTime(instant: string, zone: string | null): string {
 return new Intl.DateTimeFormat("en-US", {timeZone:zone || "UTC", year:"numeric", month:"short", day:"numeric", hour:"numeric", minute:"2-digit", timeZoneName:"short"}).format(new Date(instant));
}
export function zoneLabel(zone: string | null): string {
 return zone || "UTC · venue time zone needs confirmation";
}
/** Reject missing and repeated DST clock times instead of silently moving a call. */
export function jobTimeToIso(local: string, zone: string): string {
 if (!zone) throw new Error("Choose the venue time zone.");
 if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) throw new Error("Enter a valid date and time.");
 const nominal = Date.parse(local + ":00Z");
 if (!Number.isFinite(nominal) || new Date(nominal).toISOString().slice(0,16) !== local) throw new Error("Enter a valid date and time.");
 const offsets = new Set<number>();
 for (const hours of [-36, -12, 0, 12, 36]) {
  const sample = nominal + hours * 3600000;
  offsets.add(Date.parse(jobDateTimeInput(new Date(sample).toISOString(), zone) + ":00Z") - sample);
 }
 const matches = [...offsets].map(offset => new Date(nominal - offset).toISOString()).filter(iso => jobDateTimeInput(iso, zone) === local);
 if (matches.length !== 1) throw new Error(matches.length ? "This time occurs twice during a daylight-saving change. Choose an unambiguous call time." : "This time does not exist during a daylight-saving change. Choose another time.");
 return matches[0];
}
export function jobWorkDates(startsAt: string, endsAt: string | null, zone: string): string[] {
 const start = Date.parse(startsAt), end = endsAt ? Date.parse(endsAt) : start + 86400000;
 if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];
 const first = jobDate(new Date(start), zone), last = jobDate(new Date(end - 1), zone);
 const days: string[] = [];
 for (let cursor = Date.parse(first + "T12:00:00Z"); days.length < 366; cursor += 86400000) {
  const day = new Date(cursor).toISOString().slice(0,10);
  if (day > last) break;
  days.push(day);
 }
 return days;
}
