import { notFound } from "next/navigation";
import Link from "next/link";
import { CopyIconButton } from "@/components/CopyIconButton";
import { submitClaimRequest } from "@/lib/actions";
import { listingId, publicClaimMessage } from "@/lib/format";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import type { Sale } from "@/lib/types";

const defaultLocalizedGroupUrl = "https://www.facebook.com/groups/955521984061525";

const claimSaleColumns =
  "id, slug, title, description, address_line, city, state, zip, starts_at, ends_at, sale_schedule, categories, status, source_type, source_url, claim_status, visibility_status, claimed_at, created_at, updated_at";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ submitted?: string; email?: string }>;
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
  const localizedGroupUrl = process.env.NEXT_PUBLIC_LOCALIZED_FACEBOOK_GROUP_URL || defaultLocalizedGroupUrl;

  if (query.submitted) {
    return (
      <main className="page narrow">
        <p className="eyebrow">Claim request submitted</p>
        <h1>Finish your claim on Facebook</h1>
        <p className="lede">
          Copy the message below, then make a new post in the Localized.life Facebook group. You can also paste it as a
          comment on your original garage sale post to promote the listing.
        </p>
        <section className="panel stack">
          <div className="notice">
            The SaleTrail Listing ID is public and safe to post. The private manage/edit link is different and should
            only be used after admin approval.
            {query.email === "sent"
              ? " These instructions were also emailed to the address you submitted."
              : " Email delivery is being set up, so keep this page open until you finish posting."}
          </div>
          <div className="copy-line">
            <p>
              SaleTrail Listing ID: <strong>{publicListingId}</strong>
            </p>
            <CopyIconButton text={publicListingId} label="Copy Listing ID" />
          </div>
          <div className="copy-field">
            <label htmlFor="public-claim-message">Public message to post</label>
            <textarea id="public-claim-message" readOnly rows={5} value={message} />
            <CopyIconButton text={message} label="Copy public claim message" />
          </div>
          <div className="grid two">
            <div className="card claim-step-card primary-step">
              <p className="eyebrow">Next step</p>
              <h2>Post in Localized Will County Garage Sales & SaleTrail</h2>
              <p>Open the local Facebook group and create a new post with this message so admin can find it easily.</p>
              {localizedGroupUrl ? (
                <a className="button primary" href={localizedGroupUrl} target="_blank" rel="noopener noreferrer">
                  Post to Localized Facebook group
                </a>
              ) : (
                <div className="notice">The Localized.life group link has not been added yet.</div>
              )}
            </div>
            <div className="card claim-step-card">
              <p className="eyebrow">Optional</p>
              <h2>Promote it on the original post</h2>
              <p>You can also paste the message as a comment on your original Facebook sale post so shoppers there can save it.</p>
              {sale.source_url ? (
                <a className="button" href={sale.source_url} target="_blank" rel="noopener noreferrer">
                  Open original Facebook post
                </a>
              ) : (
                <div className="notice">This listing does not have the original Facebook link saved yet.</div>
              )}
            </div>
          </div>
          <div className="toolbar">
            <Link className="button primary" href={`/saletrail/sale/${sale.slug}`}>
              Done
            </Link>
          </div>
          <div className="notice good">
            After admin approval, the listing becomes claimed and the organizer receives a private manage/edit link.
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
        <div className="notice">
          Claims are currently for the original Facebook poster only, because admin verifies by matching the public
          Facebook name/profile with the original post.
        </div>
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
