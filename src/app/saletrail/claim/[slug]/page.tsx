import { notFound } from "next/navigation";
import { submitClaimRequest } from "@/lib/actions";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import type { Sale } from "@/lib/types";

const claimSaleColumns =
  "id, slug, title, description, address_line, city, state, zip, starts_at, ends_at, sale_schedule, categories, status, source_type, claim_status, visibility_status, claimed_at, created_at, updated_at";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ code?: string }>;
};

async function getSale(slug: string) {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await getSupabaseAdmin()
    .from("sales")
    .select(claimSaleColumns)
    .eq("slug", slug)
    .eq("visibility_status", "public")
    .single();
  if (error || !data) return null;
  return data as Sale;
}

export default async function ClaimPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;
  const sale = await getSale(slug);
  if (!sale) notFound();

  if (query.code) {
    return (
      <main className="page narrow">
        <p className="eyebrow">Claim request submitted</p>
        <h1>Your claim code is {query.code}</h1>
        <div className="notice good">
          Use this code to prove connection to the sale. An admin can approve the claim after you message from the
          original post account, comment the code on the original post, verify through listed email/phone, or provide
          enough sale-specific details for manual review.
        </div>
      </main>
    );
  }

  return (
    <main className="page narrow">
      <p className="eyebrow">Claim listing</p>
      <h1>{sale.title}</h1>
      <p className="lede">
        Claiming is manually reviewed. If approved, the organizer receives a private manage link.
      </p>
      <form action={submitClaimRequest} className="form">
        <input type="hidden" name="slug" value={sale.slug} />
        <label>
          Name
          <input name="name" required />
        </label>
        <label>
          Email or phone
          <input name="contact" required />
        </label>
        <label>
          Relationship to sale
          <select name="relationship" required>
            <option value="organizer">Organizer</option>
            <option value="household_member">Household member</option>
            <option value="helper">Helper</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label>
          Details for manual review
          <textarea name="message" rows={5} placeholder="How can we verify this sale is yours?" />
        </label>
        <button className="button primary" type="submit">
          Submit claim request
        </button>
      </form>
    </main>
  );
}
