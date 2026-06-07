"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SaleMap, type MappedSale, type StartLocation } from "./SaleMap";
import type { SavedSale } from "./SaveSaleButton";

const key = "saletrail.savedSales";
const startKey = "saletrail.routeStart";

function readSaved(): SavedSale[] {
  try {
    return JSON.parse(window.localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function readStartLocation(): StartLocation | null {
  try {
    return JSON.parse(window.localStorage.getItem(startKey) || "null") as StartLocation | null;
  } catch {
    return null;
  }
}

function writeStartLocation(location: StartLocation | null) {
  if (location) {
    window.localStorage.setItem(startKey, JSON.stringify(location));
  } else {
    window.localStorage.removeItem(startKey);
  }
  window.dispatchEvent(new CustomEvent("saletrail:route-start"));
}

function mapsUrl(sales: SavedSale[], startLocation: StartLocation | null) {
  if (sales.length === 0) return "#";
  const destinations = sales.map((sale) => sale.address);
  const destination = destinations[destinations.length - 1];
  const waypoints = destinations.slice(0, -1).join("|");
  const params = new URLSearchParams({
    api: "1",
    travelmode: "driving",
    destination,
  });
  if (startLocation) params.set("origin", `${startLocation.latitude},${startLocation.longitude}`);
  if (waypoints) params.set("waypoints", waypoints);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function saveRoute(next: SavedSale[]) {
  window.localStorage.setItem(key, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("saletrail:saved", { detail: { source: "route" } }));
}

function distanceMiles(from: Pick<StartLocation, "latitude" | "longitude">, to: Pick<StartLocation, "latitude" | "longitude">) {
  const radius = 3958.8;
  const lat1 = (from.latitude * Math.PI) / 180;
  const lat2 = (to.latitude * Math.PI) / 180;
  const deltaLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const deltaLng = ((to.longitude - from.longitude) * Math.PI) / 180;
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function optimizeRouteFromStart(sales: SavedSale[], startLocation: StartLocation | null) {
  const stopsWithCoordinates = sales.filter(
    (sale) =>
      typeof sale.latitude === "number" &&
      typeof sale.longitude === "number" &&
      Number.isFinite(sale.latitude) &&
      Number.isFinite(sale.longitude),
  );
  const stopsWithoutCoordinates = sales.filter((sale) => !stopsWithCoordinates.includes(sale));
  if (stopsWithCoordinates.length < 2) return sales;

  const remaining = [...stopsWithCoordinates];
  const ordered: SavedSale[] = [];
  let current = startLocation
    ? { latitude: startLocation.latitude, longitude: startLocation.longitude }
    : { latitude: remaining[0].latitude || 0, longitude: remaining[0].longitude || 0 };

  while (remaining.length > 0) {
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (let index = 0; index < remaining.length; index += 1) {
      const sale = remaining[index];
      const distance = distanceMiles(current, { latitude: sale.latitude || 0, longitude: sale.longitude || 0 });
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    }

    const [nextSale] = remaining.splice(closestIndex, 1);
    ordered.push(nextSale);
    current = { latitude: nextSale.latitude || 0, longitude: nextSale.longitude || 0 };
  }

  return [...ordered, ...stopsWithoutCoordinates];
}

export function RoutePlanner({ allSales = [] }: { allSales?: MappedSale[] }) {
  const [sales, setSales] = useState<SavedSale[]>(() => {
    if (typeof window === "undefined") return [];
    return readSaved();
  });
  const [startLocation, setStartLocation] = useState<StartLocation | null>(() => {
    if (typeof window === "undefined") return null;
    return readStartLocation();
  });
  const [startStatus, setStartStatus] = useState("");
  const [findingStart, setFindingStart] = useState(false);
  const url = useMemo(() => mapsUrl(sales, startLocation), [sales, startLocation]);
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
  const routeCodes = useMemo(() => new Set(mappedSales.map((sale) => sale.slug.split("/").pop()?.split("-").filter(Boolean).at(-1) || sale.slug)), [mappedSales]);
  const mapSales = useMemo(() => {
    const combined: MappedSale[] = [...mappedSales];
    for (const sale of allSales) {
      const code = sale.slug.split("/").pop()?.split("-").filter(Boolean).at(-1) || sale.slug;
      if (!routeCodes.has(code) && !combined.some((item) => item.slug === sale.slug)) {
        combined.push(sale);
      }
    }
    return combined;
  }, [allSales, mappedSales, routeCodes]);
  const hasMappedStops = mapSales.some((sale) => sale.latitude !== null && sale.longitude !== null);
  const canOptimize = sales.filter((sale) => typeof sale.latitude === "number" && typeof sale.longitude === "number").length > 1;

  useEffect(() => {
    const update = () => setSales(readSaved());
    window.addEventListener("saletrail:saved", update);
    return () => window.removeEventListener("saletrail:saved", update);
  }, []);

  useEffect(() => {
    const update = () => setStartLocation(readStartLocation());
    window.addEventListener("saletrail:route-start", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("saletrail:route-start", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  function useCurrentLocationAsStart() {
    if (!("geolocation" in navigator)) {
      setStartStatus("Your browser does not support location sharing.");
      return;
    }

    setFindingStart(true);
    setStartStatus("Finding your starting point...");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = Number(position.coords.latitude.toFixed(6));
        const longitude = Number(position.coords.longitude.toFixed(6));
        let label = `Current location (${latitude}, ${longitude})`;

        try {
          const response = await fetch(`/api/reverse-geocode?lat=${encodeURIComponent(latitude)}&lng=${encodeURIComponent(longitude)}`);
          if (response.ok) {
            const data = (await response.json()) as { label?: string };
            if (data.label) label = data.label;
          }
        } catch {
          // The coordinates still work even if the friendly label cannot be found.
        }

        const next = { label, latitude, longitude };
        writeStartLocation(next);
        setStartLocation(next);
        setFindingStart(false);
        setStartStatus("Starting point set.");
      },
      () => {
        setFindingStart(false);
        setStartStatus("Location permission was not allowed.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  function clearStartLocation() {
    writeStartLocation(null);
    setStartLocation(null);
    setStartStatus("");
  }

  function optimizeRoute() {
    const next = optimizeRouteFromStart(sales, startLocation);
    saveRoute(next);
    setSales(next);
    setStartStatus(startLocation ? "Route reordered from your starting point." : "Route reordered by nearest next stop.");
  }

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
    window.dispatchEvent(new CustomEvent("saletrail:saved", { detail: { source: "route" } }));
    setSales([]);
  }

  return (
    <div className="stack">
      {hasMappedStops ? <SaleMap sales={mapSales} startLocation={startLocation} /> : null}
      {sales.length === 0 ? (
        <div className="empty">
          <h2>No saved sales yet</h2>
          <p>Use the map above or browse the directory to add stops to your route.</p>
          <Link className="button" href="/saletrail">
            Browse sales
          </Link>
        </div>
      ) : (
        <>
          <section className="card route-start-card">
            <div>
              <p className="eyebrow">Starting point</p>
              <h2>{startLocation ? startLocation.label : "Choose where your trail starts"}</h2>
              <p className="muted">
                Use your current location, then SaleTrail can reorder saved stops by the closest next sale.
              </p>
              {startStatus ? <p className="route-start-status">{startStatus}</p> : null}
            </div>
            <div className="route-start-actions">
              <button className="button ghost" type="button" onClick={useCurrentLocationAsStart} disabled={findingStart}>
                {findingStart ? "Finding..." : startLocation ? "Update start" : "Use my location"}
              </button>
              {startLocation ? (
                <button className="button ghost" type="button" onClick={clearStartLocation}>
                  Clear start
                </button>
              ) : null}
              <button className="button primary" type="button" onClick={optimizeRoute} disabled={!canOptimize}>
                Build best trail
              </button>
            </div>
          </section>
          <div className="toolbar">
            <a className="button primary" href={url} target="_blank" rel="noreferrer">
              Open in Google Maps
            </a>
            <button className="button ghost" type="button" onClick={clear}>
              Clear route
            </button>
          </div>
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
