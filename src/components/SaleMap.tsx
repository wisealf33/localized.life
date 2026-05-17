"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";

export type MappedSale = {
  slug: string;
  title: string;
  address: string;
  startsAt: string;
  href: string;
  latitude: number | null;
  longitude: number | null;
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

      const center = [mappedSales[0].latitude || 41.5, mappedSales[0].longitude || -87.7] as [number, number];
      const map = L.map(containerRef.current, {
        scrollWheelZoom: false,
      }).setView(center, 10);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const bounds = L.latLngBounds([]);

      for (const sale of mappedSales) {
        const latLng = L.latLng(sale.latitude || 0, sale.longitude || 0);
        bounds.extend(latLng);

        const popup = document.createElement("div");
        popup.className = "map-popup";

        const title = document.createElement("strong");
        title.textContent = sale.title;
        popup.append(title);

        const when = document.createElement("p");
        when.textContent = formatDate(sale.startsAt);
        popup.append(when);

        const address = document.createElement("p");
        address.textContent = sale.address;
        popup.append(address);

        const link = document.createElement("a");
        link.href = sale.href;
        link.textContent = "View listing";
        popup.append(link);

        L.circleMarker(latLng, {
          radius: 9,
          color: "#1d4ed8",
          weight: 3,
          fillColor: "#3b82f6",
          fillOpacity: 0.85,
        })
          .addTo(map)
          .bindPopup(popup);
      }

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
        <p>Add latitude and longitude in admin quick add to make listings appear on the map.</p>
      </div>
    );
  }

  return <div className="sale-map" ref={containerRef} />;
}
