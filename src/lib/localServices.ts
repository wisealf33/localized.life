export type LocalService = {
  slug: string;
  title: string;
  category: string;
  summary: string;
  examples: string[];
  requestPrompts: string[];
};

export const localServices: LocalService[] = [
  {
    slug: "house-cleaning",
    title: "House Cleaning",
    category: "Cleaning",
    summary: "General home cleaning, deep cleaning, and recurring housekeeping.",
    examples: ["Standard cleaning", "Deep cleaning", "Kitchen and bathroom cleaning", "Weekly or monthly help"],
    requestPrompts: ["Rooms that need attention", "One-time or recurring", "Pets, supplies, or access notes"],
  },
  {
    slug: "yard-cleanup",
    title: "Yard Cleanup",
    category: "Yard help",
    summary: "Seasonal cleanup, mowing help, trimming, leaves, brush, and basic outdoor labor.",
    examples: ["Mowing", "Leaf cleanup", "Brush clearing", "Weeding"],
    requestPrompts: ["Approximate yard size", "Tools available or needed", "Deadline or preferred day"],
  },
  {
    slug: "garden-help",
    title: "Garden Help",
    category: "Garden help",
    summary: "Planting, weeding, mulching, watering help, harvest help, and practical garden support.",
    examples: ["Planting beds", "Weeding", "Mulching", "Harvest help"],
    requestPrompts: ["Type of garden work", "Plants or beds involved", "Whether tools/materials are ready"],
  },
  {
    slug: "handyman-repairs",
    title: "Handyman & Small Repairs",
    category: "Handyman",
    summary: "Small home fixes, minor repairs, door help, fixture help, and simple odd jobs.",
    examples: ["Small repairs", "Door help", "Fixture help", "Minor home fixes"],
    requestPrompts: ["What is broken or needed", "Photos or measurements if available", "Parts already purchased"],
  },
  {
    slug: "furniture-assembly",
    title: "Furniture Assembly",
    category: "Assembly",
    summary: "Assembly help for flat-pack furniture, desks, beds, shelves, tables, chairs, and storage pieces.",
    examples: ["IKEA-style assembly", "Beds or desks", "Shelving units", "Storage cabinets"],
    requestPrompts: ["Item brand or model", "Number of pieces", "Room location and space to work"],
  },
  {
    slug: "tv-wall-mounting",
    title: "TV & Wall Mounting",
    category: "Mounting",
    summary: "TV mounting, shelves, curtain rods, mirrors, picture hanging, and other simple wall-mounted items.",
    examples: ["TV mounting", "Shelves", "Curtain rods", "Mirrors or pictures"],
    requestPrompts: ["Item size and wall type", "Mounting hardware available", "Preferred height or placement"],
  },
  {
    slug: "home-setup-odd-jobs",
    title: "Home Setup & Odd Jobs",
    category: "Setup help",
    summary: "Simple setup help for small household tasks, new items, room resets, hardware swaps, and one-off jobs.",
    examples: ["Room setup", "Hardware swaps", "Small installs", "One-off jobs"],
    requestPrompts: ["What needs to be set up", "Tools or parts available", "Photos, measurements, or access notes"],
  },
  {
    slug: "pet-care-dog-walking",
    title: "Pet Care & Dog Walking",
    category: "Pet care",
    summary: "Dog walking, pet sitting, check-ins, feeding, and basic care while you are away.",
    examples: ["Dog walking", "Pet sitting", "Drop-in feeding", "Medication reminders"],
    requestPrompts: ["Pet type and temperament", "Dates and visit length", "Access and care instructions"],
  },
  {
    slug: "babysitting-childcare",
    title: "Babysitting & Childcare",
    category: "Babysitting",
    summary: "Local babysitting, short child-care help, after-school support, and parent-helper requests.",
    examples: ["Evening babysitting", "After-school help", "Parent helper", "Weekend coverage"],
    requestPrompts: ["Children's ages", "Time window", "Special routines or requirements"],
  },
  {
    slug: "farm-homestead-help",
    title: "Farm & Homestead Help",
    category: "Farm help",
    summary: "Light chores, garden labor, animal care support, cleanup, and seasonal jobs using ordinary tools.",
    examples: ["Light chores", "Animal care", "Garden labor", "Seasonal cleanup"],
    requestPrompts: ["Type of property or job", "Physical labor needed", "Ordinary tools, animals, or safety notes"],
  },
  {
    slug: "local-tech-help",
    title: "Local Tech Help",
    category: "Tech help",
    summary: "Phone, computer, printer, Wi-Fi, smart TV, basic website, and device setup help.",
    examples: ["Printer setup", "Wi-Fi help", "Phone help", "Smart TV setup"],
    requestPrompts: ["Device or software involved", "Error message or goal", "In-home or remote help"],
  },
];

export function serviceBySlug(slug: string) {
  return localServices.find((service) => service.slug === slug);
}
