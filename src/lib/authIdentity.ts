import { normalizePhone } from "./phone";

export type AuthLogin =
  | { type: "email"; value: string }
  | { type: "phone"; value: string };

export function authLoginFromContact(email: string | null | undefined, phone: string | null | undefined): AuthLogin | null {
  const normalizedPhone = normalizePhone(phone);
  if (normalizedPhone) return { type: "phone", value: normalizedPhone };

  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (normalizedEmail) return { type: "email", value: normalizedEmail };
  return null;
}

export function authLoginFromInput(value: string): AuthLogin | null {
  const input = value.trim();
  if (!input) return null;
  if (input.includes("@")) return { type: "email", value: input.toLowerCase() };

  const phone = normalizePhone(input);
  return phone ? { type: "phone", value: phone } : null;
}

export function passwordAuthEmail(login: AuthLogin) {
  if (login.type === "email") return login.value;
  const digits = login.value.replace(/\D/g, "");
  return `phone-${digits}@accounts.localized.life`;
}

export function maskAuthLogin(login: AuthLogin | null) {
  if (!login) return null;
  if (login.type === "phone") {
    return `phone ending in ${login.value.slice(-4)}`;
  }

  const [local, domain] = login.value.split("@");
  if (!local || !domain) return "the email address already provided";
  return `${local.slice(0, 1)}•••@${domain}`;
}
