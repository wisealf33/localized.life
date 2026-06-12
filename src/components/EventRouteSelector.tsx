"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { SavedSale } from "./SaveSaleButton";

const key = "saletrail.savedSales";
const notInterestedKey = "saletrail.notInterestedSales";

type RouteStartLocation = {
  label: string;
  latitude: number;
  longitude: number;
};

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
  return new Set(sales.map((sale) => sale.slug));
}

function hasCoordinates(sale: SavedSale) {
  return (
    typeof sale.latitude === "number" &&
    typeof sale.longitude === "number" &&
    Number.isFinite(sale.latitude) &&
    Number.isFinite(sale.longitude)
  );
}

function distanceInMiles(from: RouteStartLocation, to: SavedSale) {
  if (!hasCoordinates(to)) return Number.POSITIVE_INFINITY;
  const radius = 3958.8;
  const lat1 = (from.latitude * Math.PI) / 180;
  const lat2 = ((to.latitude || 0) * Math.PI) / 180;
  const deltaLat = (((to.latitude || 0) - from.latitude) * Math.PI) / 180;
  const deltaLng = (((to.longitude || 0) - from.longitude) * Math.PI) / 180;
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return radius * c;
}

export function EventRouteSelector({ sales }: { sales: SavedSale[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState(() => defaultSelectedSales(sales));
  const [orderedSlugs, setOrderedSlugs] = useState(() => sales.map((sale) => sale.slug));
  const [startSlug, setStartSlug] = useState(() => sales.find(hasCoordinates)?.slug || sales[0]?.slug || "");
  const [startLocation, setStartLocation] = useState<RouteStartLocation | null>(null);
  const [routeNote, setRouteNote] = useState("");
  const selectedCount = selected.size;
  const allSelected = selectedCount === sales.length;
  const noneSelected = selectedCount === 0;
  const salesBySlug = useMemo(() => new Map(sales.map((sale) => [sale.slug, sale])), [sales]);
  const orderedSales = useMemo(() => {
    const seen = new Set<string>();
    const ordered = orderedSlugs
      .map((slug) => salesBySlug.get(slug))
      .filter((sale): sale is SavedSale => {
        if (!sale || seen.has(sale.slug)) return false;
        seen.add(sale.slug);
        return true;
      });
    for (const sale of sales) {
      if (!seen.has(sale.slug)) ordered.push(sale);
    }
    return ordered;
  }, [orderedSlugs, sales, salesBySlug]);
  const selectedSales = useMemo(() => orderedSales.filter((sale) => selected.has(sale.slug)), [orderedSales, selected]);
  const startOptions = useMemo(() => selectedSales.filter(hasCoordinates), [selectedSales]);
  const activeStartSlug =
    startSlug && selected.has(startSlug) && salesBySlug.has(startSlug)
      ? startSlug
      : startOptions[0]?.slug || sales.find(hasCoordinates)?.slug || sales[0]?.slug || "";

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
    const wasSelected = next.has(slug);
    if (wasSelected) next.delete(slug);
    else next.add(slug);
    setSelected(next);
    if (!wasSelected) {
      applySelectedOrder([...selectedSales.map((sale) => sale.slug), slug]);
    }
    setRouteNote("");
  }

  function selectAll() {
    const currentSelectedSlugs = selectedSales.map((sale) => sale.slug);
    const missingSelectedSlugs = orderedSales.filter((sale) => !selected.has(sale.slug)).map((sale) => sale.slug);
    const nextSelectedSlugs = [...currentSelectedSlugs, ...missingSelectedSlugs];

    setSelected(new Set(orderedSales.map((sale) => sale.slug)));
    applySelectedOrder(nextSelectedSlugs);
    setRouteNote("");
  }

  function deselectAll() {
    setSelected(new Set());
    setRouteNote("");
  }

  function applySelectedOrder(nextSelectedSlugs: string[]) {
    const selectedSlugSet = new Set(nextSelectedSlugs);
    const selectedQueue = [...nextSelectedSlugs];
    const nextOrderedSlugs = orderedSales.map((sale) => {
      if (!selectedSlugSet.has(sale.slug)) return sale.slug;
      return selectedQueue.shift() || sale.slug;
    });

    setOrderedSlugs(nextOrderedSlugs);
  }

  function moveSelectedStopTo(slug: string, nextPosition: number) {
    const currentSelectedSlugs = selectedSales.map((sale) => sale.slug);
    const currentIndex = currentSelectedSlugs.indexOf(slug);
    if (currentIndex === -1) return;

    const nextIndex = Math.max(0, Math.min(currentSelectedSlugs.length - 1, nextPosition - 1));
    if (nextIndex === currentIndex) return;

    const nextSelectedSlugs = [...currentSelectedSlugs];
    const [movedSlug] = nextSelectedSlugs.splice(currentIndex, 1);
    nextSelectedSlugs.splice(nextIndex, 0, movedSlug);
    applySelectedOrder(nextSelectedSlugs);
    setRouteNote("");
  }

  function moveSelectedStop(slug: string, direction: -1 | 1) {
    const currentIndex = selectedSales.findIndex((sale) => sale.slug === slug);
    if (currentIndex === -1) return;
    moveSelectedStopTo(slug, currentIndex + 1 + direction);
  }

  function addSelected() {
    const current = readSaved();
    const selectedCodes = new Set(selectedSales.map((sale) => listingCode(sale.slug)));
    const next = [...current.filter((sale) => !selectedCodes.has(listingCode(sale.slug))), ...selectedSales];
    writeSaved(next);
    router.push("/saletrail/route");
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setRouteNote("Your browser does not support location sharing. Choose a starting sale instead.");
      return;
    }

    setRouteNote("Waiting for your location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setStartLocation({
          label: "My current location",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setRouteNote("Starting from your current location. Now build the suggested order.");
      },
      () => {
        setRouteNote("Location was not shared. You can still choose a starting sale.");
      },
      { enableHighAccuracy: false, maximumAge: 1000 * 60 * 10, timeout: 10000 },
    );
  }

  function buildSuggestedOrder() {
    const candidates = selectedSales;
    if (candidates.length < 2) {
      setRouteNote("Choose at least two stops to build a suggested order.");
      return;
    }

    const withCoordinates = candidates.filter(hasCoordinates);
    const withoutCoordinates = candidates.filter((sale) => !hasCoordinates(sale));
    if (withCoordinates.length < 2) {
      setRouteNote("There are not enough mapped addresses to suggest an order yet.");
      return;
    }

    const startingSale = salesBySlug.get(activeStartSlug);
    const routeStart =
      startLocation ||
      (startingSale && hasCoordinates(startingSale)
        ? {
            label: startingSale.title,
            latitude: startingSale.latitude || 0,
            longitude: startingSale.longitude || 0,
          }
        : null);

    if (!routeStart) {
      setRouteNote("Choose a mapped starting sale or use your location first.");
      return;
    }

    const remaining = [...withCoordinates];
    const ordered: SavedSale[] = [];
    let current = routeStart;

    if (!startLocation && startingSale && hasCoordinates(startingSale) && selected.has(startingSale.slug)) {
      ordered.push(startingSale);
      const startIndex = remaining.findIndex((sale) => sale.slug === startingSale.slug);
      if (startIndex !== -1) remaining.splice(startIndex, 1);
    }

    while (remaining.length > 0) {
      let bestIndex = 0;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (let index = 0; index < remaining.length; index += 1) {
        const nextDistance = distanceInMiles(current, remaining[index]);
        if (nextDistance < bestDistance) {
          bestDistance = nextDistance;
          bestIndex = index;
        }
      }
      const [nextSale] = remaining.splice(bestIndex, 1);
      ordered.push(nextSale);
      current = {
        label: nextSale.title,
        latitude: nextSale.latitude || current.latitude,
        longitude: nextSale.longitude || current.longitude,
      };
    }

    const unselected = orderedSales.filter((sale) => !selected.has(sale.slug));
    setOrderedSlugs([
      ...ordered.map((sale) => sale.slug),
      ...withoutCoordinates.map((sale) => sale.slug),
      ...unselected.map((sale) => sale.slug),
    ]);
    setRouteNote(
      withoutCoordinates.length
        ? `Suggested order built. ${withoutCoordinates.length} stop${withoutCoordinates.length === 1 ? "" : "s"} without map pins were kept at the end.`
        : "Suggested order built from your starting point.",
    );
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
      <div className="event-route-selection-bar">
        <p>
          <strong>{selectedCount}</strong> of {sales.length} stops selected
        </p>
        <div className="event-route-selection-actions">
          <button className="button compact-button" type="button" onClick={selectAll} disabled={allSelected}>
            Select all
          </button>
          <button className="button compact-button" type="button" onClick={deselectAll} disabled={noneSelected}>
            Deselect all
          </button>
        </div>
      </div>
      <div className="event-route-tools">
        <div>
          <h3>Suggest a route order</h3>
          <p className="muted">
            Pick a starting point, then SaleTrail will order the selected stops by nearest-next map distance.
          </p>
        </div>
        <div className="event-route-tool-grid">
          <label>
            Start from
            <select
              value={startLocation ? "current-location" : activeStartSlug}
              onChange={(event) => {
                setStartLocation(null);
                setStartSlug(event.target.value);
                setRouteNote("");
              }}
            >
              {startLocation ? <option value="current-location">My current location</option> : null}
              {startOptions.map((sale) => (
                <option key={sale.slug} value={sale.slug}>
                  {sale.address || sale.title}
                </option>
              ))}
            </select>
          </label>
          <button className="button" type="button" onClick={useMyLocation}>
            Use my location
          </button>
          <button className="button primary" type="button" onClick={buildSuggestedOrder} disabled={selectedCount < 2}>
            Build suggested order
          </button>
        </div>
        {routeNote ? <p className="route-suggestion-note">{routeNote}</p> : null}
        <p className="muted small-note">This is a simple suggested order, not live traffic or full road optimization.</p>
      </div>
      <div className="event-stop-list">
        {orderedSales.map((sale) => {
          const isSelected = selected.has(sale.slug);
          const routePosition = selectedSales.findIndex((item) => item.slug === sale.slug) + 1;
          return (
            <div className={`event-stop-check${isSelected ? " selected" : ""}`} key={sale.slug}>
              <input
                aria-label={`Include ${sale.title} in my route`}
                checked={isSelected}
                type="checkbox"
                onChange={() => toggle(sale.slug)}
              />
              {isSelected ? (
                <div className="event-stop-order" aria-label={`Route position for ${sale.title}`}>
                  <input
                    aria-label={`Stop number for ${sale.title}`}
                    max={selectedCount}
                    min={1}
                    type="number"
                    value={routePosition}
                    onChange={(event) => moveSelectedStopTo(sale.slug, Number(event.target.value))}
                  />
                  <div className="event-stop-order-buttons">
                    <button
                      aria-label={`Move ${sale.title} earlier in route`}
                      disabled={routePosition <= 1}
                      type="button"
                      onClick={() => moveSelectedStop(sale.slug, -1)}
                    >
                      ↑
                    </button>
                    <button
                      aria-label={`Move ${sale.title} later in route`}
                      disabled={routePosition >= selectedCount}
                      type="button"
                      onClick={() => moveSelectedStop(sale.slug, 1)}
                    >
                      ↓
                    </button>
                  </div>
                </div>
              ) : null}
              <span className="event-stop-copy">
                <a href={sale.href}>
                  <strong>{sale.title}</strong>
                </a>
                <a href={sale.href}>
                  <small>{sale.address}</small>
                </a>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
