"use client";

import { useRouter } from "next/navigation";

export function BackToListingsButton() {
  const router = useRouter();

  function goBack() {
    if (document.referrer.startsWith(window.location.origin) && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/saletrail");
  }

  return (
    <button className="button compact-button" type="button" onClick={goBack}>
      Back to listings
    </button>
  );
}
