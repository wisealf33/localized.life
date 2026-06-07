"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import type { SavedSale } from "./SaveSaleButton";

export type MappedSale = {
  slug: string;
  title: string;
  address: string;
  city?: string;
  state?: string;
  startsAt: string;
  href: string;
  latitude: number | null;
  longitude: number | null;
  locationPrecision?: "address" | "area" | null;
};

export type StartLocation = {
  label: string;
  latitude: number;
  longitude: number;
};

const savedRouteKey = "saletrail.savedSales";
const notInterestedKey = "saletrail.notInterestedSales";

function readSavedSales(): SavedSale[] {
  try {
    return JSON.parse(window.localStorage.getItem(savedRouteKey) || "[]");
  } catch {
    return [];
  }
}

function writeSavedSales(sales: SavedSale[]) {
  window.localStorage.setItem(savedRouteKey, JSON.stringify(sales));
  window.dispatchEvent(new CustomEvent("saletrail:saved", { detail: { source: "route" } }));
}

function readNotInterestedCodes() {
  try {
    const values = JSON.parse(window.localStorage.getItem(notInterestedKey) || "[]") as string[];
    return new Set(values);
  } catch {
    return new Set<string>();
  }
}

function writeNotInterestedCodes(codes: Set<string>) {
  window.localStorage.setItem(notInterestedKey, JSON.stringify(Array.from(codes)));
  window.dispatchEvent(new CustomEvent("saletrail:saved", { detail: { source: "interest" } }));
}

function listingCode(slug: string) {
  return slug.split("/").pop()?.split("-").filter(Boolean).at(-1) || slug;
}

function sameSavedSale(left: Pick<SavedSale, "slug">, right: Pick<SavedSale, "slug">) {
  return left.slug === right.slug || listingCode(left.slug) === listingCode(right.slug);
}

function savedCodeSet() {
  if (typeof window === "undefined") return new Set<string>();
  return new Set(readSavedSales().map((sale) => listingCode(sale.slug)));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function coordinateKey(sale: MappedSale) {
  return `${sale.latitude?.toFixed(5)},${sale.longitude?.toFixed(5)}`;
}

function areaKey(sale: MappedSale) {
  return `${sale.city || "Area"},${sale.state || ""}`;
}

function averageCoordinate(group: MappedSale[]) {
  const totals = group.reduce(
    (sum, sale) => ({
      latitude: sum.latitude + (sale.latitude || 0),
      longitude: sum.longitude + (sale.longitude || 0),
    }),
    { latitude: 0, longitude: 0 },
  );

  return {
    latitude: totals.latitude / group.length,
    longitude: totals.longitude / group.length,
  };
}

function offsetCoordinate(latitude: number, longitude: number, index: number, total: number) {
  if (total < 2) return { latitude, longitude };

  const angle = (2 * Math.PI * index) / total;
  const radius = 0.00012 + Math.min(total, 18) * 0.000006;
  const latOffset = Math.sin(angle) * radius;
  const lngOffset = (Math.cos(angle) * radius) / Math.max(Math.cos((latitude * Math.PI) / 180), 0.25);

  return {
    latitude: latitude + latOffset,
    longitude: longitude + lngOffset,
  };
}

function buildPopup(
  group: MappedSale[],
  titleText: string,
  savedSales: SavedSale[],
  notInterestedCodes: Set<string>,
  onToggleSaved: (sale: MappedSale) => void,
  onToggleNotInterested: (sale: MappedSale) => void,
  onMoveSaved: (sale: MappedSale, direction: -1 | 1) => void,
  onSetSavedPosition: (sale: MappedSale, position: number) => void,
) {
  const popup = document.createElement("div");
  popup.className = "map-popup";

  const title = document.createElement("strong");
  title.textContent = titleText;
  popup.append(title);

  if (group.some((item) => item.locationPrecision === "area")) {
    const note = document.createElement("p");
    note.textContent = "Approximate area pin";
    popup.append(note);
  }

  for (const item of group.slice(0, 6)) {
    const listing = document.createElement("div");
    listing.className = "map-popup-listing";

    const listingLink = document.createElement("a");
    listingLink.href = item.href;
    listingLink.textContent = item.title;
    listing.append(listingLink);

    const listingMeta = document.createElement("p");
    listingMeta.textContent = `${formatDate(item.startsAt)} · ${item.address}`;
    listing.append(listingMeta);

    const savedIndex = savedSales.findIndex((savedSale) => sameSavedSale(savedSale, item));
    const saved = savedIndex !== -1;
    const notInterested = notInterestedCodes.has(listingCode(item.slug));

    if (saved) {
      const routeOrder = document.createElement("div");
      routeOrder.className = "map-popup-route-row";

      const orderLabel = document.createElement("span");
      orderLabel.className = "map-popup-order";
      orderLabel.textContent = "Stop";
      routeOrder.append(orderLabel);

      const orderInput = document.createElement("input");
      orderInput.className = "map-popup-stop-input";
      orderInput.type = "number";
      orderInput.inputMode = "numeric";
      orderInput.min = "1";
      orderInput.max = String(savedSales.length);
      orderInput.value = String(savedIndex + 1);
      orderInput.setAttribute("aria-label", `Stop number for ${item.title}`);

      const updatePosition = () => {
        onSetSavedPosition(item, Number(orderInput.value));
      };

      orderInput.addEventListener("click", (event) => event.stopPropagation());
      orderInput.addEventListener("change", updatePosition);
      orderInput.addEventListener("blur", updatePosition);
      orderInput.addEventListener("keydown", (event) => {
        event.stopPropagation();
        if (event.key === "Enter") {
          event.preventDefault();
          orderInput.blur();
        }
      });
      routeOrder.append(orderInput);

      const orderTotal = document.createElement("span");
      orderTotal.className = "map-popup-order";
      orderTotal.textContent = `of ${savedSales.length} in My Route`;
      routeOrder.append(orderTotal);

      const moveUp = document.createElement("button");
      moveUp.className = "map-popup-nudge";
      moveUp.type = "button";
      moveUp.textContent = "↑";
      moveUp.title = "Move earlier";
      moveUp.setAttribute("aria-label", `Move ${item.title} earlier in route`);
      moveUp.disabled = savedIndex === 0;
      moveUp.addEventListener("click", (event) => {
        event.stopPropagation();
        onMoveSaved(item, -1);
      });
      routeOrder.append(moveUp);

      const moveDown = document.createElement("button");
      moveDown.className = "map-popup-nudge";
      moveDown.type = "button";
      moveDown.textContent = "↓";
      moveDown.title = "Move later";
      moveDown.setAttribute("aria-label", `Move ${item.title} later in route`);
      moveDown.disabled = savedIndex === savedSales.length - 1;
      moveDown.addEventListener("click", (event) => {
        event.stopPropagation();
        onMoveSaved(item, 1);
      });
      routeOrder.append(moveDown);

      listing.append(routeOrder);
    }

    const routeButton = document.createElement("button");
    routeButton.className = saved ? "map-popup-route saved" : "map-popup-route";
    routeButton.type = "button";
    routeButton.textContent = saved ? "Remove from route" : "Add to route";
    routeButton.addEventListener("click", (event) => {
      event.stopPropagation();
      onToggleSaved(item);
    });
    listing.append(routeButton);

    if (!saved) {
      const interestButton = document.createElement("button");
      interestButton.className = notInterested ? "map-popup-interest ignored" : "map-popup-interest";
      interestButton.type = "button";
      interestButton.textContent = notInterested ? "Undo not interested" : "Not interested";
      interestButton.addEventListener("click", (event) => {
        event.stopPropagation();
        onToggleNotInterested(item);
      });
      listing.append(interestButton);
    }

    popup.append(listing);
  }

  if (group.length > 6 && group[0].city) {
    const more = document.createElement("a");
    more.href = `/saletrail?q=${encodeURIComponent(group[0].city)}`;
    more.textContent = `View more ${group[0].city} listings`;
    popup.append(more);
  }

  return popup;
}

function groupSalesForZoom(sales: MappedSale[], zoom: number) {
  const groups = new Map<string, MappedSale[]>();
  const lowZoom = zoom < 13;

  for (const sale of sales) {
    const key = lowZoom ? areaKey(sale) : coordinateKey(sale);
    groups.set(key, [...(groups.get(key) || []), sale]);
  }

  return Array.from(groups.values());
}

export function SaleMap({ sales, startLocation = null }: { sales: MappedSale[]; startLocation?: StartLocation | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const renderMarkersRef = useRef<(() => void) | null>(null);
  const savedSalesRef = useRef<SavedSale[]>([]);
  const savedCodesRef = useRef<Set<string>>(new Set());
  const notInterestedCodesRef = useRef<Set<string>>(new Set());
  const [savedSales, setSavedSales] = useState<SavedSale[]>(() => (typeof window === "undefined" ? [] : readSavedSales()));
  const [savedCodes, setSavedCodes] = useState<Set<string>>(() => savedCodeSet());
  const [notInterestedCodes, setNotInterestedCodes] = useState<Set<string>>(() =>
    typeof window === "undefined" ? new Set() : readNotInterestedCodes(),
  );
  const mappedSales = useMemo(
    () =>
      sales.filter(
        (sale) =>
          typeof sale.latitude === "number" &&
          typeof sale.longitude === "number" &&
          Number.isFinite(sale.latitude) &&
          Number.isFinite(sale.longitude),
      ),
    [sales],
  );

  useEffect(() => {
    savedCodesRef.current = savedCodes;
  }, [savedCodes]);

  useEffect(() => {
    savedSalesRef.current = savedSales;
  }, [savedSales]);

  useEffect(() => {
    notInterestedCodesRef.current = notInterestedCodes;
  }, [notInterestedCodes]);

  useEffect(() => {
    function syncSaved() {
      const next = readSavedSales();
      setSavedSales(next);
      setSavedCodes(new Set(next.map((sale) => listingCode(sale.slug))));
      setNotInterestedCodes(readNotInterestedCodes());
    }

    window.addEventListener("saletrail:saved", syncSaved);
    window.addEventListener("storage", syncSaved);
    return () => {
      window.removeEventListener("saletrail:saved", syncSaved);
      window.removeEventListener("storage", syncSaved);
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current || mappedSales.length === 0) return;
    let cancelled = false;

    async function renderMap() {
      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const firstSale = mappedSales[0];
      const center = startLocation
        ? ([startLocation.latitude, startLocation.longitude] as [number, number])
        : ([firstSale.latitude || 41.5, firstSale.longitude || -87.7] as [number, number]);
      const map = L.map(containerRef.current, {
        scrollWheelZoom: false,
      }).setView(center, 10);
      mapRef.current = map;
      const markerLayer = L.layerGroup().addTo(map);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const bounds = L.latLngBounds([]);

      function toggleSaved(sale: MappedSale) {
        const current = readSavedSales();
        const alreadySaved = current.some((item) => sameSavedSale(item, sale));
        const next = alreadySaved ? current.filter((item) => !sameSavedSale(item, sale)) : [...current, sale];
        writeSavedSales(next);
        const nextCodes = new Set(next.map((item) => listingCode(item.slug)));
        const nextNotInterestedCodes = readNotInterestedCodes();
        if (!alreadySaved) {
          nextNotInterestedCodes.delete(listingCode(sale.slug));
          writeNotInterestedCodes(nextNotInterestedCodes);
        }
        savedSalesRef.current = next;
        savedCodesRef.current = nextCodes;
        notInterestedCodesRef.current = nextNotInterestedCodes;
        setSavedSales(next);
        setSavedCodes(nextCodes);
        setNotInterestedCodes(nextNotInterestedCodes);
        renderMarkersRef.current?.();
      }

      function toggleNotInterested(sale: MappedSale) {
        const code = listingCode(sale.slug);
        const next = new Set(readNotInterestedCodes());
        if (next.has(code)) {
          next.delete(code);
        } else {
          next.add(code);
        }
        writeNotInterestedCodes(next);
        notInterestedCodesRef.current = next;
        setNotInterestedCodes(next);
        renderMarkersRef.current?.();
      }

      function moveSaved(sale: MappedSale, direction: -1 | 1) {
        const current = readSavedSales();
        const index = current.findIndex((item) => sameSavedSale(item, sale));
        const nextIndex = index + direction;
        if (index === -1 || nextIndex < 0 || nextIndex >= current.length) return;

        const next = [...current];
        [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
        writeSavedSales(next);
        const nextCodes = new Set(next.map((item) => listingCode(item.slug)));
        savedSalesRef.current = next;
        savedCodesRef.current = nextCodes;
        setSavedSales(next);
        setSavedCodes(nextCodes);
        renderMarkersRef.current?.();
      }

      function setSavedPosition(sale: MappedSale, position: number) {
        const current = readSavedSales();
        const index = current.findIndex((item) => sameSavedSale(item, sale));
        if (index === -1 || !Number.isFinite(position)) return;

        const targetIndex = Math.min(Math.max(Math.round(position) - 1, 0), current.length - 1);
        if (targetIndex === index) return;

        const next = [...current];
        const [movedSale] = next.splice(index, 1);
        next.splice(targetIndex, 0, movedSale);
        writeSavedSales(next);
        const nextCodes = new Set(next.map((item) => listingCode(item.slug)));
        savedSalesRef.current = next;
        savedCodesRef.current = nextCodes;
        setSavedSales(next);
        setSavedCodes(nextCodes);
        renderMarkersRef.current?.();
      }

      function addMarker(group: MappedSale[], latitude: number, longitude: number) {
        const sale = group[0];
        const latLng = L.latLng(latitude, longitude);
        const hasSavedStop = group.some((item) => savedCodesRef.current.has(listingCode(item.slug)));
        const ignored = !hasSavedStop && group.every((item) => notInterestedCodesRef.current.has(listingCode(item.slug)));
        const titleText =
          group.length > 1
            ? `${sale.city || "Area"}${sale.state ? `, ${sale.state}` : ""}: ${group.length} sales`
            : sale.title;

        L.circleMarker(latLng, {
          radius: group.length > 1 ? 14 : 9,
          color: hasSavedStop ? "#15803d" : ignored ? "#b91c1c" : "#1d4ed8",
          weight: 3,
          fillColor: hasSavedStop ? "#22c55e" : ignored ? "#ef4444" : "#3b82f6",
          fillOpacity: 0.85,
        })
          .addTo(markerLayer)
          .bindPopup(
            buildPopup(
              group,
              titleText,
              savedSalesRef.current,
              notInterestedCodesRef.current,
              toggleSaved,
              toggleNotInterested,
              moveSaved,
              setSavedPosition,
            ),
          );
      }

      function renderMarkersForZoom() {
        markerLayer.clearLayers();
        if (startLocation) {
          const startPopup = document.createElement("div");
          startPopup.className = "map-popup";
          const startTitle = document.createElement("strong");
          startTitle.textContent = "Starting point";
          const startLabel = document.createElement("p");
          startLabel.textContent = startLocation.label;
          startPopup.append(startTitle, startLabel);

          L.circleMarker(L.latLng(startLocation.latitude, startLocation.longitude), {
            radius: 10,
            color: "#b45309",
            weight: 3,
            fillColor: "#f59e0b",
            fillOpacity: 0.95,
          })
            .addTo(markerLayer)
            .bindPopup(startPopup);
        }

        const zoom = map.getZoom();
        const groups = groupSalesForZoom(mappedSales, zoom);
        const splitOverlappingPins = zoom >= 15;

        for (const group of groups) {
          if (group.length > 1 && splitOverlappingPins && group.every((item) => item.locationPrecision !== "area")) {
            group.forEach((sale, index) => {
              const coordinates = offsetCoordinate(sale.latitude || 0, sale.longitude || 0, index, group.length);
              addMarker([sale], coordinates.latitude, coordinates.longitude);
            });
            continue;
          }

          const coordinates = zoom < 13 ? averageCoordinate(group) : { latitude: group[0].latitude || 0, longitude: group[0].longitude || 0 };
          addMarker(group, coordinates.latitude, coordinates.longitude);
        }
      }

      renderMarkersRef.current = renderMarkersForZoom;
      if (startLocation) {
        bounds.extend(L.latLng(startLocation.latitude, startLocation.longitude));
      }
      for (const sale of mappedSales) {
        bounds.extend(L.latLng(sale.latitude || 0, sale.longitude || 0));
      }

      renderMarkersForZoom();
      map.on("zoomend", renderMarkersForZoom);

      if (mappedSales.length > 1) {
        map.fitBounds(bounds, { padding: [32, 32], maxZoom: 13 });
      }
    }

    void renderMap();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mappedSales, startLocation]);

  if (mappedSales.length === 0) {
    return (
      <div className="empty">
        <h2>No mapped sales yet</h2>
        <p>Map pins are added automatically from listing addresses when SaleTrail can match them.</p>
      </div>
    );
  }

  return <div className="sale-map" ref={containerRef} />;
}
