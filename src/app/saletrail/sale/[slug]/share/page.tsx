import QRCode from "qrcode";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShareActions } from "@/components/ShareActions";
import { SiteHeader } from "@/components/SiteHeader";
import { formatSaleHours, fullAddress, salePath, saleUrl, socialCopy } from "@/lib/format";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import type { Sale } from "@/lib/types";

const shareSaleColumns =
  "id, slug, title, description, address_line, city, state, zip, starts_at, ends_at, sale_schedule, photo_urls, categories, status, source_type, claim_status, visibility_status, claimed_at, created_at, updated_at";
const shareSaleColumnsWithoutPhotos =
  "id, slug, title, description, address_line, city, state, zip, starts_at, ends_at, sale_schedule, categories, status, source_type, claim_status, visibility_status, claimed_at, created_at, updated_at";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ manage?: string }>;
};

async function getSale(slug: string) {
  if (!isSupabaseConfigured) return null;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sales")
    .select(shareSaleColumns)
    .eq("slug", slug)
    .eq("visibility_status", "public")
    .single();
  if (error?.message.includes("photo_urls")) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("sales")
      .select(shareSaleColumnsWithoutPhotos)
      .eq("slug", slug)
      .eq("visibility_status", "public")
      .single();
    if (fallbackError || !fallbackData) return null;
    return { ...fallbackData, photo_urls: [] } as unknown as Sale;
  }
  if (error || !data) return null;
  return data as Sale;
}

export default async function SharePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;
  const sale = await getSale(slug);
  if (!sale) notFound();

  const url = saleUrl(sale);
  const qr = await QRCode.toDataURL(url, { margin: 1, width: 280 });
  const copy = socialCopy(sale, url);
  const manageLink = query.manage ? `/saletrail/manage/${query.manage}` : null;

  return (
    <main className="page">
      <SiteHeader />
      <section className="hero compact-hero share-hero">
        <div className="stack small-gap">
          <p className="eyebrow">Share kit</p>
          <h1>{sale.title}</h1>
          <p>
            Share the public listing, copy ready-to-post text, or use the flyer QR code to send shoppers back to
            SaleTrail.
          </p>
        </div>
        <div className="toolbar share-hero-actions">
          <Link className="button" href={salePath(sale)}>
            Back to listing
          </Link>
          <Link className="button" href="/saletrail/route">
            My route
          </Link>
        </div>
        {manageLink ? (
          <div className="notice good">
            Private manage link: <Link href={manageLink}>{manageLink}</Link>
          </div>
        ) : null}
      </section>

      <section className="share-layout">
        <aside className="flyer-panel">
          <div className="flyer-panel-header">
            <div>
              <p className="eyebrow">Flyer preview</p>
              <h2>QR flyer</h2>
            </div>
            <p className="muted">Print it or screenshot it.</p>
          </div>
          <div className="flyer">
            <p className="eyebrow">SaleTrail by Localized.life</p>
            <h2>{sale.title}</h2>
            <p className="whitespace">{formatSaleHours(sale)}</p>
            <p>{fullAddress(sale)}</p>
            {sale.photo_urls?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="flyer-photo" src={sale.photo_urls[0]} alt={`${sale.title} photo`} />
            ) : null}
            {sale.description ? <p>{sale.description}</p> : null}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="QR code for SaleTrail listing" />
            <p className="short-url">{url}</p>
          </div>
        </aside>
        <ShareActions
          listingUrl={url}
          title={sale.title}
          postText={copy.publicPost}
        />
      </section>
    </main>
  );
}
