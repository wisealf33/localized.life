"use client";

import { useMemo, useState } from "react";
import type { SavedSale } from "./SaveSaleButton";

const key = "saletrail.savedSales";

function readSaved(): SavedSale[] {
  try {
    return JSON.parse(window.localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function writeSaved(sales: SavedSale[]) {
  window.localStorage.setItem(key, JSON.stringify(sales));
  window.dispatchEvent(new Event("saletrail:saved"));
}

export function EventRouteSelector({ sales }: { sales: SavedSale[] }) {
  const [selected, setSelected] = useState(() => new Set(sales.map((sale) => sale.slug)));
  const selectedCount = selected.size;
  const selectedSales = useMemo(() => sales.filter((sale) => selected.has(sale.slug)), [sales, selected]);

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
          <label className="event-stop-check" key={sale.slug}>
            <input checked={selected.has(sale.slug)} type="checkbox" onChange={() => toggle(sale.slug)} />
            <span>
              <strong>{sale.title}</strong>
              <small>{sale.address}</small>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
