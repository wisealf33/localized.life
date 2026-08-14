import type { Metadata } from "next";
import { ClaimedPersonDashboard } from "@/components/ClaimedPersonDashboard";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "My account",
  description: "Your private Localized.life account for local posts, requests, work, and people.",
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <main className="page account-page">
      <SiteHeader product="Project hub" />
      <ClaimedPersonDashboard />
    </main>
  );
}
