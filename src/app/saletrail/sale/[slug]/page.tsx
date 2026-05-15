import Link from "next/link";
import { notFound } from "next/navigation";
import { SaveSaleButton } from "@/components/SaveSaleButton";
import { StatusBadge } from "@/components/StatusBadge";
import { formatSaleHours, fullAddress } from "@/lib/format";
import { submitListingRequest } from "@/lib/actions";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import type { Sale } from "@/lib/types";

const publicSaleColumns =
  "id, slug, title, description, address_line, city, state, zip, starts_at, ends_at, sale_schedule, categories, status, source_type, claim_status, visibility_status, claimed_at, created_at, updated_at";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ request?: string }>;
};

async function getSale(slug: string) {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await getSupabaseAdmin()
    .from("sales")
    .select(publicSaleColumns)
    .eq("slug", slug)
    .eq("visibility_status", "public")
    .single();

  if (error || !data) return null;
  return data as Sale;
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
        <p>{fullAddress(sale)}</p>
        {sale.status !== "active" ? <div className="notice">This sale is marked {sale.status}.</div> : null}
        {sale.categories?.length ? <p className="tags">{sale.categories.join(" · ")}</p> : null}
        {sale.description ? <p>{sale.description}</p> : null}

        {sale.source_type !== "seller_created" && sale.claim_status !== "claimed" ? (
          <div className="notice">
            This listing was added from publicly available or community-submitted information and has not yet been
            claimed by the organizer. Details may change. Are you the organizer? You can claim, correct, or request
            removal of this listing.
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
