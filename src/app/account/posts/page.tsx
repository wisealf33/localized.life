import type { Metadata } from "next";
import { AccountPostsManager } from "@/components/AccountPostsManager";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Requests and posts",
  description: "Create requests and manage your earlier Localized.life posts.",
  robots: { index: false, follow: false },
};

export default async function AccountPostsPage({ searchParams }: { searchParams: Promise<{ new?: string; category?: string; request?: string }> }) {
  const query = await searchParams;
  return (
    <main className="page account-page account-posts-page">
      <SiteHeader product="Project hub" />
      <AccountPostsManager
        openNewRequest={query.new === "request"}
        initialCategory={(query.category || "").slice(0, 80)}
        initialRequestId={(query.request || "").slice(0, 80)}
      />
    </main>
  );
}
