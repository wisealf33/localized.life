import Link from "next/link";
import type { ReactNode } from "react";
import { CopyIconButton } from "@/components/CopyIconButton";
import { SaleForm } from "@/components/SaleForm";
import { SiteHeader } from "@/components/SiteHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { adminLogin, adminLogout, isAdminAuthenticated } from "@/lib/admin";
import {
  approveClaim,
  createCommunitySalesBatch,
  createCommunitySale,
  rejectClaim,
  resolveListingRequest,
  updateOutreachStatus,
} from "@/lib/actions";
import { claimUrl, formatSaleHours, fullAddress, salePath, saleUrl } from "@/lib/format";
import { facebookDestinationInstruction, regionDestinationForSale } from "@/lib/regions";
import { salePreviewImageNeed } from "@/lib/share";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import type { ClaimRequest, ListingRequest, OutreachStatus, Sale } from "@/lib/types";

type Props = {
  searchParams: Promise<{ approved?: string; manage?: string; updated?: string; batch?: string; skipped?: string }>;
};

const outreachSaleColumns =
  "id, slug, title, description, address_line, city, state, zip, starts_at, ends_at, sale_schedule, photo_urls, categories, status, source_type, claim_status, visibility_status, source_platform, source_url, source_poster_name, source_notes, raw_source_text, outreach_status, outreach_last_at, outreach_notes, claimed_at, created_at, updated_at";

const photoNeedSaleColumns =
  "id, slug, title, city, state, starts_at, ends_at, sale_schedule, photo_urls, status, source_type, claim_status, visibility_status";

const outreachStatusLabels: Record<OutreachStatus, string> = {
  not_contacted: "Not contacted",
  message_sent: "Contacted by message",
  comment_posted: "Commented on original post",
  localized_group_posted: "Posted in Localized group",
  follow_up_needed: "Follow-up needed",
  outreach_complete: "Outreach complete",
  claimed: "Claimed",
  do_not_contact: "Do not contact",
  removed: "Removed",
};

const completedOutreachStatuses = new Set<OutreachStatus>([
  "message_sent",
  "comment_posted",
  "localized_group_posted",
  "outreach_complete",
  "do_not_contact",
  "removed",
  "claimed",
]);

async function getQueues(enabled: boolean) {
  if (!enabled || !isSupabaseConfigured) return { outreach: [], claims: [], requests: [], photoSales: [] };
  const supabase = getSupabaseAdmin();
  const [{ data: outreach }, { data: claims }, { data: requests }, { data: photoSales }] = await Promise.all([
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
    supabase
      .from("sales")
      .select(photoNeedSaleColumns)
      .eq("visibility_status", "public")
      .eq("status", "active")
      .gte("ends_at", new Date().toISOString())
      .order("starts_at", { ascending: true }),
  ]);

  return {
    outreach: (outreach || []) as Sale[],
    claims: (claims || []) as ClaimRequest[],
    requests: (requests || []) as ListingRequest[],
    photoSales: (photoSales || []) as Sale[],
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
    privateMessage: `Hi! I’m building SaleTrail by Localized.life, a garage sale directory and route planner.\n\nI added a basic community listing for your sale so shoppers can find it, save it, and add it to a route.\n\nYou can view it here:\n${listingUrl}\n\nIf this is your sale, you can claim it, update details, add photos, and get better visibility:\n${saleClaimUrl}\n\nIf you’d rather not have it listed, you can request removal from the listing page.`,
    originalPostComment: `I added this sale to SaleTrail by Localized.life so shoppers can save it and add it to a garage sale route:\n${listingUrl}\n\nOrganizer can claim, update, or request removal from the listing page.`,
    localizedGroupPost: `${groupIntro}\n\nCommunity-added garage sale listing:\n${sale.title}\n${when}\n${location}\n\nView/save it on SaleTrail:\n${listingUrl}\n\nOrganizer can claim the listing to update details, add photos, and improve visibility.`,
  };
}

function OutreachStatusButton({
  saleId,
  status,
  children,
  primary = false,
}: {
  saleId: string;
  status: OutreachStatus;
  children: ReactNode;
  primary?: boolean;
}) {
  const className =
    status === "do_not_contact" || status === "removed" ? "button danger" : primary ? "button primary" : "button";

  return (
    <form action={updateOutreachStatus}>
      <input type="hidden" name="sale_id" value={saleId} />
      <input type="hidden" name="outreach_status" value={status} />
      <button className={className} type="submit">
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

function isExpired(sale: Pick<Sale, "ends_at">) {
  return new Date(sale.ends_at).getTime() < Date.now();
}

function photoNeeds(sales: Sale[]) {
  const needs = new Map<
    string,
    {
      scope: "town" | "county" | "mapping";
      label: string;
      filename: string;
      publicPath: string;
      sales: Sale[];
    }
  >();

  for (const sale of sales) {
    const need = salePreviewImageNeed(sale);
    if (!need) continue;
    const existing = needs.get(need.publicPath);
    if (existing) {
      existing.sales.push(sale);
      continue;
    }
    needs.set(need.publicPath, { ...need, sales: [sale] });
  }

  return Array.from(needs.values()).sort((a, b) => {
    if (a.scope !== b.scope) return a.scope === "town" ? -1 : 1;
    return a.label.localeCompare(b.label);
  });
}

function OutreachCard({ sale, completed = false }: { sale: Sale; completed?: boolean }) {
  const messages = outreachMessages(sale);
  const outreachStatus: OutreachStatus = sale.outreach_status || "not_contacted";
  const destination = regionDestinationForSale(sale);
  const destinationName = destination.isDedicated ? destination.name : "General Localized.life group/page";

  return (
    <article className={completed ? "card outreach-card completed" : "card outreach-card"}>
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

      <div className="admin-meta-grid primary-meta">
        <p>
          <strong>Public listing</strong>
          <Link className="text-link" href={salePath(sale)} target="_blank" rel="noopener noreferrer">
            {saleUrl(sale)}
          </Link>
        </p>
        <p>
          <strong>Facebook destination</strong>
          {destination.url ? (
            <a className="text-link" href={destination.url} target="_blank" rel="noopener noreferrer">
              {destinationName}
            </a>
          ) : (
            destinationName
          )}
          <span>{facebookDestinationInstruction(sale)}</span>
        </p>
      </div>

      <details className="admin-details">
        <summary>Source and outreach notes</summary>
        <div className="admin-meta-grid">
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
        </div>
        {sale.source_notes ? <p className="whitespace">{sale.source_notes}</p> : null}
        {sale.raw_source_text ? <p className="whitespace">{sale.raw_source_text}</p> : null}
        {sale.outreach_notes ? <p className="whitespace">Outreach notes: {sale.outreach_notes}</p> : null}
      </details>

      {!completed ? (
        <>
          <div className="grid two">
            <CopyOutreach label="Private message" text={messages.privateMessage} />
            <CopyOutreach label="Localized group post/comment" text={messages.localizedGroupPost} />
          </div>

          <details className="admin-details">
            <summary>More copy options</summary>
            <CopyOutreach label="Original-post comment" text={messages.originalPostComment} />
          </details>

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

          <div className="outreach-actions simplified">
            <OutreachStatusButton primary saleId={sale.id} status="outreach_complete">
              Mark outreach complete
            </OutreachStatusButton>
            <OutreachStatusButton saleId={sale.id} status="follow_up_needed">
              Needs follow-up
            </OutreachStatusButton>
            <OutreachStatusButton saleId={sale.id} status="do_not_contact">
              Do not contact
            </OutreachStatusButton>
            <OutreachStatusButton saleId={sale.id} status="removed">
              Remove/hide listing
            </OutreachStatusButton>
          </div>
        </>
      ) : null}
    </article>
  );
}

export default async function AdminPage({ searchParams }: Props) {
  const params = await searchParams;
  const enabled = await isAdminAuthenticated();
  const { outreach, claims, requests, photoSales } = await getQueues(enabled);
  const activeOutreach = outreach.filter(
    (sale) => !isExpired(sale) && !completedOutreachStatuses.has(sale.outreach_status || "not_contacted"),
  );
  const completedOutreach = outreach.filter(
    (sale) => !isExpired(sale) && completedOutreachStatuses.has(sale.outreach_status || "not_contacted"),
  );
  const expiredOutreach = outreach.filter((sale) => isExpired(sale));
  const missingPhotos = photoNeeds(photoSales);

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
        {params.batch ? (
          <div className="notice good">
            Batch import finished. Added {params.batch} listing{params.batch === "1" ? "" : "s"}
            {params.skipped && params.skipped !== "0" ? ` and skipped ${params.skipped} duplicate source link${params.skipped === "1" ? "" : "s"}` : ""}.
          </div>
        ) : null}
        {enabled ? (
          <form action={adminLogout}>
            <button className="button ghost" type="submit">
              Sign out of admin
            </button>
          </form>
        ) : null}
        {enabled ? (
          <nav className="admin-jump-nav" aria-label="Admin sections">
            <a href="#admin-claims">Claims ({claims.length})</a>
            <a href="#admin-requests">Corrections/removals ({requests.length})</a>
            <a href="#admin-photo-needs">Photo needs ({missingPhotos.length})</a>
            <a href="#admin-outreach">Outreach ({activeOutreach.length})</a>
            <a href="#admin-expired">Expired ({expiredOutreach.length})</a>
            <a href="#admin-batch">Batch add</a>
            <a href="#admin-quick-add">Quick add</a>
          </nav>
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
          <section className="grid two admin-priority-grid">
            <div className="panel stack admin-priority-panel" id="admin-claims">
              <div>
                <p className="eyebrow">Needs review</p>
                <h2>Claims</h2>
                <p className="muted">Review organizer claim requests first. Approving sends or shows the private manage link.</p>
              </div>
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

            <div className="panel stack" id="admin-requests">
              <div>
                <p className="eyebrow">Needs review</p>
                <h2>Corrections and removals</h2>
                <p className="muted">Handle organizer or community requests to correct or remove listings.</p>
              </div>
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

          <section className="panel stack" id="admin-photo-needs">
            <div>
              <p className="eyebrow">Branded image queue</p>
              <h2>Photos to create</h2>
              <p className="muted">
                Active listings without organizer-uploaded photos use branded fallback images. Will County is the open
                region, so only listings detected inside Will County get town image requests. Other areas use county
                images until that county is opened. If a town cannot be matched to a real county, it appears as a county
                mapping item instead of creating a fake county image request.
              </p>
            </div>
            {missingPhotos.length === 0 ? (
              <p className="muted">No missing fallback images for active listings.</p>
            ) : (
              <div className="grid two">
                {missingPhotos.map((need) => (
                  <article className="card photo-need-card" key={need.publicPath}>
                    <div className="card-top">
                      <div>
                        <p className="eyebrow">
                          {need.scope === "town"
                            ? "Town image"
                            : need.scope === "county"
                              ? "County image"
                              : "County mapping needed"}
                        </p>
                        <h3>{need.label}</h3>
                      </div>
                      <span className="badge plain">{need.sales.length} listing{need.sales.length === 1 ? "" : "s"}</span>
                    </div>
                    {need.scope === "mapping" ? (
                      <p className="muted">
                        This town needs a real official county added before a branded county image should be created.
                      </p>
                    ) : (
                      <>
                        <p>
                          <strong>Create file:</strong> <code>{need.filename}</code>
                        </p>
                        <p>
                          <strong>Add to:</strong> <code>public/og/{need.filename}</code>
                        </p>
                      </>
                    )}
                    <details className="admin-details">
                      <summary>Listings using this image</summary>
                      <ul className="plain-list">
                        {need.sales.map((sale) => (
                          <li key={sale.id}>
                            <Link className="text-link" href={salePath(sale)} target="_blank" rel="noopener noreferrer">
                              {sale.title}
                            </Link>{" "}
                            <span className="muted">({formatSaleHours(sale).replace(/\n/g, " ")})</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="panel stack" id="admin-outreach">
            <div>
              <p className="eyebrow">Manual tracking</p>
              <h2>Outreach queue</h2>
              <p className="muted">
                Community-added, unclaimed listings that may need manual outreach. This queue only helps you copy text
                and track what you did outside the app.
              </p>
            </div>
            <h3>Outreach needed</h3>
            {activeOutreach.length === 0 ? <p className="muted">No active outreach items.</p> : null}
            {activeOutreach.map((sale) => (
              <OutreachCard key={sale.id} sale={sale} />
            ))}

            {completedOutreach.length ? (
              <details className="admin-details completed-outreach">
                <summary>Completed outreach ({completedOutreach.length})</summary>
                <div className="stack">
                  {completedOutreach.map((sale) => (
                    <OutreachCard completed key={sale.id} sale={sale} />
                  ))}
                </div>
              </details>
            ) : null}

            {expiredOutreach.length ? (
              <details className="admin-details completed-outreach" id="admin-expired">
                <summary>Expired outreach archive ({expiredOutreach.length})</summary>
                <p className="muted">
                  These listings ended already, so they are hidden from active outreach. Keep them briefly for review,
                  then remove old unclaimed data during cleanup.
                </p>
                <div className="stack">
                  {expiredOutreach.map((sale) => (
                    <OutreachCard completed key={sale.id} sale={sale} />
                  ))}
                </div>
              </details>
            ) : null}
          </section>

          <details className="panel admin-tool-details" id="admin-batch" open>
            <summary>
              <span>
                <strong>Batch quick add</strong>
                <small>Import researched public-source listings in one paste.</small>
              </span>
            </summary>
            <form action={createCommunitySalesBatch} className="form">
              <label>
                Listing batch JSON
                <textarea
                  name="batch_json"
                  rows={12}
                  placeholder='[{"title":"Example garage sale","address_line":"123 Main St","city":"Joliet","state":"IL","zip":"60435","days":[{"date":"2026-05-23","start":"09:00","end":"15:00"}],"categories":["Garage sale","Home goods"],"source_platform":"Public source","source_url":"https://example.com/listing"}]'
                  required
                />
              </label>
              <button className="button primary" type="submit">
                Import batch
              </button>
            </form>
          </details>

          <details className="panel admin-tool-details" id="admin-quick-add">
            <summary>
              <span>
                <strong>Single quick add</strong>
                <small>Add one manually reviewed community listing.</small>
              </span>
            </summary>
            <SaleForm action={createCommunitySale} admin />
          </details>
        </div>
      )}
    </main>
  );
}
