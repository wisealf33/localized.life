"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hashSecret } from "./tokens";

const adminCookie = "saletrail_admin";
const adminCookiePath = "/";

function expectedAdminSession() {
  const password = process.env.SALETRAIL_ADMIN_PASSWORD;
  if (!password) return null;
  return hashSecret(`saletrail-admin:${password}`);
}

function safeMemberRedirect(value: FormDataEntryValue | null, fallback: string) {
  const path = typeof value === "string" ? value : "";
  if (path === "/members/dashboard" || path === "/members/login" || path === "/saletrail/admin") {
    return path;
  }
  return fallback;
}

export async function isAdminAuthenticated() {
  const expected = expectedAdminSession();
  if (!expected) return false;
  const cookieStore = await cookies();
  return cookieStore.get(adminCookie)?.value === expected;
}

export async function requireAdmin() {
  if (!(await isAdminAuthenticated())) {
    redirect("/saletrail/admin?auth=expired");
  }
}

export async function adminLogin(formData: FormData) {
  const password = process.env.SALETRAIL_ADMIN_PASSWORD;
  const submitted = String(formData.get("admin_password") || "");
  if (!password || submitted !== password) {
    throw new Error("Admin password is incorrect.");
  }

  const cookieStore = await cookies();
  cookieStore.set(adminCookie, expectedAdminSession() || "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: adminCookiePath,
  });

  redirect(safeMemberRedirect(formData.get("redirect_to"), "/saletrail/admin"));
}

export async function adminLogout(formData?: FormData) {
  const cookieStore = await cookies();
  cookieStore.set(adminCookie, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: adminCookiePath,
    expires: new Date(0),
  });
  cookieStore.set(adminCookie, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/saletrail/admin",
    expires: new Date(0),
  });
  redirect(safeMemberRedirect(formData?.get("redirect_to") || null, "/saletrail/admin"));
}
