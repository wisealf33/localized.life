import { RoutePlanner } from "@/components/RoutePlanner";

export default function RoutePage() {
  return (
    <main className="page narrow">
      <p className="eyebrow">SaleTrail by Localized.Life</p>
      <h1>Your garage sale route</h1>
      <p className="lede">Saved sales stay in this browser. Open your selected stops in Google Maps when ready.</p>
      <RoutePlanner />
    </main>
  );
}
