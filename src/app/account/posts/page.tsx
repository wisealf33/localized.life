import type { Metadata } from "next";
import { AccountPostsManager } from "@/components/AccountPostsManager";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "My posts",
  description: "Manage your Localized.life services, goods, events, mentoring, and requests.",
  robots: { index: false, follow: false },
};

const postTypes = new Set(["service", "goods", "event", "mentoring", "request"] as const);

export default async function AccountPostsPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const query = await searchParams;
  const initialPostType = query.new && postTypes.has(query.new as "service" | "goods" | "event" | "mentoring" | "request")
    ? query.new as "service" | "goods" | "event" | "mentoring" | "request"
    : undefined;
  return (
    <main className="page account-page account-posts-page">
      <SiteHeader product="Project hub" />
      <AccountPostsManager initialPostType={initialPostType} />
    </main>
  );
}
