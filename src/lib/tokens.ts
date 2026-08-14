import crypto from "crypto";

export function randomToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function hashSecret(secret: string) {
  return crypto.createHash("sha256").update(secret).digest("hex");
}

export function invitationToken() {
  return crypto.randomUUID();
}

export function claimCode() {
  return crypto.randomBytes(3).toString("hex").toUpperCase();
}

export function slugifyTitle(title: string) {
  const clean = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);

  return `${clean || "sale"}-${crypto.randomBytes(3).toString("hex")}`;
}
