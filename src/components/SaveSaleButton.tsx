"use client";

import { useState } from "react";

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

export function SaveSaleButton({ sale, variant = "primary" }: { sale: SavedSale; variant?: "primary" | "secondary" }) {
  const [saved, setSaved] = useState(() => {
    if (typeof window === "undefined") return false;
    return readSaved().some((item) => item.slug === sale.slug);
  });

  function toggle() {
    const current = readSaved();
    const next = saved ? current.filter((item) => item.slug !== sale.slug) : [...current, sale];
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
