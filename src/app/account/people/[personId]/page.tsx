import type { Metadata } from "next";
import { ConnectedPersonProfile } from "@/components/ConnectedPersonProfile";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "My connection",
  description: "Connection information shared inside your private Localized.life account.",
  robots: { index: false, follow: false },
};

export default async function ConnectedPersonPage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = await params;
  return (
    <main className="page account-page">
      <SiteHeader product="Project hub" />
      <ConnectedPersonProfile
        personId={personId}
        preview={process.env.NODE_ENV === "development" && personId.startsWith("preview-")}
      />
    </main>
  );
}
