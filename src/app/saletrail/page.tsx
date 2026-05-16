import Link from "next/link";
import { ConfigNotice } from "@/components/ConfigNotice";
import { StatusBadge } from "@/components/StatusBadge";
import { formatSaleHours, fullAddress, mapSearchUrl } from "@/lib/format";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import type { Sale } from "@/lib/types";

const publicSaleColumns =
  "id, slug, title, description, address_line, city, state, zip, starts_at, ends_at, sale_schedule, categories, status, source_type, claim_status, visibility_status, claimed_at, created_at, updated_at";

type Props = {
  searchParams: Promise<{ q?: string; date?: string }>;
};

async function getSales(q?: string, date?: string) {
  if (!isSupabaseConfigured) return [];

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("sales")
    .select(publicSaleColumns)
    .eq("visibility_status", "public")
    .eq("status", "active")
    .order("claim_status", { ascending: true })
    .order("starts_at", { ascending: true })
    .limit(50);

  if (q) {
    query = query.or(`city.ilike.%${q}%,state.ilike.%${q}%,zip.ilike.%${q}%,title.ilike.%${q}%`);
  }

  if (date) {
    query = query.gte("starts_at", `${date}T00:00:00`).lte("starts_at", `${date}T23:59:59`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return ((data as Sale[]) || []).sort((a, b) => visibilityRank(a) - visibilityRank(b));
}

function visibilityRank(sale: Pick<Sale, "source_type" | "claim_status">) {
  if (sale.source_type === "seller_created") return 0;
  if (sale.claim_status === "claimed") return 1;
  if (sale.claim_status === "claim_pending") return 2;
  return 3;
}

export default async function SaleTrailHome({ searchParams }: Props) {
  const params = await searchParams;
  const sales = await getSales(params.q, params.date);

  return (
    <main className="page">
      <ConfigNotice />
      <section className="hero">
        <p className="eyebrow">SaleTrail by Localized.life</p>
        <h1>Find garage sales and build a simple route.</h1>
        <p>
          A clean directory for local garage sales, including seller-created listings and clearly labeled
          community-added listings.
        </p>
        <div className="toolbar">
          <Link className="button primary" href="/saletrail/new">
            Create a listing
          </Link>
          <Link className="button" href="/saletrail/route">
            View route
          </Link>
        </div>
      </section>

      <section className="panel">
        <form className="search">
          <label>
            City, state, ZIP, or keyword
            <input name="q" defaultValue={params.q || ""} placeholder="Austin, TX or 78704" />
          </label>
          <label>
            Date
            <input name="date" type="date" defaultValue={params.date || ""} />
          </label>
          <button className="button primary" type="submit">
            Search
          </button>
        </form>
      </section>

      <section className="list">
        {sales.length === 0 ? (
          <div className="empty">
            <h2>No active listings found</h2>
            <p>Try another city or add the first sale for your area.</p>
          </div>
        ) : (
          sales.map((sale) => (
            <article className="card" key={sale.id}>
              <div className="card-top">
                <StatusBadge sale={sale} />
                <span className="muted">{sale.city}, {sale.state}</span>
              </div>
              <h2>
                <Link href={`/saletrail/sale/${sale.slug}`}>{sale.title}</Link>
              </h2>
              <p>{formatSaleHours(sale)}</p>
              <p className="muted">
                <a className="text-link" href={mapSearchUrl(sale)} target="_blank" rel="noopener noreferrer">
                  {fullAddress(sale)}
                </a>
              </p>
              {sale.categories?.length ? <p className="tags">{sale.categories.join(" · ")}</p> : null}
            </article>
          ))
        )}
      </section>
    </main>
  );
}
