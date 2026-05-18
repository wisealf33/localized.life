import Link from "next/link";
import type { Metadata } from "next";
import { ConfigNotice } from "@/components/ConfigNotice";
import { SaveSaleButton } from "@/components/SaveSaleButton";
import { SiteHeader } from "@/components/SiteHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { categoryOptions, formatSaleHours, fullAddress, mapSearchUrl, salePath } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";
import { salePreviewImage } from "@/lib/share";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import type { Sale } from "@/lib/types";

const publicSaleColumns =
  "id, slug, title, description, address_line, city, state, zip, latitude, longitude, location_precision, starts_at, ends_at, sale_schedule, photo_urls, categories, status, source_type, claim_status, visibility_status, claimed_at, created_at, updated_at";

type Props = {
  searchParams: Promise<{ q?: string; date?: string; category?: string; page?: string; perPage?: string }>;
};

export const metadata: Metadata = pageMetadata({
  title: "Find garage sales near you | SaleTrail",
  description:
    "Search upcoming garage sales, yard sales, estate sales, and community-added listings. Save sales to a route and open the route in Google Maps.",
  path: "/saletrail",
  image: "/og/default-saletrail.jpg",
});

const pageSizes = [10, 20, 50];

function numberParam(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function pageSizeParam(value: string | undefined) {
  const parsed = numberParam(value, 10);
  return pageSizes.includes(parsed) ? parsed : 10;
}

function directoryUrl(params: { q?: string; date?: string; category?: string; page?: number; perPage?: number }) {
  const next = new URLSearchParams();
  if (params.q) next.set("q", params.q);
  if (params.date) next.set("date", params.date);
  if (params.category) next.set("category", params.category);
  if (params.perPage && params.perPage !== 10) next.set("perPage", String(params.perPage));
  if (params.page && params.page > 1) next.set("page", String(params.page));
  const query = next.toString();
  return query ? `/saletrail?${query}` : "/saletrail";
}

function categoryParam(value: string | undefined) {
  return value && categoryOptions.includes(value) ? value : "";
}

async function getSales(q?: string, date?: string, category?: string, page = 1, perPage = 10) {
  if (!isSupabaseConfigured) return { sales: [], total: 0 };

  const supabase = getSupabaseAdmin();
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  let query = supabase
    .from("sales")
    .select(publicSaleColumns, { count: "exact" })
    .eq("visibility_status", "public")
    .eq("status", "active")
    .gte("ends_at", new Date().toISOString())
    .order("source_type", { ascending: false })
    .order("claim_status", { ascending: true })
    .order("starts_at", { ascending: true })
    .range(from, to);

  if (q) {
    query = query.or(`city.ilike.%${q}%,state.ilike.%${q}%,zip.ilike.%${q}%,title.ilike.%${q}%`);
  }

  if (date) {
    query = query.lte("starts_at", `${date}T23:59:59`).gte("ends_at", `${date}T00:00:00`);
  }

  if (category) {
    query = query.contains("categories", [category]);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return {
    sales: ((data as Sale[]) || []).sort((a, b) => visibilityRank(a) - visibilityRank(b)),
    total: count || 0,
  };
}

function visibilityRank(sale: Pick<Sale, "source_type" | "claim_status">) {
  if (sale.source_type === "seller_created") return 0;
  if (sale.claim_status === "claimed") return 1;
  if (sale.claim_status === "claim_pending") return 2;
  return 3;
}

function canClaim(sale: Pick<Sale, "source_type" | "claim_status">) {
  return sale.source_type === "community_added" && sale.claim_status !== "claimed";
}

export default async function SaleTrailHome({ searchParams }: Props) {
  const params = await searchParams;
  const perPage = pageSizeParam(params.perPage);
  const currentPage = numberParam(params.page, 1);
  const category = categoryParam(params.category);
  const { sales, total } = await getSales(params.q, params.date, category, currentPage, perPage);
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(currentPage, totalPages);
  const resultStart = total === 0 ? 0 : (safePage - 1) * perPage + 1;
  const resultEnd = Math.min(safePage * perPage, total);
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);
  const feedbackEmail = process.env.NEXT_PUBLIC_FEEDBACK_EMAIL || "claims@localized.life";
  const feedbackHref = `mailto:${feedbackEmail}?subject=${encodeURIComponent("SaleTrail feedback")}`;

  return (
    <main className="page">
      <SiteHeader active="find" />
      <ConfigNotice />
      <section className="hero">
        <p className="eyebrow">SaleTrail by Localized.life</p>
        <h1>Find garage sales and build a simple route.</h1>
        <p>
          A clean directory for local garage sales, including seller-created listings and clearly labeled
          community-added listings.
        </p>
        <div className="toolbar">
          <Link className="button primary" href="/saletrail/map">
            View map
          </Link>
          <Link className="button" href="/saletrail/route">
            My route
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
          <label>
            Sale type
            <select name="category" defaultValue={category}>
              <option value="">Any type</option>
              {categoryOptions.map((option) => (
                <option value={option} key={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <input name="perPage" type="hidden" value={perPage} />
          <button className="button primary" type="submit">
            Search
          </button>
        </form>
      </section>

      <section className="directory-controls">
        <p className="muted">
          {total === 0 ? "No listings to show." : `Showing ${resultStart}-${resultEnd} of ${total} listings.`}
        </p>
        <form className="per-page-form">
          {params.q ? <input name="q" type="hidden" value={params.q} /> : null}
          {params.date ? <input name="date" type="hidden" value={params.date} /> : null}
          {category ? <input name="category" type="hidden" value={category} /> : null}
          <label>
            Listings per page
            <select name="perPage" defaultValue={perPage}>
              {pageSizes.map((size) => (
                <option value={size} key={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          <button className="button" type="submit">
            Apply
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
          sales.map((sale) => {
            const image = salePreviewImage(sale);

            return (
              <article className="card sale-card" key={sale.id}>
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="sale-card-image" src={image.src} alt={`${sale.title} preview`} />
                ) : null}
                <div className="card-top">
                  <StatusBadge sale={sale} />
                  <span className="muted">
                    {sale.city}, {sale.state}
                  </span>
                </div>
                <h2>
                  <Link href={salePath(sale)}>{sale.title}</Link>
                </h2>
                <p>{formatSaleHours(sale)}</p>
                <p>
                  <a className="text-link sale-card-address" href={mapSearchUrl(sale)} target="_blank" rel="noopener noreferrer">
                    {fullAddress(sale)}
                  </a>
                </p>
                <div className="sale-card-footer">
                  {sale.categories?.length ? <p className="tags">{sale.categories.join(" · ")}</p> : null}
                  <div className="card-actions">
                    <Link className="button primary" href={salePath(sale)}>
                      View listing
                    </Link>
                    <SaveSaleButton
                      sale={{
                        slug: sale.slug,
                        title: sale.title,
                        address: fullAddress(sale),
                        city: sale.city,
                        state: sale.state,
                        startsAt: sale.starts_at,
                        href: salePath(sale),
                        latitude: sale.latitude,
                        longitude: sale.longitude,
                        locationPrecision: sale.location_precision,
                      }}
                      variant="secondary"
                    />
                    {canClaim(sale) ? (
                      <Link className="quiet-link" href={`/saletrail/claim/${sale.slug}`}>
                        Claim listing
                      </Link>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>

      {totalPages > 1 ? (
        <nav className="pagination" aria-label="Listings pages">
          {safePage > 1 ? (
            <Link
              className="button"
              href={directoryUrl({ q: params.q, date: params.date, category, perPage, page: safePage - 1 })}
            >
              Previous
            </Link>
          ) : (
            <span className="button disabled">Previous</span>
          )}
          <div className="pagination-pages" aria-label={`Page ${safePage} of ${totalPages}`}>
            {pageNumbers.map((pageNumber) =>
              pageNumber === safePage ? (
                <span className="page-link active" aria-current="page" key={pageNumber}>
                  {pageNumber}
                </span>
              ) : (
                <Link
                  className="page-link"
                  href={directoryUrl({ q: params.q, date: params.date, category, perPage, page: pageNumber })}
                  key={pageNumber}
                >
                  {pageNumber}
                </Link>
              ),
            )}
          </div>
          {safePage < totalPages ? (
            <Link
              className="button"
              href={directoryUrl({ q: params.q, date: params.date, category, perPage, page: safePage + 1 })}
            >
              Next
            </Link>
          ) : (
            <span className="button disabled">Next</span>
          )}
        </nav>
      ) : null}

      <section className="feedback-panel">
        <div>
          <p className="eyebrow">New and growing</p>
          <h2>Help shape SaleTrail</h2>
          <p>
            This is a new fast-growing website, and features are being added daily. Request a feature or report a bug so
            we know what to improve next.
          </p>
        </div>
        <a className="button primary" href={feedbackHref}>
          Request a feature or report a bug
        </a>
      </section>
    </main>
  );
}
