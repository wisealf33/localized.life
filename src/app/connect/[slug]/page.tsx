import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Request local help",
  robots: { index: false, follow: false },
};

export default function LegacyPublicConnectorPage() {
  redirect("/local-services/request");
}
