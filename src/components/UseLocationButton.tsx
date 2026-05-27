"use client";

import type { MouseEvent } from "react";
import { useEffect, useRef, useState } from "react";

type Props = {
  initialLat?: string;
  initialLng?: string;
  initialNear?: string;
};

export function UseLocationButton({ initialLat = "", initialLng = "", initialNear = "" }: Props) {
  const latInput = useRef<HTMLInputElement>(null);
  const lngInput = useRef<HTMLInputElement>(null);
  const nearInput = useRef<HTMLInputElement>(null);
  const isInitiallyActive = initialNear === "1" && Boolean(initialLat && initialLng);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(isInitiallyActive);

  function clearLocationSearch(form?: HTMLFormElement | null) {
    if (latInput.current) latInput.current.value = "";
    if (lngInput.current) lngInput.current.value = "";
    if (nearInput.current) nearInput.current.value = "";
    const locationInput = form?.elements.namedItem("q");
    if (locationInput instanceof HTMLInputElement && locationInput.value.startsWith("Near ")) {
      locationInput.value = "";
    }
    setActive(false);
  }

  useEffect(() => {
    const form = latInput.current?.form;
    const locationInput = form?.elements.namedItem("q");
    if (!(locationInput instanceof HTMLInputElement)) return;

    function handleManualLocationEdit() {
      if (!active) return;
      if (locationInput instanceof HTMLInputElement && !locationInput.value.startsWith("Near ")) {
        clearLocationSearch(form);
      }
    }

    locationInput.addEventListener("input", handleManualLocationEdit);
    return () => locationInput.removeEventListener("input", handleManualLocationEdit);
  }, [active]);

  function useLocation(event: MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;

    if (active) {
      clearLocationSearch(form);

      window.setTimeout(() => {
        form?.requestSubmit();
      }, 0);
      return;
    }

    if (!("geolocation" in navigator)) {
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const nextLat = position.coords.latitude.toFixed(6);
        const nextLng = position.coords.longitude.toFixed(6);
        if (latInput.current) latInput.current.value = nextLat;
        if (lngInput.current) lngInput.current.value = nextLng;
        if (nearInput.current) nearInput.current.value = "1";
        const locationInput = form?.elements.namedItem("q");
        const fallbackLabel = `Near your current location (${nextLat}, ${nextLng})`;
        let label = fallbackLabel;

        try {
          const response = await fetch(`/api/reverse-geocode?lat=${encodeURIComponent(nextLat)}&lng=${encodeURIComponent(nextLng)}`);
          if (response.ok) {
            const result = (await response.json()) as { label?: string };
            if (result.label) label = `Near ${result.label}`;
          }
        } catch {
          label = fallbackLabel;
        }

        if (locationInput instanceof HTMLInputElement) locationInput.value = label;
        setActive(true);
        setLoading(false);

        window.setTimeout(() => {
          form?.requestSubmit();
        }, 0);
      },
      () => {
        setLoading(false);
      },
      {
        enableHighAccuracy: false,
        maximumAge: 10 * 60 * 1000,
        timeout: 10000,
      },
    );
  }

  return (
    <div className="location-search-action">
      <input name="lat" ref={latInput} type="hidden" defaultValue={initialLat} />
      <input name="lng" ref={lngInput} type="hidden" defaultValue={initialLng} />
      <input name="near" ref={nearInput} type="hidden" defaultValue={isInitiallyActive ? "1" : ""} />
      <button className={`button location-toggle${active ? " active" : ""}`} disabled={loading} type="button" onClick={useLocation}>
        {loading ? "Finding..." : active ? "Using my location" : "Use my location"}
      </button>
    </div>
  );
}
