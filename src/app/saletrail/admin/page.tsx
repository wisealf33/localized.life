import Link from "next/link";
import type { ReactNode } from "react";
import { CopyIconButton } from "@/components/CopyIconButton";
import { SaleForm } from "@/components/SaleForm";
import { SiteHeader } from "@/components/SiteHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { adminLogin, adminLogout, isAdminAuthenticated } from "@/lib/admin";
import {
  approveClaim,
  createCommunitySale,
  rejectClaim,
  resolveListingRequest,
  updateOutreachStatus,
} from "@/lib/actions";
import { claimUrl, formatSaleHours, fullAddress, salePath, saleUrl } from "@/lib/format";
import { facebookDestinationInstruction, regionDestinationForSale } from "@/lib/regions";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import type { ClaimRequest, ListingRequest, OutreachStatus, Sale } from "@/lib/types";

type Props = {
  searchParams: Promise<{ approved?: string; manage?: string; updated?: string }>;
};

const outreachSaleColumns =
  "id, slug, title, description, address_line, city, state, zip, starts_at, ends_at, sale_schedule, categories, status, source_type, claim_status, visibility_status, source_platform, source_url, source_poster_name, source_notes, raw_source_text, outreach_status, outreach_last_at, outreach_notes, claimed_at, created_at, updated_at";

const outreachStatusLabels: Record<OutreachStatus, string> = {
  not_contacted: "Not contacted",
  message_sent: "Contacted by message",
  comment_posted: "Commented on original post",
  localized_group_posted: "Posted in Localized group",
  follow_up_needed: "Follow-up needed",
  claimed: "Claimed",
  do_not_contact: "Do not contact",
  removed: "Removed",
};

async function getQueues(enabled: boolean) {
  if (!enabled || !isSupabaseConfigured) return { outreach: [], claims: [], requests: [] };
  const supabase = getSupabaseAdmin();
  const [{ data: outreach }, { data: claims }, { data: requests }] = await Promise.all([
    supabase
      .from("sales")
      .select(outreachSaleColumns)
      .eq("source_type", "community_added")
      .neq("claim_status", "claimed")
      .neq("visibility_status", "removed")
      .order("outreach_status", { ascending: true })
      .order("starts_at", { ascending: true }),
    supabase
      .from("claim_requests")
      .select("*, sales(title, slug, city, state)")
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("listing_requests")
      .select("*, sales(title, slug, city, state)")
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  return {
    outreach: (outreach || []) as Sale[],
    claims: (claims || []) as ClaimRequest[],
    requests: (requests || []) as ListingRequest[],
  };
}

function outreachMessages(sale: Sale) {
  const listingUrl = saleUrl(sale);
  const saleClaimUrl = claimUrl(sale.slug);
  const when = formatSaleHours(sale);
  const location = fullAddress(sale);
  const destination = regionDestinationForSale(sale);
  const groupIntro = destination.isDedicated
    ? `Share/post this in ${destination.name}.`
    : `Share/post this in ${destination.name}. This area does not have a dedicated Localized SaleTrail group yet, so help grow SaleTrail in the ${destination.county}.`;

  return {
    privateMessage: `Hi! I’m building SaleTrail by Localized.life, a local garage sale directory and route planner. I added a basic community listing for your sale so shoppers can find it, save it, and add it to a route.\n\nYou can view it here:\n${listingUrl}\n\nIf this is your sale, you can claim it, update details, add photos, and get better visibility:\n${saleClaimUrl}\n\nIf you’d rather not have it listed, you can request removal from the listing page.`,
    originalPostComment: `I added this sale to SaleTrail by Localized.life so shoppers can save it and add it to a garage sale route:\n${listingUrl}\n\nOrganizer can claim, update, or request removal from the listing page.`,
    localizedGroupPost: `${groupIntro}\n\nCommunity-added garage sale listing:\n${sale.title}\n${when}\n${location}\n\nView/save it on SaleTrail:\n${listingUrl}\n\nOrganizer can claim the listing to update details, add photos, and improve visibility.`,
  };
}

function OutreachStatusButton({
  saleId,
  status,
  children,
}: {
  saleId: string;
  status: OutreachStatus;
  children: ReactNode;
}) {
  return (
    <form action={updateOutreachStatus}>
      <input type="hidden" name="sale_id" value={saleId} />
      <input type="hidden" name="outreach_status" value={status} />
      <button className={status === "do_not_contact" || status === "removed" ? "button danger" : "button"} type="submit">
        {children}
      </button>
    </form>
  );
}

function CopyOutreach({ label, text }: { label: string; text: string }) {
  return (
    <div className="copy-field outreach-copy">
      <label>{label}</label>
      <textarea readOnly rows={5} value={text} />
      <CopyIconButton text={text} label={`Copy ${label}`} />
    </div>
  );
}

export default async function AdminPage({ searchParams }: Props) {
  const params = await searchParams;
  const enabled = await isAdminAuthenticated();
  const { outreach, claims, requests } = await getQueues(enabled);

  return (
    <main className="page">
      <SiteHeader />
      <section className="stack">
        <p className="eyebrow">Admin</p>
        <h1>SaleTrail quick add and manual review</h1>
        <p>
          Use this only for manually reviewed public or community-submitted information. No scraping, automated imports,
          automated posting, or automated commenting.
        </p>
        {params.manage ? (
          <div className="notice good">
            Claim approved. Private manage/edit link:{" "}
            <Link href={`/saletrail/manage/${params.manage}`}>open private manage page</Link>. Send this only to the
            approved organizer. It should not be posted publicly.
          </div>
        ) : null}
        {enabled ? (
          <form action={adminLogout}>
            <button className="button ghost" type="submit">
              Sign out of admin
            </button>
          </form>
        ) : null}
      </section>

      {!enabled ? (
        <section className="panel">
          <h2>Admin sign in</h2>
          <form action={adminLogin} className="form">
            <label>
              Admin password
              <input name="admin_password" type="password" required />
            </label>
            <button className="button primary" type="submit">
              Open admin tools
            </button>
          </form>
        </section>
      ) : (
        <div className="admin-sections">
          <section className="panel">
            <h2>Admin quick add</h2>
            <SaleForm action={createCommunitySale} admin />
          </section>

          <section className="panel stack">
            <div>
              <p className="eyebrow">Manual tracking</p>
              <h2>Outreach queue</h2>
              <p className="muted">
                Community-added, unclaimed listings that may need manual outreach. This queue only helps you copy text
                and track what you did outside the app.
              </p>
            </div>
            {outreach.length === 0 ? <p className="muted">No community-added listings need outreach.</p> : null}
            {outreach.map((sale) => {
              const messages = outreachMessages(sale);
              const outreachStatus: OutreachStatus = sale.outreach_status || "not_contacted";
              const destination = regionDestinationForSale(sale);

              return (
                <article className="card outreach-card" key={sale.id}>
                  <div className="card-top">
                    <div>
                      <StatusBadge sale={sale} />
                      <h3>{sale.title}</h3>
                      <p className="muted">
                        {sale.city}, {sale.state} · <span className="whitespace">{formatSaleHours(sale)}</span>
                      </p>
                    </div>
                    <span className="badge plain">{outreachStatusLabels[outreachStatus]}</span>
                  </div>

                  <div className="admin-meta-grid">
                    <p>
                      <strong>Public listing</strong>
                      <Link className="text-link" href={salePath(sale)} target="_blank" rel="noopener noreferrer">
                        {saleUrl(sale)}
                      </Link>
                    </p>
                    <p>
                      <strong>Source platform</strong>
                      {sale.source_platform || "Not saved"}
                    </p>
                    <p>
                      <strong>Source poster</strong>
                      {sale.source_poster_name || "Not saved"}
                    </p>
                    <p>
                      <strong>Claim status</strong>
                      {sale.claim_status}
                    </p>
                    {sale.source_url ? (
                      <p>
                        <strong>Source URL</strong>
                        <a className="text-link" href={sale.source_url} target="_blank" rel="noopener noreferrer">
                          Open source
                        </a>
                      </p>
                    ) : null}
                    <p>
                      <strong>Last outreach</strong>
                      {sale.outreach_last_at ? new Date(sale.outreach_last_at).toLocaleString() : "Not recorded"}
                    </p>
                    <p>
                      <strong>Facebook destination</strong>
                      {destination.url ? (
                        <a className="text-link" href={destination.url} target="_blank" rel="noopener noreferrer">
                          {destination.name}
                        </a>
                      ) : (
                        destination.name
                      )}
                      <span>{facebookDestinationInstruction(sale)}</span>
                    </p>
                  </div>

                  {sale.source_notes || sale.raw_source_text || sale.outreach_notes ? (
                    <details className="admin-details">
                      <summary>Source and outreach notes</summary>
                      {sale.source_notes ? <p className="whitespace">{sale.source_notes}</p> : null}
                      {sale.raw_source_text ? <p className="whitespace">{sale.raw_source_text}</p> : null}
                      {sale.outreach_notes ? <p className="whitespace">Outreach notes: {sale.outreach_notes}</p> : null}
                    </details>
                  ) : null}

                  <div className="grid three">
                    <CopyOutreach label="Private message" text={messages.privateMessage} />
                    <CopyOutreach label="Original-post comment" text={messages.originalPostComment} />
                    <CopyOutreach label="Localized group post/comment" text={messages.localizedGroupPost} />
                  </div>

                  <form action={updateOutreachStatus} className="outreach-note-form">
                    <input type="hidden" name="sale_id" value={sale.id} />
                    <input type="hidden" name="outreach_status" value={outreachStatus} />
                    <label>
                      Outreach note
                      <textarea name="outreach_notes" rows={2} defaultValue={sale.outreach_notes || ""} />
                    </label>
                    <button className="button" type="submit">
                      Save note
                    </button>
                  </form>

                  <div className="outreach-actions">
                    <OutreachStatusButton saleId={sale.id} status="not_contacted">
                      Mark not contacted
                    </OutreachStatusButton>
                    <OutreachStatusButton saleId={sale.id} status="message_sent">
                      Mark message sent
                    </OutreachStatusButton>
                    <OutreachStatusButton saleId={sale.id} status="comment_posted">
                      Mark comment posted
                    </OutreachStatusButton>
                    <OutreachStatusButton saleId={sale.id} status="localized_group_posted">
                      Mark group posted
                    </OutreachStatusButton>
                    <OutreachStatusButton saleId={sale.id} status="follow_up_needed">
                      Mark follow-up needed
                    </OutreachStatusButton>
                    <OutreachStatusButton saleId={sale.id} status="do_not_contact">
                      Mark do not contact
                    </OutreachStatusButton>
                    <OutreachStatusButton saleId={sale.id} status="removed">
                      Mark removed
                    </OutreachStatusButton>
                  </div>
                </article>
              );
            })}
          </section>

          <section className="grid two">
            <div className="panel stack">
              <h3>Claims</h3>
              {claims.length === 0 ? <p className="muted">No pending claims.</p> : null}
              {claims.map((claim) => (
                <article className="card compact" key={claim.id}>
                  <div>
                    <p className="eyebrow">Listing ID: {claim.claim_code}</p>
                    <h3>{claim.sales?.title}</h3>
                    <p>{claim.name} · {claim.claimant_email || claim.contact}</p>
                    <p>Claim type: original Facebook poster</p>
                    {claim.facebook_profile_name ? <p>Facebook: {claim.facebook_profile_name}</p> : null}
                    {claim.verification_method ? <p>Public method: {claim.verification_method}</p> : null}
                    {claim.wants_updates ? <p>Opted into updates</p> : null}
                    {claim.message ? <p>{claim.message}</p> : null}
                  </div>
                  <div className="inline-form">
                    <form action={approveClaim}>
                      <input type="hidden" name="request_id" value={claim.id} />
                      <button className="button primary" type="submit">
                        Approve
                      </button>
                    </form>
                    <form action={rejectClaim}>
                      <input type="hidden" name="request_id" value={claim.id} />
                      <button className="button danger" type="submit">
                        Decline
                      </button>
                    </form>
                  </div>
                </article>
              ))}
            </div>

            <div className="panel stack">
              <h3>Corrections and removals</h3>
              {requests.length === 0 ? <p className="muted">No pending listing requests.</p> : null}
              {requests.map((request) => (
                <article className="card compact" key={request.id}>
                  <div>
                    <p className="eyebrow">{request.request_type}</p>
                    <h3>{request.sales?.title}</h3>
                    <p>{request.name || "No name"} · {request.contact || "No contact"}</p>
                    <p>{request.message}</p>
                  </div>
                  <form action={resolveListingRequest} className="inline-form">
                    <input type="hidden" name="request_id" value={request.id} />
                    <select name="status" defaultValue="resolved">
                      <option value="resolved">Resolved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                    <button className="button primary" type="submit">
                      Update
                    </button>
                  </form>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
