"use client";

import type { MouseEvent } from "react";
import { useRef, useState } from "react";

type Props = {
  initialLat?: string;
  initialLng?: string;
};

export function UseLocationButton({ initialLat = "", initialLng = "" }: Props) {
  const latInput = useRef<HTMLInputElement>(null);
  const lngInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState(initialLat && initialLng ? "Using your location for this search." : "");
  const [loading, setLoading] = useState(false);

  function useLocation(event: MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;

    if (!("geolocation" in navigator)) {
      setMessage("Your browser does not support location search. Enter a city or ZIP instead.");
      return;
    }

    setLoading(true);
    setMessage("Waiting for browser permission...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLat = position.coords.latitude.toFixed(6);
        const nextLng = position.coords.longitude.toFixed(6);
        if (latInput.current) latInput.current.value = nextLat;
        if (lngInput.current) lngInput.current.value = nextLng;
        const locationInput = form?.elements.namedItem("q");
        if (locationInput instanceof HTMLInputElement) locationInput.value = "";
        setMessage("Searching near your current location.");

        window.setTimeout(() => {
          form?.requestSubmit();
        }, 0);
      },
      () => {
        setLoading(false);
        setMessage("No problem. Enter a city or ZIP code to search nearby sales.");
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
      <button className="button" disabled={loading} type="button" onClick={useLocation}>
        {loading ? "Finding..." : "Use my location"}
      </button>
      {message ? (
        <small className="location-search-message" aria-live="polite">
          {message}
        </small>
      ) : null}
    </div>
  );
}
