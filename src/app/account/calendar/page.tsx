import type { Metadata } from "next";
import { AccountCalendar } from "@/components/AccountCalendar";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Appointment calendar",
  description: "Your private Localized.life appointment calendar and service details.",
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
