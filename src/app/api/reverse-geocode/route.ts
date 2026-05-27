import { reverseGeocodeLabel } from "@/lib/geocode";

function coordinateParam(value: string | null, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const latitude = coordinateParam(url.searchParams.get("lat"), -90, 90);
  const longitude = coordinateParam(url.searchParams.get("lng"), -180, 180);

  if (latitude === null || longitude === null) {
    return Response.json({ label: null }, { status: 400 });
  }

  const label = await reverseGeocodeLabel(latitude, longitude);
  return Response.json({ label });
}
