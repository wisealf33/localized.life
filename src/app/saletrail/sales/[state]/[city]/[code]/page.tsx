import SalePage, { generateMetadata as generateSaleMetadata } from "@/app/saletrail/sale/[slug]/page";
import { findPublicSaleSlugByCode } from "@/lib/saleLookup";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ state: string; city: string; code: string }>;
  searchParams: Promise<{ request?: string }>;
};

async function slugParams(params: Props["params"]) {
  const { state, city, code } = await params;
  const slug = await findPublicSaleSlugByCode(state, city, code);
  if (!slug) notFound();
  return Promise.resolve({ slug });
}

export async function generateMetadata({ params, searchParams }: Props) {
  return generateSaleMetadata({ params: slugParams(params), searchParams });
}

export default async function CleanSalePage({ params, searchParams }: Props) {
  return SalePage({ params: slugParams(params), searchParams });
}
