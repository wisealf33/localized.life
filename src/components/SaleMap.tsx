"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";

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

function buildPopup(group: MappedSale[], titleText: string) {
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

export function SaleMap({ sales }: { sales: MappedSale[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
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
      const center = [firstSale.latitude || 41.5, firstSale.longitude || -87.7] as [number, number];
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

      function addMarker(group: MappedSale[], latitude: number, longitude: number) {
        const sale = group[0];
        const latLng = L.latLng(latitude, longitude);
        const titleText =
          group.length > 1
            ? `${sale.city || "Area"}${sale.state ? `, ${sale.state}` : ""}: ${group.length} sales`
            : sale.title;

        L.circleMarker(latLng, {
          radius: group.length > 1 ? 14 : 9,
          color: group.some((item) => item.locationPrecision === "area") ? "#f97373" : "#1d4ed8",
          weight: 3,
          fillColor: "#3b82f6",
          fillOpacity: 0.85,
        })
          .addTo(markerLayer)
          .bindPopup(buildPopup(group, titleText));
      }

      function renderMarkersForZoom() {
        markerLayer.clearLayers();
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
  }, [mappedSales]);

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
