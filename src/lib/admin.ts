"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hashSecret } from "./tokens";

const adminCookie = "saletrail_admin";

function expectedAdminSession() {
  const password = process.env.SALETRAIL_ADMIN_PASSWORD;
  if (!password) return null;
  return hashSecret(`saletrail-admin:${password}`);
}

export async function isAdminAuthenticated() {
  const expected = expectedAdminSession();
  if (!expected) return false;
  const cookieStore = await cookies();
  return cookieStore.get(adminCookie)?.value === expected;
}

export async function requireAdmin() {
  if (!(await isAdminAuthenticated())) {
    throw new Error("Admin password is required.");
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
    path: "/saletrail/admin",
  });

  redirect("/saletrail/admin");
}

export async function adminLogout() {
  const cookieStore = await cookies();
  cookieStore.delete(adminCookie);
  redirect("/saletrail/admin");
}
