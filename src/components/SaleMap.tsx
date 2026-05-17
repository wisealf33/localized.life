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
  const mapGroups = useMemo(() => {
    const groups = new Map<string, MappedSale[]>();
    for (const sale of mappedSales) {
      const key = `${sale.latitude?.toFixed(5)},${sale.longitude?.toFixed(5)}`;
      groups.set(key, [...(groups.get(key) || []), sale]);
    }
    return Array.from(groups.values());
  }, [mappedSales]);

  useEffect(() => {
    if (!containerRef.current || mapGroups.length === 0) return;
    let cancelled = false;

    async function renderMap() {
      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const firstSale = mapGroups[0][0];
      const center = [firstSale.latitude || 41.5, firstSale.longitude || -87.7] as [number, number];
      const map = L.map(containerRef.current, {
        scrollWheelZoom: false,
      }).setView(center, 10);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const bounds = L.latLngBounds([]);

      for (const group of mapGroups) {
        const sale = group[0];
        const latLng = L.latLng(sale.latitude || 0, sale.longitude || 0);
        bounds.extend(latLng);

        const popup = document.createElement("div");
        popup.className = "map-popup";

        const title = document.createElement("strong");
        title.textContent =
          group.length > 1
            ? `${sale.city || "Area"}${sale.state ? `, ${sale.state}` : ""}: ${group.length} sales`
            : sale.title;
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

        if (group.length > 6 && sale.city) {
          const more = document.createElement("a");
          more.href = `/saletrail?q=${encodeURIComponent(sale.city)}`;
          more.textContent = `View more ${sale.city} listings`;
          popup.append(more);
        }

        L.circleMarker(latLng, {
          radius: group.length > 1 ? 14 : 9,
          color: group.some((item) => item.locationPrecision === "area") ? "#f97373" : "#1d4ed8",
          weight: 3,
          fillColor: "#3b82f6",
          fillOpacity: 0.85,
        })
          .addTo(map)
          .bindPopup(popup);
      }

      if (mapGroups.length > 1) {
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
  }, [mapGroups]);

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
