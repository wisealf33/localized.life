import { existsSync } from "fs";
import path from "path";
import { countyForSale, regionDestinationForSale } from "./regions";
import { urlSegment } from "./format";
import { optimizedImageUrl } from "./images";
import type { Sale } from "./types";

type ShareImageSale = Pick<Sale, "city" | "state" | "photo_urls" | "categories">;

const generalFallbackImages = [
  {
    label: "General estate sale image",
    filename: "estate-sale.jpg",
    publicPath: "/og/estate-sale.jpg",
    description: "Used when an estate sale does not have a seller photo, town image, or county image.",
  },
  {
    label: "General city-wide sale image",
    filename: "city-wide-sale.jpg",
    publicPath: "/og/city-wide-sale.jpg",
    description: "Used for city-wide and village-wide sale events when no more specific image exists.",
  },
  {
    label: "General Illinois image",
    filename: "illinois.jpg",
    publicPath: "/og/illinois.jpg",
    description: "Statewide fallback as SaleTrail spreads beyond the first open counties.",
  },
  {
    label: "General Indiana image",
    filename: "indiana.jpg",
    publicPath: "/og/indiana.jpg",
    description: "Statewide fallback for Indiana listings.",
  },
  {
    label: "General Wisconsin image",
    filename: "wisconsin.jpg",
    publicPath: "/og/wisconsin.jpg",
    description: "Statewide fallback for Wisconsin listings.",
  },
];

const festivalFallbackImages = [
  {
    label: "General Local Event",
    filename: "local-event.jpg",
    publicPath: "/og/local-event.jpg",
    description: "Neutral local event image for workshops, community days, classes, and events that do not have a more specific theme yet.",
  },
  {
    label: "Local Market Event",
    filename: "local-market-event.jpg",
    publicPath: "/og/local-market-event.jpg",
    description: "General local market event image for vendor markets, pop-ups, local markets, and community market days.",
  },
  {
    label: "Farmers Market",
    filename: "farmers-market.jpg",
    publicPath: "/og/farmers-market.jpg",
    description: "Farmers market booths, produce, tents, flowers, and local food tables.",
  },
  {
    label: "Flea Market",
    filename: "flea-market.jpg",
    publicPath: "/og/flea-market.jpg",
    description: "Flea market and swap meet tables with antiques, tools, vintage goods, tents, and browsing shoppers.",
  },
  {
    label: "Oktoberfest",
    filename: "oktoberfest.jpg",
    publicPath: "/og/oktoberfest.jpg",
    description: "Fall Oktoberfest event feel with autumn color, community tents, food, music, and festive small-town atmosphere.",
  },
  {
    label: "Music Festival",
    filename: "music-festival.jpg",
    publicPath: "/og/music-festival.jpg",
    description: "Stage, speakers, lights, crowd, instruments, outdoor concert feel.",
  },
  {
    label: "Carnival Festival",
    filename: "carnival-festival.jpg",
    publicPath: "/og/carnival-festival.jpg",
    description: "Ferris wheel, game booths, prize stands, popcorn, cotton candy, bright lights.",
  },
  {
    label: "Food Festival",
    filename: "food-festival.jpg",
    publicPath: "/og/food-festival.jpg",
    description: "Food trucks, tasting booths, picnic tables, string lights, food stands.",
  },
  {
    label: "BBQ / Rib Festival",
    filename: "bbq-rib-festival.jpg",
    publicPath: "/og/bbq-rib-festival.jpg",
    description: "Smoke, grills, outdoor food tents, picnic tables, rustic signs.",
  },
  {
    label: "Beer / Wine Festival",
    filename: "beer-wine-festival.jpg",
    publicPath: "/og/beer-wine-festival.jpg",
    description: "Outdoor tasting tents, barrels, glasses, and string lights without making alcohol the whole image.",
  },
  {
    label: "Art Festival",
    filename: "art-festival.jpg",
    publicPath: "/og/art-festival.jpg",
    description: "Paintings, easels, sculpture displays, art tents, creative street setup.",
  },
  {
    label: "Craft Festival",
    filename: "craft-festival.jpg",
    publicPath: "/og/craft-festival.jpg",
    description: "Handmade goods, quilts, candles, wood crafts, pottery, maker booths.",
  },
  {
    label: "Renaissance Festival",
    filename: "renaissance-festival.jpg",
    publicPath: "/og/renaissance-festival.jpg",
    description: "Medieval-style tents, banners, shields, wooden booths, castle or fantasy feel.",
  },
  {
    label: "LARP / Fantasy Festival",
    filename: "larp-fantasy-festival.jpg",
    publicPath: "/og/larp-fantasy-festival.jpg",
    description: "Fantasy props, tents, banners, woodland clearing, shields, spell-book style props, no copyrighted symbols.",
  },
  {
    label: "Cultural Festival",
    filename: "cultural-festival.jpg",
    publicPath: "/og/cultural-festival.jpg",
    description: "Stage, dance or music setup, food stands, flags, decorations, community celebration feel.",
  },
  {
    label: "Heritage Festival",
    filename: "heritage-festival.jpg",
    publicPath: "/og/heritage-festival.jpg",
    description: "Historic-town feel, old-time decorations, local history displays, traditional crafts.",
  },
  {
    label: "Fall Festival",
    filename: "fall-festival.jpg",
    publicPath: "/og/fall-festival.jpg",
    description: "Pumpkins, hay bales, mums, corn stalks, autumn trees, cider stand feel.",
  },
  {
    label: "Harvest Festival",
    filename: "harvest-festival.jpg",
    publicPath: "/og/harvest-festival.jpg",
    description: "Corn, pumpkins, produce, tractors, hay wagons, farm-country celebration.",
  },
  {
    label: "Apple Festival",
    filename: "apple-festival.jpg",
    publicPath: "/og/apple-festival.jpg",
    description: "Apple baskets, orchard background, cider stand, fall decorations.",
  },
  {
    label: "Pumpkin Festival",
    filename: "pumpkin-festival.jpg",
    publicPath: "/og/pumpkin-festival.jpg",
    description: "Pumpkin displays, hay bales, orange fall decorations, family event atmosphere.",
  },
  {
    label: "Flower Festival",
    filename: "flower-festival.jpg",
    publicPath: "/og/flower-festival.jpg",
    description: "Flower beds, hanging baskets, garden booths, colorful spring or summer scene.",
  },
  {
    label: "Garden Festival",
    filename: "garden-festival.jpg",
    publicPath: "/og/garden-festival.jpg",
    description: "Plants, garden tools, greenhouse tents, flowers, seed displays.",
  },
  {
    label: "Holiday Festival",
    filename: "holiday-festival.jpg",
    publicPath: "/og/holiday-festival.jpg",
    description: "Lights, decorated downtown, seasonal booths, winter market feel.",
  },
  {
    label: "Christmas Festival",
    filename: "christmas-festival.jpg",
    publicPath: "/og/christmas-festival.jpg",
    description: "Holiday lights, decorated trees, wreaths, cozy downtown street.",
  },
  {
    label: "Parade Festival",
    filename: "parade-festival.jpg",
    publicPath: "/og/parade-festival.jpg",
    description: "Main street with banners, barricades, floats or decorated vehicles, celebration atmosphere.",
  },
  {
    label: "Street Festival",
    filename: "street-festival.jpg",
    publicPath: "/og/street-festival.jpg",
    description: "Closed downtown street, stage, lights, food stands, entertainment, crowd.",
  },
  {
    label: "Community Festival",
    filename: "community-festival.jpg",
    publicPath: "/og/community-festival.jpg",
    description: "General small-town celebration with stage, tents, games, flowers, and local banners.",
  },
  {
    label: "Kids Festival",
    filename: "kids-festival.jpg",
    publicPath: "/og/kids-festival.jpg",
    description: "Bounce-house style shapes, balloons, games, face-painting booth setup, playful colors.",
  },
  {
    label: "Sports Festival",
    filename: "sports-festival.jpg",
    publicPath: "/og/sports-festival.jpg",
    description: "Fields, sports equipment, obstacle course, local tournament or family activity feel.",
  },
  {
    label: "Car Show Festival",
    filename: "car-show-festival.jpg",
    publicPath: "/og/car-show-festival.jpg",
    description: "Classic cars, street lineup, chrome, pop-up tents, downtown cruise-night feel.",
  },
  {
    label: "Motorcycle Festival",
    filename: "motorcycle-festival.jpg",
    publicPath: "/og/motorcycle-festival.jpg",
    description: "Motorcycles, vendor tents, stage, road-trip or rally feel.",
  },
  {
    label: "Hot Air Balloon Festival",
    filename: "hot-air-balloon-festival.jpg",
    publicPath: "/og/hot-air-balloon-festival.jpg",
    description: "Balloons in the sky, open field, food tents, sunset or bright morning setup.",
  },
  {
    label: "County Fair Festival",
    filename: "county-fair-festival.jpg",
    publicPath: "/og/county-fair-festival.jpg",
    description: "Ferris wheel, livestock barns, fair food stands, midway lights.",
  },
  {
    label: "Bluegrass / Folk Festival",
    filename: "bluegrass-folk-festival.jpg",
    publicPath: "/og/bluegrass-folk-festival.jpg",
    description: "Acoustic stage, banjo or guitar props, hay bales, rustic outdoor setup.",
  },
  {
    label: "Summer Festival",
    filename: "summer-festival.jpg",
    publicPath: "/og/summer-festival.jpg",
    description: "Sunny street or park scene, music stage, food tents, colorful bunting, community celebration.",
  },
];

function publicFileExists(publicPath: string) {
  return existsSync(path.join(process.cwd(), "public", publicPath.replace(/^\//, "")));
}

function townStateImagePath(sale: Pick<ShareImageSale, "city" | "state">) {
  return `/og/${urlSegment(sale.city)}-${urlSegment(sale.state)}.jpg`;
}

function legacyTownImagePath(city: string) {
  return `/og/${urlSegment(city)}.jpg`;
}

function stateImagePath(state: string) {
  const normalized = state.trim().toLowerCase();
  const stateNames: Record<string, string> = {
    il: "illinois",
    illinois: "illinois",
    in: "indiana",
    indiana: "indiana",
    wi: "wisconsin",
    wisconsin: "wisconsin",
  };
  const stateName = stateNames[normalized];
  return stateName ? `/og/${stateName}.jpg` : null;
}

function saleTypeFallbackPath(sale: ShareImageSale) {
  const categories = sale.categories || [];
  if (categories.includes("Route sale")) return "/og/city-wide-sale.jpg";
  if (categories.includes("City-wide sale")) return "/og/city-wide-sale.jpg";
  if (categories.includes("Estate sale")) return "/og/estate-sale.jpg";
  return null;
}

export function saleFallbackImagePath(sale: ShareImageSale) {
  const destination = regionDestinationForSale(sale);
  const cityStatePath = townStateImagePath(sale);
  if (destination.isDedicated && publicFileExists(cityStatePath)) return cityStatePath;

  const legacyCityPath = legacyTownImagePath(sale.city);
  if (destination.isDedicated && publicFileExists(legacyCityPath)) return legacyCityPath;

  const countyPath = `/og/${urlSegment(destination.county)}.jpg`;
  if (publicFileExists(countyPath)) return countyPath;

  const typePath = saleTypeFallbackPath(sale);
  if (typePath && publicFileExists(typePath)) return typePath;

  const statePath = stateImagePath(sale.state);
  if (statePath && publicFileExists(statePath)) return statePath;

  const defaultPath = "/og/default-saletrail.jpg";
  if (publicFileExists(defaultPath)) return defaultPath;

  return null;
}

export function saleFlyerImage(sale: ShareImageSale) {
  const uploadedPhoto = sale.photo_urls?.find(Boolean);
  if (uploadedPhoto) return { src: optimizedImageUrl(uploadedPhoto, { width: 1200, crop: "limit" }), kind: "photo" as const };

  const fallback = saleFallbackImagePath(sale);
  if (fallback) return { src: fallback, kind: "fallback" as const };

  return null;
}

export const salePreviewImage = saleFlyerImage;

export function missingGeneralFallbackImageNeeds() {
  return generalFallbackImages.filter((image) => !publicFileExists(image.publicPath));
}

export function missingFestivalFallbackImageNeeds() {
  return festivalFallbackImages.filter((image) => !publicFileExists(image.publicPath));
}

export function salePreviewImageNeed(sale: ShareImageSale) {
  if (sale.photo_urls?.find(Boolean)) return null;

  const destination = regionDestinationForSale(sale);
  const county = countyForSale(sale);
  const cityPath = townStateImagePath(sale);
  const legacyCityPath = legacyTownImagePath(sale.city);

  if (destination.isDedicated && !publicFileExists(cityPath) && !publicFileExists(legacyCityPath)) {
    return {
      scope: "town" as const,
      label: `${sale.city}, ${sale.state}`,
      filename: `${urlSegment(sale.city)}-${urlSegment(sale.state)}.jpg`,
      publicPath: cityPath,
    };
  }

  if (!county) {
    return {
      scope: "mapping" as const,
      label: `${sale.city}, ${sale.state}`,
      filename: "",
      publicPath: `mapping:${urlSegment(sale.state)}:${urlSegment(sale.city)}`,
    };
  }

  const countyPath = `/og/${urlSegment(destination.county)}.jpg`;
  if (!publicFileExists(countyPath)) {
    return {
      scope: "county" as const,
      label: `${destination.county}, ${destination.state}`,
      filename: `${urlSegment(destination.county)}.jpg`,
      publicPath: countyPath,
    };
  }

  return null;
}
