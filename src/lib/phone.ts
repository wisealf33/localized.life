const nonDigits = /[^0-9]/g;

export function normalizePhone(value: string | null | undefined) {
  const digits = String(value || "").replace(nonDigits, "");
  if (!digits) return null;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return null;
}

export function formatPersonNumber(value: number | string | null | undefined) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1) return null;
  return `PN-${String(number).padStart(8, "0")}`;
}

export function formatReferralNumber(
  type: "sponsored" | "assigned",
  value: number | string | null | undefined,
) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1) return null;
  return `${type === "assigned" ? "AR" : "SR"}-${String(number).padStart(8, "0")}`;
}
