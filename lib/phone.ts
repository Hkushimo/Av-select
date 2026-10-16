/** Format US/Canadian numbers without altering other international numbers. */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";

  const hasCountryCode = digits.length === 11 && digits.startsWith("1");
  if (digits.length > 10 && !hasCountryCode) return value;

  const national = hasCountryCode ? digits.slice(1) : digits;
  let formatted: string;
  if (national.length <= 3) {
    formatted = national;
  } else if (national.length <= 6) {
    formatted = `(${national.slice(0, 3)}) ${national.slice(3)}`;
  } else {
    formatted = `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6, 10)}`;
  }
  return hasCountryCode ? `+1 ${formatted}` : formatted;
}
