import Link from "next/link";
import { SaleForm } from "@/components/SaleForm";
import { adminLogin, adminLogout, isAdminAuthenticated } from "@/lib/admin";
import { approveClaim, createCommunitySale, resolveListingRequest } from "@/lib/actions";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import type { ClaimRequest, ListingRequest } from "@/lib/types";

type Props = {
  searchParams: Promise<{ approved?: string; manage?: string; updated?: string }>;
};

async function getQueues(enabled: boolean) {
  if (!enabled || !isSupabaseConfigured) return { claims: [], requests: [] };
  const supabase = getSupabaseAdmin();
  const [{ data: claims }, { data: requests }] = await Promise.all([
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
    claims: (claims || []) as ClaimRequest[],
    requests: (requests || []) as ListingRequest[],
  };
}

export default async function AdminPage({ searchParams }: Props) {
  const params = await searchParams;
  const enabled = await isAdminAuthenticated();
  const { claims, requests } = await getQueues(enabled);

  return (
    <main className="page">
      <section className="stack">
        <p className="eyebrow">Admin</p>
        <h1>SaleTrail quick add and manual review</h1>
        <p>
          Use this only for manually reviewed public or community-submitted information. No scraping, automated imports,
          automated posting, or automated commenting.
        </p>
        {params.manage ? (
          <div className="notice good">
            Claim approved. Private manage link: <Link href={`/saletrail/manage/${params.manage}`}>open manage page</Link>
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
        <section className="grid two">
          <div className="panel">
            <h2>Admin quick add</h2>
            <SaleForm action={createCommunitySale} admin />
          </div>

          <div className="panel stack">
            <h2>Review queues</h2>
              <h3>Claims</h3>
              {claims.length === 0 ? <p className="muted">No pending claims.</p> : null}
              {claims.map((claim) => (
                <article className="card compact" key={claim.id}>
                  <div>
                    <p className="eyebrow">{claim.claim_code}</p>
                    <h3>{claim.sales?.title}</h3>
                    <p>{claim.name} · {claim.contact} · {claim.relationship}</p>
                    {claim.message ? <p>{claim.message}</p> : null}
                  </div>
                  <form action={approveClaim} className="inline-form">
                    <input type="hidden" name="request_id" value={claim.id} />
                    <button className="button primary" type="submit">
                      Approve
                    </button>
                  </form>
                </article>
              ))}

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
      )}
    </main>
  );
}
