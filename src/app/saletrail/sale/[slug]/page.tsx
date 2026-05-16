import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SaveSaleButton } from "@/components/SaveSaleButton";
import { StatusBadge } from "@/components/StatusBadge";
import { formatSaleHours, fullAddress, mapSearchUrl } from "@/lib/format";
import { submitListingRequest } from "@/lib/actions";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import type { Sale } from "@/lib/types";

const publicSaleColumns =
  "id, slug, title, description, address_line, city, state, zip, starts_at, ends_at, sale_schedule, photo_urls, categories, status, source_type, claim_status, visibility_status, source_url, claimed_at, created_at, updated_at";
const publicSaleColumnsWithoutPhotos =
  "id, slug, title, description, address_line, city, state, zip, starts_at, ends_at, sale_schedule, categories, status, source_type, claim_status, visibility_status, source_url, claimed_at, created_at, updated_at";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ request?: string }>;
};

async function getSale(slug: string) {
  if (!isSupabaseConfigured) return null;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sales")
    .select(publicSaleColumns)
    .eq("slug", slug)
    .eq("visibility_status", "public")
    .single();

  if (error?.message.includes("photo_urls")) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("sales")
      .select(publicSaleColumnsWithoutPhotos)
      .eq("slug", slug)
      .eq("visibility_status", "public")
      .single();
    if (fallbackError || !fallbackData) return null;
    return { ...fallbackData, photo_urls: [] } as unknown as Sale;
  }

  if (error || !data) return null;
  return data as Sale;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const sale = await getSale(slug);
  if (!sale) {
    return {
      title: "Garage Sale Listing | SaleTrail",
    };
  }

  const title = `${sale.title} in ${sale.city}, ${sale.state} | SaleTrail`;
  const description = `${sale.title} in ${sale.city}, ${sale.state}. ${formatSaleHours(sale).replace(/\n/g, " ")} Address: ${fullAddress(sale)}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
    },
  };
}

export default async function SalePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;
  const sale = await getSale(slug);
  if (!sale) notFound();

  return (
    <main className="page narrow">
      {query.request === "received" ? <div className="notice good">Request received for manual review.</div> : null}

      <section className="stack">
        <div className="card-top">
          <StatusBadge sale={sale} />
          <Link className="button" href="/saletrail/route">
            View route
          </Link>
        </div>
        <h1>{sale.title}</h1>
        <p className="lede whitespace">{formatSaleHours(sale)}</p>
        <p>
          <a className="text-link" href={mapSearchUrl(sale)} target="_blank" rel="noopener noreferrer">
            {fullAddress(sale)}
          </a>
        </p>
        {sale.status !== "active" ? <div className="notice">This sale is marked {sale.status}.</div> : null}
        {sale.categories?.length ? <p className="tags">{sale.categories.join(" · ")}</p> : null}
        {sale.photo_urls?.length ? (
          <div className="photo-grid">
            {sale.photo_urls.slice(0, 2).map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt={`${sale.title} photo`} key={url} />
            ))}
          </div>
        ) : null}
        {sale.description ? <p>{sale.description}</p> : null}

        {sale.source_type !== "seller_created" && sale.claim_status !== "claimed" ? (
          <div className="notice stack small-gap">
            <p>
              This listing was added from publicly available or community-submitted information and has not yet been
              claimed by the organizer. Details may change. Are you the organizer? You can claim, correct, or request
              removal of this listing.
            </p>
            <p>
              Claiming asks for a public Facebook post/comment so admin can confirm the organizer. Correction and
              removal requests are reviewed privately through the form below.
            </p>
            {sale.source_url ? (
              <p>
                <a className="text-link" href={sale.source_url} target="_blank" rel="noopener noreferrer">
                  View original post
                </a>
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="toolbar">
          <SaveSaleButton
            sale={{
              slug: sale.slug,
              title: sale.title,
              address: fullAddress(sale),
              startsAt: sale.starts_at,
            }}
          />
          <Link className="button" href={`/saletrail/sale/${sale.slug}/share`}>
            Share kit
          </Link>
          {sale.claim_status !== "claimed" ? (
            <Link className="button" href={`/saletrail/claim/${sale.slug}`}>
              Claim this listing
            </Link>
          ) : null}
        </div>
      </section>

      <section className="panel">
        <h2>Suggest a correction or request removal</h2>
        <p className="muted">
          Use this private request if details are wrong or if you want the listing removed. Admin may contact you through
          the contact info you provide to confirm before making changes.
        </p>
        <form action={submitListingRequest} className="form">
          <input type="hidden" name="slug" value={sale.slug} />
          <label>
            Request type
            <select name="request_type" required>
              <option value="correction">Correction</option>
              <option value="removal">Removal</option>
            </select>
          </label>
          <label>
            Name
            <input name="name" />
          </label>
          <label>
            Contact
            <input name="contact" placeholder="Email or phone" />
          </label>
          <label>
            Message
            <textarea name="message" rows={4} required />
          </label>
          <button className="button primary" type="submit">
            Send for manual review
          </button>
        </form>
      </section>
    </main>
  );
}
