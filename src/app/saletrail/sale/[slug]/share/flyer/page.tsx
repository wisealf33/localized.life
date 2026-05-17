import QRCode from "qrcode";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FlyerPreview } from "@/components/FlyerPreview";
import { salePath, saleUrl } from "@/lib/format";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import type { Sale } from "@/lib/types";

const flyerSaleColumns =
  "id, slug, title, description, address_line, city, state, zip, starts_at, ends_at, sale_schedule, photo_urls, categories, status, source_type, claim_status, visibility_status, claimed_at, created_at, updated_at";
const flyerSaleColumnsWithoutPhotos =
  "id, slug, title, description, address_line, city, state, zip, starts_at, ends_at, sale_schedule, categories, status, source_type, claim_status, visibility_status, claimed_at, created_at, updated_at";

type Props = {
  params: Promise<{ slug: string }>;
};

async function getSale(slug: string) {
  if (!isSupabaseConfigured) return null;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sales")
    .select(flyerSaleColumns)
    .eq("slug", slug)
    .eq("visibility_status", "public")
    .single();
  if (error?.message.includes("photo_urls")) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("sales")
      .select(flyerSaleColumnsWithoutPhotos)
      .eq("slug", slug)
      .eq("visibility_status", "public")
      .single();
    if (fallbackError || !fallbackData) return null;
    return { ...fallbackData, photo_urls: [] } as unknown as Sale;
  }
  if (error || !data) return null;
  return data as Sale;
}

export default async function FlyerPage({ params }: Props) {
  const { slug } = await params;
  const sale = await getSale(slug);
  if (!sale) notFound();

  const url = saleUrl(sale);
  const qr = await QRCode.toDataURL(url, { margin: 1, width: 280 });

  return (
    <main className="flyer-only-page">
      <nav className="flyer-only-actions">
        <Link className="button" href={`${salePath(sale)}/share`}>
          Back to share kit
        </Link>
        <span className="button primary disabled">Use browser print</span>
      </nav>
      <FlyerPreview qr={qr} sale={sale} url={url} />
    </main>
  );
}
