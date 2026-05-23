import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackToListingsButton } from "@/components/BackToListingsButton";
import { SaveSaleButton } from "@/components/SaveSaleButton";
import { SiteHeader } from "@/components/SiteHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { isSaleEventHub } from "@/lib/eventHubs";
import { formatSaleHours, fullAddress, mapSearchUrl, salePath, saleSharePath, splitSaleSchedule } from "@/lib/format";
import { saleMetadata, saleStructuredData } from "@/lib/seo";
import { salePreviewImage } from "@/lib/share";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import type { Sale } from "@/lib/types";

const publicSaleColumns =
  "id, slug, title, description, address_line, city, state, zip, latitude, longitude, location_precision, starts_at, ends_at, sale_schedule, photo_urls, categories, status, source_type, claim_status, visibility_status, source_url, claimed_at, created_at, updated_at";
const publicSaleColumnsWithoutPhotos =
  "id, slug, title, description, address_line, city, state, zip, latitude, longitude, location_precision, starts_at, ends_at, sale_schedule, categories, status, source_type, claim_status, visibility_status, source_url, claimed_at, created_at, updated_at";
const publicSaleColumnsWithoutPrecision =
  "id, slug, title, description, address_line, city, state, zip, latitude, longitude, starts_at, ends_at, sale_schedule, categories, status, source_type, claim_status, visibility_status, source_url, claimed_at, created_at, updated_at";
const publicSaleColumnsWithoutCoordinates =
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

  if (error?.message.includes("location_precision")) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("sales")
      .select(publicSaleColumnsWithoutPrecision)
      .eq("slug", slug)
      .eq("visibility_status", "public")
      .single();
    if (fallbackError || !fallbackData) return null;
    return { ...fallbackData, photo_urls: [], location_precision: null } as unknown as Sale;
  }

  if (error?.message.includes("latitude") || error?.message.includes("longitude")) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("sales")
      .select(publicSaleColumnsWithoutCoordinates)
      .eq("slug", slug)
      .eq("visibility_status", "public")
      .single();
    if (fallbackError || !fallbackData) return null;
    return { ...fallbackData, photo_urls: [], latitude: null, longitude: null, location_precision: null } as unknown as Sale;
  }

  if (error || !data) return null;
  return data as Sale;
}

function isEventHubSale(sale: Pick<Sale, "title" | "address_line" | "categories">) {
  return isSaleEventHub(sale);
}

function eventHubLabel(sale: Pick<Sale, "categories">) {
  if (sale.categories?.includes("Route sale")) return "Route sale event";
  return "City-wide event";
}

function eventHubDescription(sale: Pick<Sale, "categories">) {
  if (sale.categories?.includes("Route sale")) {
    return {
      name: "route sale",
      summary:
        "This route sale page is managed by SaleTrail as a community event hub. Individual participating sales can be viewed, saved, and added to your route below when they are added.",
      claim:
        "If one of the individual sale listings belongs to you, claim that individual listing instead of this route sale hub page.",
    };
  }

  return {
    name: "city-wide event",
    summary:
      "This city-wide sale page is managed by SaleTrail as a community event hub. Individual participating sales can be viewed, saved, and added to your route below.",
    claim:
      "If one of the individual sale listings belongs to you, claim that individual listing instead of this city-wide hub page.",
  };
}

function streetTitle(address: string) {
  const cleaned = address
    .replace(/^(?:\d+[A-Za-z]?|Mizera Building),?\s*/i, "")
    .replace(/\s*,?\s*(?:Raymond|Bloomington),?\s*IL.*$/i, "")
    .replace(/\bN\b/i, "North")
    .replace(/\bS\b/i, "South")
    .replace(/\bE\b/i, "East")
    .replace(/\bW\b/i, "West")
    .replace(/\bSt\b\.?/i, "Street")
    .replace(/\bRd\b\.?/i, "Road")
    .replace(/\bDr\b\.?/i, "Drive")
    .replace(/\bLn\b\.?/i, "Lane")
    .replace(/\bCt\b\.?/i, "Court")
    .replace(/\bCir\b\.?/i, "Circle")
    .trim();

  if (!cleaned) return "This location";
  if (/building/i.test(address)) return "Mizera Building";
  return cleaned;
}

function participantTitle(sale: Pick<Sale, "title" | "address_line" | "categories">) {
  const prefix = sale.categories?.includes("Estate sale") ? "Estate Sale" : "Garage Sale";
  return `${prefix} on ${streetTitle(sale.address_line)}`;
}

async function getCityWideParticipatingSales(sale: Sale) {
  if (!isSupabaseConfigured || !isEventHubSale(sale)) return [];

  const { data, error } = await getSupabaseAdmin()
    .from("sales")
    .select(publicSaleColumns)
    .eq("visibility_status", "public")
    .eq("status", "active")
    .eq("city", sale.city)
    .eq("state", sale.state)
    .neq("id", sale.id)
    .lte("starts_at", sale.ends_at)
    .gte("ends_at", sale.starts_at)
    .order("starts_at", { ascending: true })
    .order("address_line", { ascending: true });

  if (error || !data) return [];

  return (data as Sale[])
    .filter((item) => !isEventHubSale(item))
    .sort((a, b) => {
      const dateCompare = new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.address_line.localeCompare(b.address_line);
    });
}

function ParticipatingSaleCard({ sale }: { sale: Sale }) {
  const schedule = splitSaleSchedule(sale);

  return (
    <article className="card sale-card mini-sale-card">
      <div className="participant-card-main">
        <h3>
          <Link href={salePath(sale)}>{participantTitle(sale)}</Link>
        </h3>
        <a className="text-link sale-card-address" href={mapSearchUrl(sale)} target="_blank" rel="noopener noreferrer">
          {fullAddress(sale)}
        </a>
      </div>
      <div className="sale-card-schedule">
        {schedule.dates.map((line) => (
          <span key={line}>{line}</span>
        ))}
        {schedule.note ? <small>{schedule.note}</small> : null}
      </div>
      <div className="participant-card-bottom">
        {sale.categories?.length ? <p className="tags">{sale.categories.join(" · ")}</p> : null}
        <div className="sale-card-footer">
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
          />
        </div>
      </div>
    </article>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const sale = await getSale(slug);
  if (!sale) {
    return {
      title: "Garage Sale Listing | SaleTrail",
    };
  }

  return saleMetadata(sale);
}

export default async function SalePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;
  const sale = await getSale(slug);
  if (!sale) notFound();
  const isEventHub = isEventHubSale(sale);
  const hubDescription = eventHubDescription(sale);
  const participatingSales = await getCityWideParticipatingSales(sale);
  const previewImage = salePreviewImage(sale);
  const structuredData = saleStructuredData(sale);

  return (
    <main className={isEventHub ? "page citywide-page" : "page narrow"}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <SiteHeader />

      {query.request === "received" ? <div className="notice good">Request received for manual review.</div> : null}

      <section className={isEventHub ? "stack listing-detail citywide-hero" : "stack listing-detail"}>
        {isEventHub ? <span className="badge plain">{eventHubLabel(sale)}</span> : <StatusBadge sale={sale} />}
        <div className={isEventHub ? "listing-title-row citywide-title-row" : "listing-title-row"}>
          <h1>{sale.title}</h1>
          <BackToListingsButton />
        </div>
        {isEventHub ? (
          <div className="citywide-event-summary">
            <p>
              <strong>{participatingSales.length} participating sales</strong>
            </p>
            <p>{formatSaleHours(sale).replace(/\n/g, " · ")}</p>
            <p>
              <a className="text-link" href={mapSearchUrl(sale)} target="_blank" rel="noopener noreferrer">
                {fullAddress(sale)}
              </a>
            </p>
          </div>
        ) : (
          <>
            <p className="lede whitespace">{formatSaleHours(sale)}</p>
            <p>
              <a className="text-link" href={mapSearchUrl(sale)} target="_blank" rel="noopener noreferrer">
                {fullAddress(sale)}
              </a>
            </p>
            {sale.status !== "active" ? <div className="notice">This sale is marked {sale.status}.</div> : null}
            {sale.categories?.length ? <p className="tags">{sale.categories.join(" · ")}</p> : null}
          </>
        )}
        {previewImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="listing-preview-image" src={previewImage.src} alt={`${sale.title} preview`} />
        ) : null}
        {sale.photo_urls && sale.photo_urls.length > 1 ? (
          <div className="photo-grid compact-photo-grid">
            {sale.photo_urls.slice(1, 2).map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt={`${sale.title} photo`} key={url} />
            ))}
          </div>
        ) : null}
        {sale.description ? <p className={isEventHub ? "citywide-description" : undefined}>{sale.description}</p> : null}

        {isEventHub ? (
          <div className="notice stack small-gap">
            <p>{hubDescription.summary}</p>
            <p>{hubDescription.claim}</p>
          </div>
        ) : sale.source_type === "community_added" && sale.claim_status !== "claimed" ? (
          <div className="notice stack small-gap">
            <p>
              This listing was added from publicly available or community-submitted information and has not yet been
              claimed by the organizer. Details may change. Are you the organizer? You can claim, correct, or request
              removal of this listing.
            </p>
            <p>
              Claiming asks for a public Facebook post/comment so admin can confirm the organizer. Once approved, the
              organizer gets a private manage link to update details.
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
          {isEventHub ? (
            <a className="button primary" href="#participating-sales">
              View participating sales
            </a>
          ) : (
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
            />
          )}
          <Link className="button" href={saleSharePath(sale)}>
            Share kit
          </Link>
          {!isEventHub && sale.source_type === "community_added" && sale.claim_status !== "claimed" ? (
            <Link className="button" href={`/saletrail/claim/${sale.slug}`}>
              Claim this listing
            </Link>
          ) : null}
        </div>
      </section>

      {isEventHub ? (
        <section className="panel stack citywide-participants-panel" id="participating-sales">
          <div>
            <p className="eyebrow">Participating sales</p>
            <h2>
              {participatingSales.length
                ? `${participatingSales.length} sale${participatingSales.length === 1 ? "" : "s"} in this ${hubDescription.name}`
                : "Participating sales will appear here"}
            </h2>
          </div>
          <p className="muted">
            Save the individual stops you want, then open My route to arrange your own SaleTrail.
          </p>
          {participatingSales.length ? (
            <div className="grid two related-sales-grid">
              {participatingSales.map((item) => (
                <ParticipatingSaleCard sale={item} key={item.id} />
              ))}
            </div>
          ) : (
            <p className="muted">No individual participating listings have been added yet.</p>
          )}
        </section>
      ) : null}

      {!isEventHub && sale.source_type === "community_added" && sale.claim_status !== "claimed" ? (
        <section className="panel claim-listing-panel">
          <div>
            <p className="eyebrow">Organizer access</p>
            <h2>Need to update this listing?</h2>
          </div>
          <p className="muted">
            Claim the listing first. After admin approval, you will receive a private manage link to update details,
            improve the listing, or request removal.
          </p>
          <Link className="button primary compact-button" href={`/saletrail/claim/${sale.slug}`}>
            Claim this listing
          </Link>
        </section>
      ) : null}
    </main>
  );
}
