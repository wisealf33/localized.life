import { notFound } from "next/navigation";
import { hashSecret } from "@/lib/tokens";
import { SaleForm } from "@/components/SaleForm";
import { SiteHeader } from "@/components/SiteHeader";
import { updateManagedSale } from "@/lib/actions";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import type { Sale } from "@/lib/types";

type Props = {
  params: Promise<{ token: string }>;
};

async function getSale(token: string) {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await getSupabaseAdmin()
    .from("sales")
    .select("*")
    .eq("manage_token_hash", hashSecret(token))
    .single();
  if (error || !data) return null;
  return data as Sale;
}

export default async function ManagePage({ params }: Props) {
  const { token } = await params;
  const sale = await getSale(token);
  if (!sale) notFound();

  return (
    <main className="page narrow">
      <SiteHeader />
      <p className="eyebrow">Private manage link</p>
      <h1>Edit listing</h1>
      <p className="lede">Anyone with this private link can edit, cancel, or end this sale.</p>
      <SaleForm action={updateManagedSale} sale={sale} token={token} />
    </main>
  );
}
