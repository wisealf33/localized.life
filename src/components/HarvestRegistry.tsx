"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type PlantType = "Fruit tree" | "Nut tree" | "Berry bush" | "Other plant";
type RegistryPath = "Owner registered" | "Possible harvest site";
type AccessStatus =
  | "Owner registered - contact before harvest"
  | "Owner registered - interested in sharing surplus"
  | "Owner registered - needs harvest help"
  | "Owner registered - registry only for now"
  | "Owner connection needed";

type HarvestPlant = {
  plantName: string;
  plantType: PlantType;
  location: string;
  harvestWindow: string;
  access: AccessStatus;
  notes: string;
  productionStage?: string;
  ownerName?: string;
  ownerPhone?: string;
  ownerEmail?: string;
  reporterPhone?: string;
  reporterEmail?: string;
  registryPath: RegistryPath;
};

const plantKey = "localizedHarvestPlants";
const leadKey = "localizedHarvestLeads";

const starterPlants: HarvestPlant[] = [
  {
    plantName: "Pear",
    plantType: "Fruit tree",
    location: "212 South Rathje Road, Peotone, IL, 60468",
    harvestWindow: "TBA",
    access: "Owner registered - interested in sharing surplus",
    productionStage: "Not sure yet",
    registryPath: "Owner registered",
    notes: "Just planted, not sure if growing.",
  },
];

const filters: Array<PlantType | "All"> = ["All", "Fruit tree", "Nut tree", "Berry bush", "Other plant"];
const placeholderNames = new Set(["Backyard pawpaw cluster", "Old black walnut", "Alley blackberry row"]);

function isStarterPlant(plant: HarvestPlant) {
  return starterPlants.some((starter) => starter.plantName === plant.plantName && starter.location === plant.location);
}

function cleanCustomPlants(plants: HarvestPlant[]) {
  return plants.filter(
    (plant) => plant.registryPath === "Owner registered" && !placeholderNames.has(plant.plantName) && !isStarterPlant(plant),
  );
}

function readPlants() {
  if (typeof window === "undefined") return [...starterPlants];

  const saved = window.localStorage.getItem(plantKey);
  if (!saved) {
    return [...starterPlants];
  }

  try {
    const savedPlants = JSON.parse(saved) as HarvestPlant[];
    const possibleSiteLeads = savedPlants.filter((plant) => plant.registryPath === "Possible harvest site");
    if (possibleSiteLeads.length) {
      const savedLeads = window.localStorage.getItem(leadKey);
      const existingLeads = savedLeads ? (JSON.parse(savedLeads) as HarvestPlant[]) : [];
      window.localStorage.setItem(leadKey, JSON.stringify([...possibleSiteLeads, ...existingLeads]));
    }

    const customPlants = cleanCustomPlants(savedPlants);
    window.localStorage.setItem(plantKey, JSON.stringify(customPlants));
    return [...starterPlants, ...customPlants];
  } catch {
    window.localStorage.removeItem(plantKey);
    return [...starterPlants];
  }
}

function looksLikeStreetAddress(value: string) {
  return /^\d+\s+/.test(value) || /\b(avenue|ave|boulevard|blvd|court|ct|drive|dr|highway|hwy|lane|ln|place|pl|road|rd|street|st|way)\b/i.test(value);
}

function formatArea(value: string) {
  const withoutZip = value.replace(/\b\d{5}(?:-\d{4})?\b/g, "").trim();
  const normalizedState = withoutZip.replace(/\.\s*([A-Z]{2})\b/g, ", $1");
  return normalizedState.replace(/\s+/g, " ").replace(/\s+,/g, ",").replace(/,+/g, ",").replace(/^,|,$/g, "").trim();
}

function generalArea(location: string) {
  const parts = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 3) {
    if (looksLikeStreetAddress(parts[0])) {
      return `${formatArea(`${parts[1]}, ${parts[2]}`)} area`;
    }

    return `${formatArea(`${parts[parts.length - 3]}, ${parts[parts.length - 2]}`)} area`;
  }

  if (parts.length >= 2) {
    if (looksLikeStreetAddress(parts[0])) {
      return `${formatArea(parts[1])} area`;
    }

    return `${formatArea(`${parts[parts.length - 2]}, ${parts[parts.length - 1]}`)} area`;
  }

  const singleLocation = formatArea(parts[0] || "");
  if (looksLikeStreetAddress(singleLocation)) {
    return "General area";
  }

  return `${singleLocation || "General"} area`;
}

function publicStatus() {
  return "Owner registered";
}

type HarvestRegistryProps = {
  mode?: "preview" | "directory";
};

export function HarvestRegistry({ mode = "preview" }: HarvestRegistryProps) {
  const [plants, setPlants] = useState<HarvestPlant[]>([...starterPlants]);
  const [activeFilter, setActiveFilter] = useState<PlantType | "All">("All");
  const [confirmation, setConfirmation] = useState("");
  const [leadConfirmation, setLeadConfirmation] = useState("");
  const [ownerFormOpen, setOwnerFormOpen] = useState(false);
  const [leadFormOpen, setLeadFormOpen] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setPlants(readPlants()), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const visiblePlants = useMemo(() => {
    if (activeFilter === "All") return plants;
    return plants.filter((plant) => plant.plantType === activeFilter);
  }, [activeFilter, plants]);

  const previewPlants = plants.slice(0, 4);
  const registryTypes = new Set(plants.map((plant) => plant.plantType)).size;

  function savePlants(customPlants: HarvestPlant[]) {
    const cleaned = cleanCustomPlants(customPlants);
    setPlants([...starterPlants, ...cleaned]);
    window.localStorage.setItem(plantKey, JSON.stringify(cleaned));
  }

  function saveLead(lead: HarvestPlant) {
    const saved = window.localStorage.getItem(leadKey);
    const savedLeads = saved ? (JSON.parse(saved) as HarvestPlant[]) : [];
    window.localStorage.setItem(leadKey, JSON.stringify([lead, ...savedLeads]));
  }

  function handleOwnerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const nextPlant: HarvestPlant = {
      plantName: String(data.get("plantName") || ""),
      plantType: String(data.get("plantType") || "Fruit tree") as PlantType,
      location: String(data.get("location") || ""),
      harvestWindow: String(data.get("harvestWindow") || ""),
      access: String(data.get("access") || "Owner registered - contact before harvest") as AccessStatus,
      notes: String(data.get("notes") || ""),
      productionStage: String(data.get("productionStage") || "Not sure yet"),
      ownerName: String(data.get("ownerName") || ""),
      ownerPhone: String(data.get("ownerPhone") || ""),
      ownerEmail: String(data.get("ownerEmail") || ""),
      registryPath: "Owner registered",
    };

    savePlants([nextPlant, ...cleanCustomPlants(plants)]);
    setConfirmation(
      `Thank you. Your ${nextPlant.plantName} has been registered. Someone from localized.life harvest can follow up for permission planning, harvest timing, and next steps.`,
    );
    form.reset();
  }

  function handleLeadSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const nextLead: HarvestPlant = {
      plantName: String(data.get("leadPlantName") || ""),
      plantType: String(data.get("leadPlantType") || "Fruit tree") as PlantType,
      location: String(data.get("leadLocation") || ""),
      harvestWindow: String(data.get("leadHarvestWindow") || ""),
      access: "Owner connection needed",
      notes: String(data.get("leadNotes") || ""),
      reporterPhone: String(data.get("leadReporterPhone") || ""),
      reporterEmail: String(data.get("leadReporterEmail") || ""),
      registryPath: "Possible harvest site",
    };

    saveLead(nextLead);
    setLeadConfirmation(
      `Thank you. This ${nextLead.plantName} lead has been saved privately for follow-up. It will not appear in the public registry unless it is reviewed, owner permission is handled, and the public listing is cleaned to a general area.`,
    );
    form.reset();
  }

  return (
    <>
      <section className="harvest-stats" aria-label="Registry totals">
        <div>
          <strong>{plants.length}</strong>
          <span>owner registered plants</span>
        </div>
        <div>
          <strong>Private</strong>
          <span>harvest lead follow-up</span>
        </div>
        <div>
          <strong>{registryTypes}</strong>
          <span>plant categories</span>
        </div>
      </section>

      <section className="harvest-split" id="registry">
        <div className="harvest-section-intro">
          <p className="harvest-eyebrow">Harvest registry</p>
          <h2>Start by mapping the food already growing nearby.</h2>
          <p>
            The core Localized.life Harvest idea is simple: owners can register their own trees, and neighbors can
            separately share harvest leads that still need owner permission.
          </p>
        </div>

        <div className="harvest-modal-prompt">
          <p className="harvest-eyebrow">Owner path</p>
          <h3>Own a tree or perennial food plant?</h3>
          <p>
            Open a short form to add your plant to the registry. You can close it any time and come back later.
          </p>
          <button className="button harvest-primary" type="button" onClick={() => setOwnerFormOpen(true)}>
            Register my plant
          </button>
        </div>
      </section>

      <section className="harvest-list-section" aria-labelledby="registryListTitle">
        <div className="harvest-list-header">
          <div>
            <p className="harvest-eyebrow">{mode === "preview" ? "Registry preview" : "Living list"}</p>
            <h2 id="registryListTitle">{mode === "preview" ? "A quick look at what is registered." : "Registered harvest sites"}</h2>
          </div>
          {mode === "directory" ? (
            <div className="harvest-filters" aria-label="Registry filters">
              {filters.map((filter) => (
                <button
                  className={activeFilter === filter ? "harvest-filter is-active" : "harvest-filter"}
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                >
                  {filter === "Fruit tree"
                    ? "Fruit"
                    : filter === "Nut tree"
                      ? "Nuts"
                      : filter === "Berry bush"
                        ? "Berries"
                        : filter === "Other plant"
                          ? "Other"
                          : "All"}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="harvest-plant-grid" aria-live="polite">
          {mode === "preview" ? (
            <>
              <article className="harvest-plant-card harvest-directory-card">
                <span className="harvest-type">Public directory</span>
                <h3>Registered plants</h3>
                <p className="harvest-directory-count">
                  {plants.length} {plants.length === 1 ? "plant" : "plants"} listed by general area
                </p>
                <div className="harvest-preview-list">
                  {previewPlants.map((plant, index) => (
                    <div className="harvest-preview-row" key={`${plant.plantName}-${plant.location}-${index}`}>
                      <strong>{plant.plantName}</strong>
                      <span>
                        {plant.plantType} · {generalArea(plant.location)}
                      </span>
                    </div>
                  ))}
                </div>
                <Link className="button harvest-primary" href="/harvest/registry">
                  Open full registry
                </Link>
              </article>
              <article className="harvest-plant-card harvest-action-card harvest-featured-action">
                <span className="harvest-type">Register a tree</span>
                <h3>Add your harvest site.</h3>
                <p>
                  Owners can register fruit trees, nut trees, berry bushes, or other perennial food plants for future
                  harvest planning.
                </p>
                <button className="button harvest-primary" type="button" onClick={() => setOwnerFormOpen(true)}>
                  Register a plant
                </button>
              </article>
              <article className="harvest-plant-card harvest-action-card">
                <span className="harvest-type">Spotted tree</span>
                <h3>Share a harvest lead.</h3>
                <p>
                  Know of a fruit tree, nut tree, berry bush, or perennial food plant? Share the lead so the local team
                  can learn more and connect with the owner.
                </p>
                <button className="button harvest-primary" type="button" onClick={() => setLeadFormOpen(true)}>
                  Share a lead
                </button>
              </article>
              <article className="harvest-plant-card harvest-action-card">
                <span className="harvest-type">Paw Paw Revival</span>
                <h3>Donate to plant pawpaws.</h3>
                <p>Sponsor pawpaw seeds or small trees that can become registered future harvest trees.</p>
                <Link className="button harvest-primary" href="/harvest#pawpaw">
                  Open fundraiser
                </Link>
              </article>
            </>
          ) : visiblePlants.length ? (
            <>
              {visiblePlants.map((plant, index) => (
                <article className="harvest-plant-card" key={`${plant.plantName}-${plant.location}-${index}`}>
                  <span className="harvest-type">{plant.registryPath}</span>
                  <h3>{plant.plantName}</h3>
                  <dl>
                    <div>
                      <dt>Plant type</dt>
                      <dd>{plant.plantType}</dd>
                    </div>
                    <div>
                      <dt>General area</dt>
                      <dd>{generalArea(plant.location)}</dd>
                    </div>
                    <div>
                      <dt>Harvest window</dt>
                      <dd>{plant.harvestWindow || "Unknown"}</dd>
                    </div>
                    <div>
                      <dt>Public status</dt>
                      <dd>{publicStatus()}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </>
          ) : (
            <div className="harvest-empty">No plants in this part of the registry yet.</div>
          )}
        </div>
      </section>

      {ownerFormOpen ? (
        <div className="harvest-modal-backdrop" role="presentation" onMouseDown={() => setOwnerFormOpen(false)}>
          <div
            aria-labelledby="ownerFormTitle"
            aria-modal="true"
            className="harvest-modal"
            role="dialog"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="harvest-modal-header">
              <h3 id="ownerFormTitle">Register my tree or plant</h3>
              <button className="harvest-close-button" type="button" aria-label="Close form" onClick={() => setOwnerFormOpen(false)}>
                X
              </button>
            </div>
            <form className="harvest-form harvest-modal-form" onSubmit={handleOwnerSubmit}>
              <label>
                Plant name
                <input name="plantName" type="text" placeholder="Pear, black walnut, pawpaw..." required />
              </label>
              <label>
                Plant type
                <select name="plantType" required defaultValue="Fruit tree">
                  <option value="Fruit tree">Fruit tree</option>
                  <option value="Nut tree">Nut tree</option>
                  <option value="Berry bush">Berry bush</option>
                  <option value="Other plant">Other plant</option>
                </select>
              </label>
              <label>
                Plant location
                <input name="location" type="text" placeholder="Address, neighborhood, city, or landmark" required />
              </label>
              <label>
                Owner name
                <input name="ownerName" type="text" placeholder="Your name" required />
              </label>
              <label>
                Owner phone
                <input name="ownerPhone" type="tel" placeholder="Phone number" required />
              </label>
              <label>
                Owner email
                <input name="ownerEmail" type="email" placeholder="Optional email" />
              </label>
              <label>
                Production stage
                <select name="productionStage" defaultValue="Not sure yet">
                  <option value="Not producing yet">Not producing yet</option>
                  <option value="Producing now">Producing now</option>
                  <option value="Sometimes produces">Sometimes produces</option>
                  <option value="Not sure yet">Not sure yet</option>
                </select>
              </label>
              <label>
                Harvest window
                <input name="harvestWindow" type="text" placeholder="Late August, October, TBA..." />
              </label>
              <label>
                Owner permission
                <select name="access" defaultValue="Owner registered - contact before harvest">
                  <option value="Owner registered - contact before harvest">Contact me before any harvest</option>
                  <option value="Owner registered - interested in sharing surplus">Interested in sharing surplus</option>
                  <option value="Owner registered - needs harvest help">I may need harvest help</option>
                  <option value="Owner registered - registry only for now">Registry only for now</option>
                </select>
              </label>
              <label>
                Notes
                <textarea name="notes" placeholder="Tree health, estimated yield, access instructions, concerns, or goals..." />
              </label>
              <button className="button harvest-primary" type="submit">
                Register my plant
              </button>
              {confirmation ? <div className="harvest-form-success">{confirmation}</div> : null}
            </form>
          </div>
        </div>
      ) : null}

      {leadFormOpen ? (
        <div className="harvest-modal-backdrop" role="presentation" onMouseDown={() => setLeadFormOpen(false)}>
          <div
            aria-labelledby="leadFormTitle"
            aria-modal="true"
            className="harvest-modal"
            role="dialog"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="harvest-modal-header">
              <h3 id="leadFormTitle">Share a possible harvest lead</h3>
              <button className="harvest-close-button" type="button" aria-label="Close form" onClick={() => setLeadFormOpen(false)}>
                X
              </button>
            </div>
            <p className="harvest-modal-note">
              This is for a plant you noticed but do not own. Your phone number is only for follow-up questions about
              this lead. Owner permission can happen before any harvest planning.
            </p>
            <form className="harvest-form harvest-modal-form" onSubmit={handleLeadSubmit}>
              <label>
                Plant or tree noticed
                <input name="leadPlantName" type="text" placeholder="Apple tree, mulberry, grape vines..." required />
              </label>
              <label>
                Plant type
                <select name="leadPlantType" required defaultValue="Fruit tree">
                  <option value="Fruit tree">Fruit tree</option>
                  <option value="Nut tree">Nut tree</option>
                  <option value="Berry bush">Berry bush</option>
                  <option value="Other plant">Other plant</option>
                </select>
              </label>
              <label>
                Tree address or location
                <input
                  name="leadLocation"
                  type="text"
                  placeholder="Specific address if known, or cross streets, neighborhood, or landmark"
                  required
                />
              </label>
              <label>
                Your phone for follow-up
                <input name="leadReporterPhone" type="tel" placeholder="Best number for questions about this lead" required />
              </label>
              <label>
                Your email
                <input name="leadReporterEmail" type="email" placeholder="Optional email" />
              </label>
              <label>
                Possible harvest window
                <input name="leadHarvestWindow" type="text" placeholder="Summer, September, unknown..." />
              </label>
              <label>
                What should we know?
                <textarea name="leadNotes" placeholder="What you noticed, whether the owner is known, access context, or anything helpful..." />
              </label>
              <button className="button harvest-primary" type="submit">
                Save harvest lead
              </button>
              {leadConfirmation ? <div className="harvest-form-success">{leadConfirmation}</div> : null}
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
