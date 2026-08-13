import { redirect } from "next/navigation";

export default async function LegacyConnectorPersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/connections/${encodeURIComponent(id)}`);
}
