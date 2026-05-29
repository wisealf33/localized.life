"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

type Props = {
  formId: string;
};

function stringValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function buildDirectoryUrl(form: HTMLFormElement, clearRange = false) {
  const formData = new FormData(form);
  const params = new URLSearchParams();
  const q = stringValue(formData, "q");
  const date = stringValue(formData, "date");
  const range = stringValue(formData, "range");
  const category = stringValue(formData, "category");
  const radius = stringValue(formData, "radius");
  const perPage = stringValue(formData, "perPage");
  const lat = stringValue(formData, "lat");
  const lng = stringValue(formData, "lng");
  const near = stringValue(formData, "near");

  if (q) params.set("q", q);
  if (date) {
    params.set("date", date);
  } else if (range && !clearRange) {
    params.set("range", range);
  }
  if (category) params.set("category", category);
  if (radius && radius !== "10") params.set("radius", radius);
  if (near === "1" && lat && lng && q.startsWith("Near ")) {
    params.set("near", near);
    params.set("lat", lat);
    params.set("lng", lng);
  }
  if (perPage && perPage !== "10") params.set("perPage", perPage);

  const query = params.toString();
  return query ? `/saletrail?${query}` : "/saletrail";
}

export function AutoSubmitSearchForm({ formId }: Props) {
  const router = useRouter();

  useEffect(() => {
    const formElement = document.getElementById(formId);
    if (!(formElement instanceof HTMLFormElement)) return;
    const form: HTMLFormElement = formElement;

    let timeout: number | undefined;

    function queueSubmit(event: Event, delay: number) {
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
      if (!target.name || target.type === "hidden") return;

      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => {
        const clearRange = target.name === "date" && Boolean(target.value);
        const nextUrl = buildDirectoryUrl(form, clearRange);
        const currentUrl = `${window.location.pathname}${window.location.search}`;
        if (nextUrl !== currentUrl) {
          router.push(nextUrl, { scroll: false });
        }
      }, delay);
    }

    function handleInput(event: Event) {
      queueSubmit(event, 650);
    }

    function handleChange(event: Event) {
      queueSubmit(event, 120);
    }

    function handleSubmit(event: SubmitEvent) {
      event.preventDefault();
      const nextUrl = buildDirectoryUrl(form);
      const currentUrl = `${window.location.pathname}${window.location.search}`;
      if (nextUrl !== currentUrl) {
        router.push(nextUrl, { scroll: false });
      }
    }

    form.addEventListener("input", handleInput);
    form.addEventListener("change", handleChange);
    form.addEventListener("submit", handleSubmit);

    return () => {
      window.clearTimeout(timeout);
      form.removeEventListener("input", handleInput);
      form.removeEventListener("change", handleChange);
      form.removeEventListener("submit", handleSubmit);
    };
  }, [formId, router]);

  return null;
}
