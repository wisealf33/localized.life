import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { localMarketProfiles, marketProfilePath } from "@/data/local-market-profiles";
import { pageMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ slug: string }>;
};

function findProfile(slug: string) {
  return localMarketProfiles.find((profile) => profile.slug === slug);
}

function claimProfileUrl(profileName: string, slug: string) {
  const params = new URLSearchParams({
    request_type: "general",
    page_url: `/local-market/${slug}`,
    message: `I want to claim this Local Market profile: ${profileName}`,
  });
  return `/saletrail/feedback?${params.toString()}`;
}

function reportProfileUrl(profileName: string, slug: string) {
  const params = new URLSearchParams({
    request_type: "bug",
    page_url: `/local-market/${slug}`,
    message: `Report incorrect Local Market profile information for: ${profileName}`,
  });
  return `/saletrail/feedback?${params.toString()}`;
}

export function generateStaticParams() {
  return localMarketProfiles.map((profile) => ({ slug: profile.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const profile = findProfile(slug);

  if (!profile) {
    return pageMetadata({
      title: "Local Market Profile",
      description: "A Localized.life Local Market profile.",
      path: "/local-market",
    });
  }

  return pageMetadata({
    title: `${profile.profileName}: Local goods in ${profile.area}`,
    description: profile.summary,
    path: marketProfilePath(profile),
  });
}

export default async function LocalMarketProfilePage({ params }: Props) {
  const { slug } = await params;
  const profile = findProfile(slug);

  if (!profile) {
    notFound();
  }

  return (
    <main className="page local-page local-page-market">
      <SiteHeader active="market" product="Project hub" />

      <section className="hero local-hero local-hero-market market-profile-hero">
        <p className="eyebrow">{profile.claimStatus === "claimed" ? "Claimed Local Market profile" : "Unclaimed Local Market profile"}</p>
        <h1>{profile.profileName}</h1>
        <p className="lede">{profile.summary}</p>
        <div className="market-profile-meta">
          <span>{profile.area}</span>
          {profile.protectedOwnerName ? <span>Profile owner: {profile.protectedOwnerName}</span> : null}
        </div>
        <div className="hero-actions">
          <Link className="button primary" href={claimProfileUrl(profile.profileName, profile.slug)}>
            Claim profile
          </Link>
          <Link className="button" href={reportProfileUrl(profile.profileName, profile.slug)}>
            Report incorrect info
          </Link>
          <Link className="button ghost" href="/local-market">
            Back to Local Market
          </Link>
        </div>
      </section>

      <section className="grid two market-profile-layout">
        <article className="panel stack">
          <div>
            <p className="eyebrow">Products</p>
            <h2>Current local goods</h2>
          </div>
          <div className="market-product-list">
            {profile.products.map((product) => (
              <article className="card market-product-card" key={product.name}>
                <div>
                  <p className="eyebrow">{product.category}</p>
                  <h3>{product.name}</h3>
                  <p className="muted">{product.details}</p>
                </div>
                {product.price ? <strong>{product.price}</strong> : null}
              </article>
            ))}
          </div>
        </article>

        <aside className="panel stack market-profile-side">
          <div>
            <p className="eyebrow">Privacy</p>
            <h2>Owner details are protected.</h2>
            <p className="muted">{profile.privacyNote}</p>
          </div>
          <div>
            <p className="eyebrow">Status</p>
            <h3>{profile.claimStatus === "claimed" ? "Claimed by owner" : "Waiting for owner claim"}</h3>
            <p className="muted">
              Once claimed, the owner can update products, add pickup/contact instructions, and decide what should be
              public.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
