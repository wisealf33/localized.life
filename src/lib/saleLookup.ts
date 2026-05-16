import { getSupabaseAdmin, isSupabaseConfigured } from "./supabase";

export async function findPublicSaleSlugByCode(state: string, city: string, code: string) {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await getSupabaseAdmin()
    .from("sales")
    .select("slug")
    .eq("visibility_status", "public")
    .ilike("state", state)
    .ilike("city", city.replaceAll("-", " "))
    .ilike("slug", `%-${code}`)
    .limit(2);

  if (error || !data || data.length !== 1) return null;
  return data[0].slug as string;
}
