const plantKey = "localizedHarvestPlants";
const pledgeKey = "pawPawRevivalPledges";
const involvedKey = "localizedHarvestInvolved";

const starterPlants = [
  {
    plantName: "Backyard pawpaw cluster",
    plantType: "Fruit tree",
    location: "Near the creek path",
    harvestWindow: "September",
    access: "Needs owner contact",
    notes: "Candidate site for Paw Paw Revival mapping."
  },
  {
    plantName: "Old black walnut",
    plantType: "Nut tree",
    location: "South side neighborhood",
    harvestWindow: "October",
    access: "Owner interested",
    notes: "Likely needs experienced nut processing."
  },
  {
    plantName: "Alley blackberry row",
    plantType: "Berry bush",
    location: "Community garden fence",
    harvestWindow: "June to July",
    access: "Public access",
    notes: "Easy starter harvest for volunteers."
  }
];

let activeFilter = "All";

const plantForm = document.querySelector("#plantForm");
const pledgeForm = document.querySelector("#pledgeForm");
const involvedForm = document.querySelector("#involvedForm");
const plantGrid = document.querySelector("#plantGrid");
const filterButtons = document.querySelectorAll(".filter");
const seedCountInput = pledgeForm?.querySelector("[name='seedCount']");
const treeCountInput = pledgeForm?.querySelector("[name='treeCount']");
const pledgeTotal = document.querySelector("#pledgeTotal");
const pledgeSuccess = document.querySelector("#pledgeSuccess");
const bridgeBucksLink = document.querySelector("#bridgeBucksLink");

function loadPlants() {
  const saved = localStorage.getItem(plantKey);
  if (!saved) {
    localStorage.setItem(plantKey, JSON.stringify(starterPlants));
    return starterPlants;
  }
  return JSON.parse(saved);
}

function loadPledges() {
  return JSON.parse(localStorage.getItem(pledgeKey) || "[]");
}

function loadInvolvedPeople() {
  return JSON.parse(localStorage.getItem(involvedKey) || "[]");
}

function savePlants(plants) {
  localStorage.setItem(plantKey, JSON.stringify(plants));
}

function savePledges(pledges) {
  localStorage.setItem(pledgeKey, JSON.stringify(pledges));
}

function saveInvolvedPeople(people) {
  localStorage.setItem(involvedKey, JSON.stringify(people));
}

function money(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

function pledgeAmount(pledge) {
  if (pledge.seedCount !== undefined || pledge.treeCount !== undefined) {
    return (Number(pledge.seedCount) * 5) + (Number(pledge.treeCount) * 25);
  }
  return Number(pledge.amount) || 0;
}

function sponsoredSeeds(pledges) {
  return pledges.reduce((sum, pledge) => sum + (Number(pledge.seedCount) || 0), 0);
}

function sponsoredTrees(pledges) {
  return pledges.reduce((sum, pledge) => {
    if (pledge.treeCount !== undefined) {
      return sum + (Number(pledge.treeCount) || 0);
    }
    return sum + Math.floor((Number(pledge.amount) || 0) / 25);
  }, 0);
}

function renderStats() {
  const plants = loadPlants();
  const pledges = loadPledges();
  const involvedPeople = loadInvolvedPeople();
  const totalPledged = pledges.reduce((sum, pledge) => sum + pledgeAmount(pledge), 0);
  const treeTotal = sponsoredTrees(pledges);
  const seedTotal = sponsoredSeeds(pledges);
  const possibleHarvestSites = plants.filter((plant) => plant.access !== "Needs owner contact").length;
  const registryTypes = new Set(plants.map((plant) => plant.plantType)).size;

  const totalPlants = document.querySelector("#totalPlants");
  const readySoon = document.querySelector("#readySoon");
  const registryTypesNode = document.querySelector("#registryTypes");
  const campaignPledged = document.querySelector("#campaignPledged");
  const donorCount = document.querySelector("#donorCount");
  const treeEstimate = document.querySelector("#treeEstimate");
  const seedEstimate = document.querySelector("#seedEstimate");
  const treeGoalProgress = document.querySelector("#treeGoalProgress");
  const treeGoalText = document.querySelector("#treeGoalText");
  const involvedCount = document.querySelector("#involvedCount");

  if (totalPlants) totalPlants.textContent = plants.length;
  if (readySoon) readySoon.textContent = possibleHarvestSites;
  if (registryTypesNode) registryTypesNode.textContent = registryTypes;
  if (campaignPledged) campaignPledged.textContent = money(totalPledged);
  if (donorCount) donorCount.textContent = pledges.length;
  if (treeEstimate) treeEstimate.textContent = treeTotal.toLocaleString("en-US");
  if (seedEstimate) seedEstimate.textContent = seedTotal.toLocaleString("en-US");
  if (treeGoalProgress) treeGoalProgress.value = Math.min(treeTotal, 1000000);
  if (treeGoalText) treeGoalText.textContent = `${treeTotal.toLocaleString("en-US")} of 1,000,000 small trees sponsored so far.`;
  if (involvedCount) involvedCount.textContent = involvedPeople.length;
}

function updatePledgeTotal() {
  if (!seedCountInput || !treeCountInput || !pledgeTotal) return;
  const seedCount = Math.max(0, Number(seedCountInput.value) || 0);
  const treeCount = Math.max(0, Number(treeCountInput.value) || 0);
  pledgeTotal.textContent = money((seedCount * 5) + (treeCount * 25));
}

function plantCard(plant) {
  const article = document.createElement("article");
  article.className = "plant-card";

  const type = document.createElement("span");
  type.className = "type";
  type.textContent = plant.plantType;

  const title = document.createElement("h3");
  title.textContent = plant.plantName;

  const details = document.createElement("dl");
  [
    ["Location", plant.location],
    ["Harvest window", plant.harvestWindow || "Unknown"],
    ["Access", plant.access],
    ["Notes", plant.notes || "No notes yet."]
  ].forEach(([label, value]) => {
    const row = document.createElement("div");
    const term = document.createElement("dt");
    const definition = document.createElement("dd");
    term.textContent = label;
    definition.textContent = value;
    row.append(term, definition);
    details.append(row);
  });

  article.append(type, title, details);
  return article;
}

function renderPlants() {
  if (!plantGrid) return;
  const plants = loadPlants();
  const visiblePlants = activeFilter === "All"
    ? plants
    : plants.filter((plant) => plant.plantType === activeFilter);

  plantGrid.replaceChildren();

  if (!visiblePlants.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No plants in this part of the registry yet.";
    plantGrid.append(empty);
    return;
  }

  visiblePlants.forEach((plant) => {
    plantGrid.append(plantCard(plant));
  });
}

if (plantForm) {
  plantForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(plantForm));
    const plants = loadPlants();
    plants.unshift(data);
    savePlants(plants);
    plantForm.reset();
    renderPlants();
    renderStats();
  });
}

if (pledgeForm) {
  pledgeForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(pledgeForm);
    const seedCount = Math.max(0, Number(formData.get("seedCount")) || 0);
    const treeCount = Math.max(0, Number(formData.get("treeCount")) || 0);
    if (seedCount + treeCount === 0) {
      seedCountInput.focus();
      return;
    }
    const pledges = loadPledges();
    const pledge = {
      name: formData.get("name"),
      email: formData.get("email"),
      seedCount,
      treeCount,
      amount: (seedCount * 5) + (treeCount * 25),
      message: formData.get("message"),
      createdAt: new Date().toISOString()
    };
    pledges.unshift(pledge);
    savePledges(pledges);

    let synced = false;
    try {
      const signupResponse = await fetch("/api/pawpaw-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pledge)
      });
      synced = signupResponse.ok;
    } catch {
      synced = false;
    }

    if (pledgeSuccess) {
      pledgeSuccess.hidden = false;
      pledgeSuccess.textContent = synced
        ? `You are on the Paw Paw Revival SendFox list for ${seedCount.toLocaleString("en-US")} seed planting${seedCount === 1 ? "" : "s"} and ${treeCount.toLocaleString("en-US")} small tree planting${treeCount === 1 ? "" : "s"}, estimated at ${money((seedCount * 5) + (treeCount * 25))}.`
        : `Your Paw Paw Revival waitlist pledge is saved in this browser for ${seedCount.toLocaleString("en-US")} seed planting${seedCount === 1 ? "" : "s"} and ${treeCount.toLocaleString("en-US")} small tree planting${treeCount === 1 ? "" : "s"}. SendFox still needs to be configured on the live site.`;
    }
    pledgeForm.reset();
    treeCountInput.value = 1;
    updatePledgeTotal();
    renderStats();
    if (bridgeBucksLink) {
      bridgeBucksLink.focus();
    }
  });
}

if (seedCountInput) seedCountInput.addEventListener("input", updatePledgeTotal);
if (treeCountInput) treeCountInput.addEventListener("input", updatePledgeTotal);

if (involvedForm) {
  involvedForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(involvedForm);
    const people = loadInvolvedPeople();
    people.unshift({
      name: formData.get("name"),
      email: formData.get("email"),
      place: formData.get("place"),
      roles: formData.getAll("roles"),
      notes: formData.get("notes"),
      createdAt: new Date().toISOString()
    });
    saveInvolvedPeople(people);
    involvedForm.reset();
    renderStats();
  });
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((item) => item.classList.toggle("is-active", item === button));
    renderPlants();
  });
});

renderPlants();
updatePledgeTotal();
renderStats();
