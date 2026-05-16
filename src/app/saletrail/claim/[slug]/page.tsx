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
  const localizedGroupUrl = process.env.NEXT_PUBLIC_LOCALIZED_FACEBOOK_GROUP_URL;

  if (query.submitted) {
    return (
      <main className="page narrow">
        <p className="eyebrow">Claim request submitted</p>
        <h1>Post the public claim message</h1>
        <p className="lede">
          Your request is in the admin review queue. To finish the claim, publicly post the message below so an admin
          can confirm that the person claiming the listing is connected to the original sale.
        </p>
        <section className="panel stack">
          <div className="notice">
            This SaleTrail Listing ID is public and safe to post. The private manage/edit link is different and is only
            sent or shown after admin approval.
          </div>
          <p>
            SaleTrail Listing ID: <strong>{publicListingId}</strong>
          </p>
          <label>
            Public claim/share message
            <textarea readOnly rows={5} value={message} />
          </label>
          <div className="grid two">
            <div className="card">
              <p className="eyebrow">Option 1</p>
              <h2>Comment on the original post</h2>
              <p>
                Paste the message as a comment on the original Facebook garage sale post. This is the clearest way to
                show you can speak from the original sale context.
              </p>
            </div>
            <div className="card">
              <p className="eyebrow">Option 2</p>
              <h2>Post in the Localized group</h2>
              <p>
                Paste the message in the appropriate Localized.life local Facebook group. Admin will check that public
                post/comment before approving.
              </p>
              {localizedGroupUrl ? (
                <a className="button" href={localizedGroupUrl} target="_blank" rel="noopener noreferrer">
                  Open Localized group
                </a>
              ) : null}
            </div>
          </div>
          <div className="notice good">
            After admin approval, the listing becomes claimed and the organizer receives a private manage/edit link. Do
            not post that private link publicly.
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
        Step 1: tell us who is claiming this listing. Step 2 will give you a public message to post on Facebook so admin
        can manually confirm the claim.
      </p>
      <div className="notice">
        SaleTrail Listing ID: <strong>{publicListingId}</strong>. This ID is public. The private manage/edit link is only
        provided after approval.
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
        <label className="check">
          <input type="checkbox" name="wants_updates" />
          Send me occasional Localized.life / SaleTrail updates
        </label>
        <label>
          Optional note
          <textarea name="message" rows={4} placeholder="Anything admin should know before reviewing?" />
        </label>
        <button className="button primary" type="submit">
          Continue to claim instructions
        </button>
      </form>
    </main>
  );
}
