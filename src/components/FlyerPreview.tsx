import Link from "next/link";
import { formatSaleHours, fullAddress, saleDisplayTitle } from "@/lib/format";
import { optimizedImageUrl } from "@/lib/images";
import { saleFlyerImage } from "@/lib/share";
import type { Sale } from "@/lib/types";

type FlyerPreviewProps = {
  qr: string;
  sale: Sale;
  url: string;
};

export function FlyerPreview({ qr, sale, url }: FlyerPreviewProps) {
  const image = saleFlyerImage(sale);
  const displayTitle = saleDisplayTitle(sale);

  return (
    <div className="flyer">
      <p className="eyebrow">SaleTrail by Localized.life</p>
      <h2>{displayTitle}</h2>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="flyer-photo"
          src={optimizedImageUrl(image.src, { width: 900, crop: "limit" })}
          alt={`${displayTitle} preview`}
        />
      ) : (
        <div className="flyer-photo-placeholder">
          <strong>Add a sale photo</strong>
          <span>Organizer can claim this listing to add photos to the flyer.</span>
        </div>
      )}
      <p className="whitespace">{formatSaleHours(sale)}</p>
      <p>{fullAddress(sale)}</p>
      {sale.description ? <p>{sale.description}</p> : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qr} alt="QR code for SaleTrail listing" />
      <p className="short-url">{url}</p>
      {sale.source_type === "community_added" && sale.claim_status !== "claimed" ? (
        <p className="flyer-claim-note">
          Organizer? <Link href={`/saletrail/claim/${sale.slug}`}>Claim this listing</Link> to update details and add
          photos.
        </p>
      ) : null}
    </div>
  );
}
