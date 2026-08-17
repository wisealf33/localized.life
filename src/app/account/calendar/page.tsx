import type { Metadata } from "next";
import { AccountCalendar } from "@/components/AccountCalendar";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Customer calendar",
  description: "Your private Localized.life customer and appointment calendar.",
  robots: { index: false, follow: false },
};

export default function AccountCalendarPage() {
  return (
    <main className="page account-page account-calendar-page">
      <SiteHeader product="Project hub" />
      <AccountCalendar />
    </main>
  );
}
