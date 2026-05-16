import { notFound } from "next/navigation";
import { submitClaimRequest } from "@/lib/actions";
import { listingId, publicClaimMessage } from "@/lib/format";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import type { Sale } from "@/lib/types";

const claimSaleColumns =
  "id, slug, title, description, address_line, city, state, zip, starts_at, ends_at, sale_schedule, categories, status, source_type, claim_status, visibility_status, claimed_at, created_at, updated_at";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ submitted?: string }>;
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

  const message = publicClaimMessage(sale.slug);
  const publicListingId = listingId(sale.slug);

  if (query.submitted) {
    return (
      <main className="page narrow">
        <p className="eyebrow">Claim request submitted</p>
        <h1>Post the public claim message</h1>
        <p className="lede">
          This Listing ID is public. The private manage/edit link is separate and should only be used after admin
          approval.
        </p>
        <section className="panel stack">
          <p>
            SaleTrail Listing ID: <strong>{publicListingId}</strong>
          </p>
          <label>
            Public claim/share message
            <textarea readOnly rows={5} value={message} />
          </label>
          <div className="notice good">
            Post this message by commenting on the original Facebook garage sale post or by posting/commenting in the
            appropriate Localized Facebook group. Admin will manually review the public post/comment before approving.
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page narrow">
      <p className="eyebrow">Claim listing</p>
      <h1>{sale.title}</h1>
      <p className="lede">
        Claiming is manually reviewed. If approved, the organizer receives a private manage/edit link. Do not post the
        private manage link publicly.
      </p>
      <div className="notice">
        SaleTrail Listing ID: <strong>{publicListingId}</strong>
      </div>
      <form action={submitClaimRequest} className="form">
        <input type="hidden" name="slug" value={sale.slug} />
        <label>
          Name
          <input name="name" required />
        </label>
        <label>
          Email
          <input name="claimant_email" type="email" required />
        </label>
        <label>
          Facebook profile name
          <input name="facebook_profile_name" required />
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
          Where will you post the public claim message?
          <select name="verification_method" required>
            <option value="original_post_comment">Original Facebook garage sale post comment</option>
            <option value="localized_group_post">Localized Facebook group post/comment</option>
          </select>
        </label>
        <label className="check">
          <input type="checkbox" name="wants_updates" />
          Send me occasional Localized.life / SaleTrail updates
        </label>
        <label>
          Optional note
          <textarea name="message" rows={4} placeholder="Anything admin should know before reviewing?" />
        </label>
        <label>
          Public claim/share message
          <textarea readOnly rows={5} value={message} />
        </label>
        <button className="button primary" type="submit">
          Submit claim request
        </button>
      </form>
    </main>
  );
}
