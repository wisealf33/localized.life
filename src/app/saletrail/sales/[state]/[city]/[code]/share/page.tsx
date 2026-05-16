import SharePage from "@/app/saletrail/sale/[slug]/share/page";
import { findPublicSaleSlugByCode } from "@/lib/saleLookup";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ state: string; city: string; code: string }>;
  searchParams: Promise<{ manage?: string }>;
};

async function slugParams(params: Props["params"]) {
  const { state, city, code } = await params;
  const slug = await findPublicSaleSlugByCode(state, city, code);
  if (!slug) notFound();
  return Promise.resolve({ slug });
}

export default async function CleanSharePage({ params, searchParams }: Props) {
  return SharePage({ params: slugParams(params), searchParams });
}
