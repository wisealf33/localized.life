import FlyerPage from "@/app/saletrail/sale/[slug]/share/flyer/page";
import { findPublicSaleSlugByCode } from "@/lib/saleLookup";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ state: string; city: string; code: string }>;
};

async function slugParams(params: Props["params"]) {
  const { state, city, code } = await params;
  const slug = await findPublicSaleSlugByCode(state, city, code);
  if (!slug) notFound();
  return Promise.resolve({ slug });
}

export default async function CleanFlyerPage({ params }: Props) {
  return FlyerPage({ params: slugParams(params) });
}

