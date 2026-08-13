import type { Metadata } from "next";
import { MyConnections } from "@/components/MyConnections";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Person · My Connections",
  robots: { index: false, follow: false },
};

export default async function ConnectionPersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <main className="page connector-page connector-person-page"><SiteHeader product="Project hub" /><MyConnections personId={id} /></main>;
}
