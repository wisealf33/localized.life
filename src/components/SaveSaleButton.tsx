"use client";

import { useEffect, useState } from "react";

export type SavedSale = {
  slug: string;
  title: string;
  address: string;
  city?: string;
  state?: string;
  startsAt: string;
  href?: string;
  latitude?: number | null;
  longitude?: number | null;
  locationPrecision?: "address" | "area" | null;
};

const key = "saletrail.savedSales";

function readSaved(): SavedSale[] {
  try {
    return JSON.parse(window.localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function listingCode(slug: string) {
  return slug.split("/").pop()?.split("-").filter(Boolean).at(-1) || slug;
}

function sameSavedSale(left: SavedSale, right: SavedSale) {
  return left.slug === right.slug || listingCode(left.slug) === listingCode(right.slug);
}

function refreshSavedCopy(sale: SavedSale) {
  const current = readSaved();
  const index = current.findIndex((item) => sameSavedSale(item, sale));
  if (index === -1) return false;

  const next = [...current];
  next[index] = { ...next[index], ...sale };
  window.localStorage.setItem(key, JSON.stringify(next));
  window.dispatchEvent(new Event("saletrail:saved"));
  return true;
}

export function SaveSaleButton({ sale, variant = "primary" }: { sale: SavedSale; variant?: "primary" | "secondary" }) {
  const [saved, setSaved] = useState(() => {
    if (typeof window === "undefined") return false;
    return readSaved().some((item) => sameSavedSale(item, sale));
  });

  useEffect(() => {
    refreshSavedCopy(sale);
  }, [sale]);

  function toggle() {
    const current = readSaved();
    const next = saved ? current.filter((item) => !sameSavedSale(item, sale)) : [...current, sale];
    window.localStorage.setItem(key, JSON.stringify(next));
    setSaved(!saved);
    window.dispatchEvent(new Event("saletrail:saved"));
  }

  return (
    <button className={variant === "primary" ? "button primary" : "button"} type="button" onClick={toggle}>
      {saved ? "Saved to route" : "Add to route"}
    </button>
  );
}
