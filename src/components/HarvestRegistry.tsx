"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type PlantType = "Fruit tree" | "Nut tree" | "Berry bush" | "Other plant";
type AccessStatus = "Needs owner contact" | "Owner interested" | "Public access" | "Harvest-ready";

type HarvestPlant = {
  plantName: string;
  plantType: PlantType;
  location: string;
  harvestWindow: string;
  access: AccessStatus;
  notes: string;
};

const plantKey = "localizedHarvestPlants";

const starterPlants: HarvestPlant[] = [
  {
    plantName: "Backyard pawpaw cluster",
    plantType: "Fruit tree",
    location: "Near the creek path",
    harvestWindow: "September",
    access: "Needs owner contact",
    notes: "Candidate site for Paw Paw Revival mapping.",
  },
  {
    plantName: "Old black walnut",
    plantType: "Nut tree",
    location: "South side neighborhood",
    harvestWindow: "October",
    access: "Owner interested",
    notes: "Likely needs experienced nut processing.",
  },
  {
    plantName: "Alley blackberry row",
    plantType: "Berry bush",
    location: "Community garden fence",
    harvestWindow: "June to July",
    access: "Public access",
    notes: "Easy starter harvest for volunteers.",
  },
];

const filters: Array<PlantType | "All"> = ["All", "Fruit tree", "Nut tree", "Berry bush", "Other plant"];

function readPlants() {
  if (typeof window === "undefined") return starterPlants;

  const saved = window.localStorage.getItem(plantKey);
  if (!saved) {
    window.localStorage.setItem(plantKey, JSON.stringify(starterPlants));
    return starterPlants;
  }

  try {
    return JSON.parse(saved) as HarvestPlant[];
  } catch {
    window.localStorage.setItem(plantKey, JSON.stringify(starterPlants));
    return starterPlants;
  }
}

export function HarvestRegistry() {
  const [plants, setPlants] = useState<HarvestPlant[]>(starterPlants);
  const [activeFilter, setActiveFilter] = useState<PlantType | "All">("All");

  useEffect(() => {
    const timeout = window.setTimeout(() => setPlants(readPlants()), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const visiblePlants = useMemo(() => {
    if (activeFilter === "All") return plants;
    return plants.filter((plant) => plant.plantType === activeFilter);
  }, [activeFilter, plants]);

  const possibleHarvestSites = plants.filter((plant) => plant.access !== "Needs owner contact").length;
  const registryTypes = new Set(plants.map((plant) => plant.plantType)).size;

  function savePlants(nextPlants: HarvestPlant[]) {
    setPlants(nextPlants);
    window.localStorage.setItem(plantKey, JSON.stringify(nextPlants));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const nextPlant: HarvestPlant = {
      plantName: String(data.get("plantName") || ""),
      plantType: String(data.get("plantType") || "Fruit tree") as PlantType,
      location: String(data.get("location") || ""),
      harvestWindow: String(data.get("harvestWindow") || ""),
      access: String(data.get("access") || "Needs owner contact") as AccessStatus,
      notes: String(data.get("notes") || ""),
    };

    savePlants([nextPlant, ...plants]);
    form.reset();
  }

  return (
    <>
      <section className="harvest-stats" aria-label="Registry totals">
        <div>
          <strong>{plants.length}</strong>
          <span>registered plants</span>
        </div>
        <div>
          <strong>{possibleHarvestSites}</strong>
          <span>possible harvest sites</span>
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
            The core Localized.life Harvest idea is simple: build a living registry of harvestable trees and perennial
            plants so people can see what is growing nearby and coordinate harvest details when appropriate.
          </p>
        </div>

        <form className="harvest-form" onSubmit={handleSubmit}>
          <label>
            Plant name
            <input name="plantName" type="text" placeholder="Meyer lemon, black walnut, pawpaw..." required />
          </label>
          <label>
            Registry type
            <select name="plantType" required defaultValue="Fruit tree">
              <option value="Fruit tree">Fruit tree</option>
              <option value="Nut tree">Nut tree</option>
              <option value="Berry bush">Berry bush</option>
              <option value="Other plant">Other plant</option>
            </select>
          </label>
          <label>
            Location
            <input name="location" type="text" placeholder="Neighborhood, city, or landmark" required />
          </label>
          <label>
            Harvest window
            <input name="harvestWindow" type="text" placeholder="Late August, October, summer..." />
          </label>
          <label>
            Access status
            <select name="access" defaultValue="Needs owner contact">
              <option value="Needs owner contact">Needs owner contact</option>
              <option value="Owner interested">Owner interested</option>
              <option value="Public access">Public access</option>
              <option value="Harvest-ready">Harvest-ready</option>
            </select>
          </label>
          <label>
            Notes
            <textarea name="notes" placeholder="Tree health, estimated yield, contact context, pickup needs..." />
          </label>
          <button className="button harvest-primary" type="submit">
            Add to registry
          </button>
        </form>
      </section>

      <section className="harvest-list-section" aria-labelledby="registryListTitle">
        <div className="harvest-list-header">
          <div>
            <p className="harvest-eyebrow">Living list</p>
            <h2 id="registryListTitle">Registered harvest sites</h2>
          </div>
          <div className="harvest-filters" aria-label="Registry filters">
            {filters.map((filter) => (
              <button
                className={activeFilter === filter ? "harvest-filter is-active" : "harvest-filter"}
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
              >
                {filter === "Fruit tree" ? "Fruit" : filter === "Nut tree" ? "Nuts" : filter === "Berry bush" ? "Berries" : filter === "Other plant" ? "Other" : "All"}
              </button>
            ))}
          </div>
        </div>

        <div className="harvest-plant-grid" aria-live="polite">
          {visiblePlants.length ? (
            visiblePlants.map((plant, index) => (
              <article className="harvest-plant-card" key={`${plant.plantName}-${plant.location}-${index}`}>
                <span className="harvest-type">{plant.plantType}</span>
                <h3>{plant.plantName}</h3>
                <dl>
                  <div>
                    <dt>Location</dt>
                    <dd>{plant.location}</dd>
                  </div>
                  <div>
                    <dt>Harvest window</dt>
                    <dd>{plant.harvestWindow || "Unknown"}</dd>
                  </div>
                  <div>
                    <dt>Access</dt>
                    <dd>{plant.access}</dd>
                  </div>
                  <div>
                    <dt>Notes</dt>
                    <dd>{plant.notes || "No notes yet."}</dd>
                  </div>
                </dl>
              </article>
            ))
          ) : (
            <div className="harvest-empty">No plants in this part of the registry yet.</div>
          )}
        </div>
      </section>
    </>
  );
}
