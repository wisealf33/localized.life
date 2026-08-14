import type { Metadata } from "next";
import { ConnectorMemberDashboard } from "@/components/ConnectorMemberDashboard";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Your Connector",
  description: "Your private Localized.life Connector dashboard.",
  robots: { index: false, follow: false },
};

export default function ConnectorDashboardPage() {
  return (
    <main className="page connector-page">
      <SiteHeader product="Connector" />
      <section className="hero compact-hero connector-dashboard-hero">
        <p className="eyebrow">A personal way back</p>
        <h1>Your Connector</h1>
        <p className="lede">Ask for help, see what you are working on together, and keep a simple history over time.</p>
      </section>
      <ConnectorMemberDashboard />
    </main>
  );
}
