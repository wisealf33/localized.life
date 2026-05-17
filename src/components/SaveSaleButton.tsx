"use client";

import { useState } from "react";

export type SavedSale = {
  slug: string;
  title: string;
  address: string;
  startsAt: string;
  href?: string;
  latitude?: number | null;
  longitude?: number | null;
};

const key = "saletrail.savedSales";

function readSaved(): SavedSale[] {
  try {
    return JSON.parse(window.localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

export function SaveSaleButton({ sale }: { sale: SavedSale }) {
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
    <button className="button primary" type="button" onClick={toggle}>
      {saved ? "Saved to route" : "Save to route"}
    </button>
  );
}
