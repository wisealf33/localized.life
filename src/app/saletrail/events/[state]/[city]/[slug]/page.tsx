import { redirect } from "next/navigation";

type Props = {
  params: Promise<{
    state: string;
    city: string;
    slug: string;
  }>;
};

export default async function SaleTrailEventDetailRedirect({ params }: Props) {
  const { state, city, slug } = await params;
  redirect(`/local-events/${state}/${city}/${slug}`);
}
