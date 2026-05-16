import { ConfigNotice } from "@/components/ConfigNotice";
import { SaleForm } from "@/components/SaleForm";
import { createSellerSale } from "@/lib/actions";

export default function NewSalePage() {
  return (
    <main className="page narrow">
      <ConfigNotice />
      <p className="eyebrow">SaleTrail by Localized.Life</p>
      <h1>Create a garage sale listing</h1>
      <p className="lede">
        Launch 1 uses a private manage link instead of accounts. Keep the share page link after creating your listing.
      </p>
      <SaleForm action={createSellerSale} />
    </main>
  );
}
