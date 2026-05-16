import { notFound } from "next/navigation";
import Link from "next/link";
import { CopyIconButton } from "@/components/CopyIconButton";
import { submitClaimRequest } from "@/lib/actions";
import { listingId, publicClaimMessage } from "@/lib/format";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import type { Sale } from "@/lib/types";

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
  const localizedGroupUrl = process.env.NEXT_PUBLIC_LOCALIZED_FACEBOOK_GROUP_URL;

  if (query.submitted) {
    return (
      <main className="page narrow">
        <p className="eyebrow">Claim request submitted</p>
        <h1>Finish your claim on Facebook</h1>
        <p className="lede">
          Copy the message below, then post it in one of the two Facebook places. Admin will review the public post and
          approve the claim if it matches the original poster.
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
            <div className="card">
              <p className="eyebrow">Option 1</p>
              <h2>Comment on the original post</h2>
              <p>Open the original Facebook sale post, paste the message as a comment, then come back when finished.</p>
              {sale.source_url ? (
                <a className="button primary" href={sale.source_url} target="_blank" rel="noopener noreferrer">
                  Open original Facebook post
                </a>
              ) : (
                <div className="notice">This listing does not have the original Facebook link saved yet.</div>
              )}
            </div>
            <div className="card">
              <p className="eyebrow">Option 2</p>
              <h2>Post in the Localized.life group</h2>
              <p>Open the local Facebook group, paste the message as a post or comment, then come back when finished.</p>
              {localizedGroupUrl ? (
                <a className="button primary" href={localizedGroupUrl} target="_blank" rel="noopener noreferrer">
                  Open Localized.life group
                </a>
              ) : (
                <div className="notice">The Localized.life group link has not been added yet.</div>
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
