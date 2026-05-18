import type { Metadata } from "next";
import { ConfigNotice } from "@/components/ConfigNotice";
import { SaleForm } from "@/components/SaleForm";
import { SiteHeader } from "@/components/SiteHeader";
import { createSellerSale } from "@/lib/actions";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "List a garage sale for free | SaleTrail",
  description:
    "Create a free garage sale listing, get a share page, generate a flyer with a QR code, and help shoppers add your sale to their route.",
  path: "/saletrail/new",
  image: "/og/default-saletrail.jpg",
});

export default function NewSalePage() {
  return (
    <main className="page narrow">
      <SiteHeader active="list" />
      <ConfigNotice />
      <p className="eyebrow">SaleTrail by Localized.life</p>
      <h1>Create a garage sale listing</h1>
      <p className="lede">
        Launch 1 uses a private manage link instead of accounts. Keep the share page link after creating your listing.
      </p>
      <SaleForm action={createSellerSale} />
    </main>
  );
}
