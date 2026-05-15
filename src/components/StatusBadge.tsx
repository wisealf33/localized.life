import { sourceLabel, sourceTone } from "@/lib/format";
import type { Sale } from "@/lib/types";

export function StatusBadge({ sale }: { sale: Pick<Sale, "source_type" | "claim_status"> }) {
  const tone = sourceTone(sale.source_type, sale.claim_status);
  return <span className={`badge ${tone}`}>{sourceLabel(sale.source_type, sale.claim_status)}</span>;
}
