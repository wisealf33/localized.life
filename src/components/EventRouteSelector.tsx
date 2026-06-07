"use client";

import { useEffect, useMemo, useState } from "react";
import type { SavedSale } from "./SaveSaleButton";

const key = "saletrail.savedSales";
const notInterestedKey = "saletrail.notInterestedSales";

function readSaved(): SavedSale[] {
  try {
    return JSON.parse(window.localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function writeSaved(sales: SavedSale[]) {
  window.localStorage.setItem(key, JSON.stringify(sales));
  window.dispatchEvent(new CustomEvent("saletrail:saved", { detail: { source: "route" } }));
}

function readNotInterestedCodes() {
  try {
    return new Set(JSON.parse(window.localStorage.getItem(notInterestedKey) || "[]") as string[]);
  } catch {
    return new Set<string>();
  }
}

function listingCode(slug: string) {
  return slug.split("/").pop()?.split("-").filter(Boolean).at(-1) || slug;
}

function selectedFromSavedSales(sales: SavedSale[]) {
  const savedCodes = new Set(readSaved().map((sale) => listingCode(sale.slug)));
  return new Set(sales.filter((sale) => savedCodes.has(listingCode(sale.slug))).map((sale) => sale.slug));
}

function defaultSelectedSales(sales: SavedSale[]) {
  const savedSelected = selectedFromSavedSales(sales);
  if (savedSelected.size > 0) return savedSelected;

  const ignoredCodes = readNotInterestedCodes();
  return new Set(sales.filter((sale) => !ignoredCodes.has(listingCode(sale.slug))).map((sale) => sale.slug));
}

export function EventRouteSelector({ sales }: { sales: SavedSale[] }) {
  const [selected, setSelected] = useState(() => defaultSelectedSales(sales));
  const selectedCount = selected.size;
  const selectedSales = useMemo(() => sales.filter((sale) => selected.has(sale.slug)), [sales, selected]);

  useEffect(() => {
    function syncSelection(event: Event) {
      const source = event instanceof CustomEvent ? event.detail?.source : null;
      const savedSelected = selectedFromSavedSales(sales);

      if (source === "route") {
        setSelected(savedSelected);
        return;
      }

      if (savedSelected.size > 0) {
        setSelected(savedSelected);
        return;
      }

      const ignoredCodes = readNotInterestedCodes();
      setSelected((current) => {
        const next = new Set(current);
        for (const sale of sales) {
          if (ignoredCodes.has(listingCode(sale.slug))) next.delete(sale.slug);
        }
        return next;
      });
    }

    window.addEventListener("saletrail:saved", syncSelection);
    window.addEventListener("storage", syncSelection);
    return () => {
      window.removeEventListener("saletrail:saved", syncSelection);
      window.removeEventListener("storage", syncSelection);
    };
  }, [sales]);

  function toggle(slug: string) {
    const next = new Set(selected);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    setSelected(next);
  }

  function addSelected() {
    const current = readSaved();
    const currentSlugs = new Set(current.map((sale) => sale.slug));
    const next = [...current];
    for (const sale of selectedSales) {
      if (!currentSlugs.has(sale.slug)) next.push(sale);
    }
    writeSaved(next);
  }

  if (sales.length === 0) return null;

  return (
    <div className="event-route-selector">
      <div className="card-top">
        <div>
          <h2>Build your route from this event</h2>
          <p className="muted">Uncheck any stops you want to skip, then add the rest to My Route.</p>
        </div>
        <button className="button primary" type="button" onClick={addSelected} disabled={selectedCount === 0}>
          Add {selectedCount} selected stop{selectedCount === 1 ? "" : "s"} to route
        </button>
      </div>
      <div className="event-stop-list">
        {sales.map((sale) => (
          <div className="event-stop-check" key={sale.slug}>
            <input
              aria-label={`Include ${sale.title} in my route`}
              checked={selected.has(sale.slug)}
              type="checkbox"
              onChange={() => toggle(sale.slug)}
            />
            <span>
              <a href={sale.href}>
                <strong>{sale.title}</strong>
              </a>
              <a href={sale.href}>
                <small>{sale.address}</small>
              </a>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
