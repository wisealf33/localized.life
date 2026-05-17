"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SaleMap } from "./SaleMap";
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

function saveRoute(next: SavedSale[]) {
  window.localStorage.setItem(key, JSON.stringify(next));
  window.dispatchEvent(new Event("saletrail:saved"));
}

export function RoutePlanner() {
  const [sales, setSales] = useState<SavedSale[]>(() => {
    if (typeof window === "undefined") return [];
    return readSaved();
  });
  const url = useMemo(() => mapsUrl(sales), [sales]);
  const mappedSales = useMemo(
    () =>
      sales.map((sale) => ({
        slug: sale.slug,
        title: sale.title,
        address: sale.address,
        city: sale.city,
        state: sale.state,
        startsAt: sale.startsAt,
        href: sale.href || `/saletrail/sale/${sale.slug}`,
        latitude: sale.latitude ?? null,
        longitude: sale.longitude ?? null,
        locationPrecision: sale.locationPrecision ?? null,
      })),
    [sales],
  );
  const hasMappedStops = mappedSales.some((sale) => sale.latitude !== null && sale.longitude !== null);

  useEffect(() => {
    const update = () => setSales(readSaved());
    window.addEventListener("saletrail:saved", update);
    return () => window.removeEventListener("saletrail:saved", update);
  }, []);

  function remove(slug: string) {
    const next = sales.filter((sale) => sale.slug !== slug);
    saveRoute(next);
    setSales(next);
  }

  function moveStop(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= sales.length) return;
    const next = [...sales];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    saveRoute(next);
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
          {hasMappedStops ? <SaleMap sales={mappedSales} /> : null}
          <div className="route-list">
            {sales.map((sale, index) => (
              <article className="card route-stop" key={sale.slug}>
                <div>
                  <p className="eyebrow">Stop {index + 1}</p>
                  <h2>{sale.title}</h2>
                  <p>{sale.address}</p>
                </div>
                <div className="route-stop-actions" aria-label={`Reorder ${sale.title}`}>
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() => moveStop(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move ${sale.title} up`}
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() => moveStop(index, 1)}
                    disabled={index === sales.length - 1}
                    aria-label={`Move ${sale.title} down`}
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button className="button ghost compact-button" type="button" onClick={() => remove(sale.slug)}>
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
