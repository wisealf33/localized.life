"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { SavedSale } from "./SaveSaleButton";

const key = "saletrail.savedSales";

function readSaved(): SavedSale[] {
  try {
    return JSON.parse(window.localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function mapsUrl(sales: SavedSale[]) {
  if (sales.length === 0) return "#";
  const destinations = sales.map((sale) => sale.address);
  const destination = destinations[destinations.length - 1];
  const waypoints = destinations.slice(0, -1).join("|");
  const params = new URLSearchParams({
    api: "1",
    travelmode: "driving",
    destination,
  });
  if (waypoints) params.set("waypoints", waypoints);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function RoutePlanner() {
  const [sales, setSales] = useState<SavedSale[]>(() => {
    if (typeof window === "undefined") return [];
    return readSaved();
  });
  const url = useMemo(() => mapsUrl(sales), [sales]);

  useEffect(() => {
    const update = () => setSales(readSaved());
    window.addEventListener("saletrail:saved", update);
    return () => window.removeEventListener("saletrail:saved", update);
  }, []);

  function remove(slug: string) {
    const next = sales.filter((sale) => sale.slug !== slug);
    window.localStorage.setItem(key, JSON.stringify(next));
    setSales(next);
  }

  function clear() {
    window.localStorage.removeItem(key);
    setSales([]);
  }

  return (
    <div className="stack">
      {sales.length === 0 ? (
        <div className="empty">
          <h2>No saved sales yet</h2>
          <p>Save listings while browsing, then come back here to open your route in Google Maps.</p>
          <Link className="button" href="/saletrail">
            Browse sales
          </Link>
        </div>
      ) : (
        <>
          <div className="toolbar">
            <a className="button primary" href={url} target="_blank" rel="noreferrer">
              Open in Google Maps
            </a>
            <button className="button ghost" type="button" onClick={clear}>
              Clear route
            </button>
          </div>
          <div className="list">
            {sales.map((sale, index) => (
              <article className="card compact" key={sale.slug}>
                <div>
                  <p className="eyebrow">Stop {index + 1}</p>
                  <h2>{sale.title}</h2>
                  <p>{sale.address}</p>
                </div>
                <button className="button ghost" type="button" onClick={() => remove(sale.slug)}>
                  Remove
                </button>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
