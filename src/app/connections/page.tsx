import type { Metadata } from "next";
import { MyConnections } from "@/components/MyConnections";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "My Connections",
  description: "Your private Localized.life relationships, Needs, and history.",
  robots: { index: false, follow: false },
};

export default function ConnectionsPage() {
  return <main className="page connector-page"><SiteHeader product="Project hub" /><MyConnections /></main>;
}
