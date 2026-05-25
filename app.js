const storageKey = "microbrewery-tracker-v1";

const starterData = {
  ingredients: [
    { id: "ing-1", name: "Pilsner slad", type: "Slad", stock: 180, unit: "kg", price: 1.35, minStock: 40 },
    { id: "ing-2", name: "Pale Ale slad", type: "Slad", stock: 95, unit: "kg", price: 1.48, minStock: 30 },
    { id: "ing-3", name: "Cara 50", type: "Slad", stock: 16, unit: "kg", price: 2.25, minStock: 8 },
    { id: "ing-4", name: "Cascade", type: "Hmelj", stock: 7.5, unit: "kg", price: 23, minStock: 2 },
    { id: "ing-5", name: "Saaz", type: "Hmelj", stock: 4.4, unit: "kg", price: 19, minStock: 2 },
    { id: "ing-6", name: "US-05", type: "Kvas", stock: 34, unit: "pcs", price: 3.4, minStock: 12 },
    { id: "ing-7", name: "CIP sredstvo", type: "Dodatek", stock: 11, unit: "l", price: 6.2, minStock: 4 }
  ],
  packaging: [
    { id: "pkg-1", name: "Steklenica 330 ml", type: "Steklenica", stock: 1800, unit: "pcs", price: 0.14, minStock: 600 },
    { id: "pkg-2", name: "Zamasek krona", type: "Zamasek", stock: 2500, unit: "pcs", price: 0.03, minStock: 800 },
    { id: "pkg-3", name: "Nalepka 330 ml", type: "Nalepka", stock: 2200, unit: "pcs", price: 0.06, minStock: 800 },
    { id: "pkg-4", name: "Karton 4-pack", type: "Paket", stock: 320, unit: "pcs", price: 0.28, minStock: 80 },
    { id: "pkg-5", name: "Karton 6-pack", type: "Paket", stock: 240, unit: "pcs", price: 0.38, minStock: 60 }
  ],
  recipes: [
    {
      id: "rec-1",
      name: "Hisa Pale Ale",
      yieldLiters: 300,
      abv: 5.2,
      laborHours: 7,
      laborRate: 18,
      overhead: 42,
      lines: [
        { ingredientId: "ing-2", qty: 62 },
        { ingredientId: "ing-3", qty: 8 },
        { ingredientId: "ing-4", qty: 1.8 },
        { ingredientId: "ing-6", qty: 6 },
        { ingredientId: "ing-7", qty: 1.2 }
      ]
    }
  ],
  batches: [
    {
      id: "bat-1",
      code: "PA-2026-001",
      recipeId: "rec-1",
      liters: 300,
      status: "Fermentacija",
      brewDate: "2026-05-18",
      costSnapshot: 464.28,
      stockConsumed: true,
      tasks: createTasks("2026-05-18")
    }
  ],
  purchases: [],
  products: [],
  orders: []
};

let state = loadState();
let recipeDraftLines = [];
let recipeEditingId = null;
let recipeEditDraftLines = [];
let purchaseDraftLines = [];
let orderDraftLines = [];
let purchaseEditingId = null;
let purchaseEditDraftLines = [];

const views = {
  dashboard: document.querySelector("#dashboardView"),
  inventory: document.querySelector("#inventoryView"),
  recipes: document.querySelector("#recipesView"),
  batches: document.querySelector("#batchesView"),
  purchases: document.querySelector("#purchasesView"),
  sales: document.querySelector("#salesView"),
  economics: document.querySelector("#economicsView"),
  automation: document.querySelector("#automationView")
};

const viewTitles = {
  dashboard: "Pregled",
  inventory: "Zaloge",
  recipes: "Recepti",
  batches: "Batchi",
  purchases: "Nabava",
  sales: "Naročila",
  economics: "Ekonomika",
  automation: "Avtomatizacija"
};

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

document.querySelector("#seedDataBtn").addEventListener("click", () => {
  state = structuredClone(starterData);
  saveState();
  renderAll();
});

document.querySelector("#resetDataBtn").addEventListener("click", () => {
  if (!confirm("Zelis izbrisati vse podatke aplikacije?")) return;
  state = { ingredients: [], packaging: [], recipes: [], batches: [], purchases: [], products: [], orders: [] };
  saveState();
  renderAll();
});

document.querySelector("#exportBtn").addEventListener("click", exportData);
document.querySelector("#importInput").addEventListener("change", importData);
document.querySelector("#inventorySearch").addEventListener("input", renderInventory);
document.querySelector("#packagingSearch").addEventListener("input", renderPackaging);
document.querySelector("#ingredientForm").addEventListener("submit", saveIngredient);
document.querySelector("#packagingForm").addEventListener("submit", savePackaging);
document.querySelector("#recipeForm").addEventListener("submit", saveRecipe);
document.querySelector("#batchForm").addEventListener("submit", saveBatch);
document.querySelector("#purchaseForm").addEventListener("submit", savePurchase);
document.querySelector("#productForm").addEventListener("submit", saveProduct);
document.querySelector("#orderForm").addEventListener("submit", saveOrder);
document.querySelector("#addRecipeLine").addEventListener("click", () => addRecipeLine());
document.querySelector("#addPurchaseLine").addEventListener("click", () => addPurchaseLine());
document.querySelector("#addOrderLine").addEventListener("click", () => addOrderLine());
document.querySelector("#parsePurchaseTextBtn").addEventListener("click", parsePurchaseTextToLines);
document.querySelector("#beerXmlInput").addEventListener("change", importBeerXmlFile);
document.querySelector("#importBeerXmlTextBtn").addEventListener("click", importBeerXmlText);
document.querySelector("#orderForm").addEventListener("keydown", preventOrderEnterSubmit);
document.querySelector("#orderForm").margin.addEventListener("input", updateOrderSuggestedPrices);
document.querySelector("#orderForm").margin.addEventListener("change", updateOrderSuggestedPrices);

renderAll();

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return normalizeState(structuredClone(starterData));

  try {
    const parsed = JSON.parse(saved);
    return normalizeState({
      ingredients: parsed.ingredients ?? [],
      packaging: parsed.packaging ?? [],
      recipes: parsed.recipes ?? [],
      batches: parsed.batches ?? [],
      purchases: parsed.purchases ?? [],
      products: parsed.products ?? [],
      orders: parsed.orders ?? []
    });
  } catch {
    return normalizeState(structuredClone(starterData));
  }
}

function normalizeState(data) {
  const ingredients = data.ingredients ?? [];
  const movedPackaging = ingredients
    .filter((item) => item.type === "Embalaža")
    .map((item) => ({ ...item, id: item.id.startsWith("pkg-") ? item.id : item.id.replace(/^ing-/, "pkg-"), type: guessPackagingType(item.name) }));
  const packaging = ensureDefaultPackaging([...(data.packaging ?? []), ...movedPackaging]);
  const packagingIds = new Set(movedPackaging.map((item) => item.id).concat(
    ingredients.filter((item) => item.type === "Embalaža").map((item) => item.id)
  ));

  return {
    ingredients: ingredients.filter((item) => item.type !== "Embalaža"),
    packaging,
    recipes: (data.recipes ?? []).map((recipe) => ({
      ...recipe,
      lines: recipe.lines.filter((line) => !packagingIds.has(line.ingredientId))
    })),
    batches: data.batches ?? [],
    purchases: data.purchases ?? [],
    products: data.products ?? [],
    orders: data.orders ?? []
  };
}

function ensureDefaultPackaging(packaging) {
  const defaults = starterData.packaging;
  const hasType = (type) => packaging.some((item) => item.type === type);
  const additions = defaults.filter((item) => !hasType(item.type));
  return [...packaging, ...structuredClone(additions)];
}

function guessPackagingType(name) {
  const value = name.toLowerCase();
  if (value.includes("zama")) return "Zamasek";
  if (value.includes("nalep")) return "Nalepka";
  if (value.includes("karton") || value.includes("pak") || value.includes("zaboj")) return "Paket";
  return "Steklenica";
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function switchView(name) {
  Object.entries(views).forEach(([key, element]) => {
    element.classList.toggle("is-active", key === name);
  });
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.view === name);
  });
  document.querySelector("#viewTitle").textContent = viewTitles[name];
}

function renderAll() {
  renderMetrics();
  renderInventory();
  renderPackaging();
  renderIngredientSuggestions();
  renderPurchaseSuggestions();
  renderRecipeLines();
  renderRecipes();
  renderBatchForm();
  renderBatches();
  renderProductForm();
  renderProducts();
  renderPurchaseLines();
  renderPurchases();
  renderOrderLines();
  renderOrders();
  renderEconomics();
  renderAutomation();
}

function money(value) {
  return new Intl.NumberFormat("sl-SI", { style: "currency", currency: "EUR" }).format(value || 0);
}

function number(value, digits = 2) {
  return new Intl.NumberFormat("sl-SI", { maximumFractionDigits: digits }).format(value || 0);
}

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function twoDecimals(value) {
  return roundMoney(value).toFixed(2);
}

function escapeAttribute(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("\"", "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function uid(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function ingredientById(id) {
  return state.ingredients.find((ingredient) => ingredient.id === id);
}

function recipeById(id) {
  return state.recipes.find((recipe) => recipe.id === id);
}

function ingredientForRecipeLine(line) {
  if (!line) return null;
  const byId = ingredientById(line.ingredientId);
  if (byId) return byId;
  const name = line.name?.trim().toLowerCase();
  if (!name) return null;
  return state.ingredients.find((ingredient) => ingredient.name.trim().toLowerCase() === name) ?? null;
}

function batchById(id) {
  return state.batches.find((batch) => batch.id === id);
}

function packagingById(id) {
  return state.packaging.find((item) => item.id === id);
}

function packagingByType(type) {
  return state.packaging.filter((item) => item.type === type);
}

function findInventoryMatchByName(name) {
  const normalized = name.trim().toLowerCase();
  const ingredient = state.ingredients.find((item) => item.name.trim().toLowerCase() === normalized);
  if (ingredient) return { kind: "ingredient", item: ingredient };
  const packaging = state.packaging.find((item) => item.name.trim().toLowerCase() === normalized);
  if (packaging) return { kind: "packaging", item: packaging };
  return null;
}

function recipeCost(recipe, liters = recipe.yieldLiters, scalingMode = "scale") {
  const ratio = scalingRatio(recipe, liters, scalingMode);
  const ingredientCost = recipe.lines.reduce((sum, line) => {
    const ingredient = ingredientForRecipeLine(line);
    return sum + (ingredient ? ingredient.price * line.qty * ratio : 0);
  }, 0);
  const laborCost = (recipe.laborHours || 0) * (recipe.laborRate || 0) * ratio;
  const overheadCost = (recipe.overhead || 0) * ratio;
  return ingredientCost + laborCost + overheadCost;
}

function recipeIngredientCost(recipe, liters = recipe.yieldLiters, scalingMode = "scale") {
  const ratio = scalingRatio(recipe, liters, scalingMode);
  return recipe.lines.reduce((sum, line) => {
    const ingredient = ingredientForRecipeLine(line);
    return sum + (ingredient ? ingredient.price * line.qty * ratio : 0);
  }, 0);
}

function scalingRatio(recipe, liters, scalingMode = "scale") {
  return scalingMode === "fixed" ? 1 : liters / recipe.yieldLiters;
}

function hasEnoughStock(recipe, liters, scalingMode = "scale") {
  const ratio = scalingRatio(recipe, liters, scalingMode);
  return recipe.lines.every((line) => {
    const ingredient = ingredientForRecipeLine(line);
    return !ingredient || ingredient.stock >= line.qty * ratio;
  });
}

function renderMetrics() {
  const inventoryValue = [...state.ingredients, ...state.packaging].reduce((sum, item) => sum + item.stock * item.price, 0);
  const activeBatches = state.batches.filter((batch) => batch.status !== "Zakljucen").length;
  const lowItems = [...state.ingredients, ...state.packaging].filter((item) => item.stock <= item.minStock).length;
  const plannedLiters = state.batches.reduce((sum, batch) => sum + Number(batch.liters || 0), 0);

  document.querySelector("#metrics").innerHTML = [
    metric("Vrednost zalog", money(inventoryValue)),
    metric("Aktivni batchi", activeBatches),
    metric("Nizke zaloge", lowItems),
    metric("Litri v evidenci", `${number(plannedLiters, 0)} l`)
  ].join("");

  renderStockAlerts();
  renderActiveBatchList();
}

function metric(label, value) {
  return `<article class="metric"><span>${label}</span><strong>${value}</strong></article>`;
}

function renderStockAlerts() {
  const alerts = [...state.ingredients, ...state.packaging]
    .filter((item) => item.stock <= item.minStock)
    .sort((a, b) => (a.minStock ? a.stock / a.minStock : 1) - (b.minStock ? b.stock / b.minStock : 1));

  document.querySelector("#stockAlerts").innerHTML = alerts.length
    ? alerts.map((item) => `
      <div class="list-item">
        <div><strong>${item.name}</strong><span>${item.type}</span></div>
        <span class="status ${item.stock === 0 ? "danger" : "low"}">${number(item.stock)} ${item.unit}</span>
      </div>
    `).join("")
    : `<div class="empty">Vse zaloge so nad minimalno mejo.</div>`;
}

function renderActiveBatchList() {
  const active = state.batches.filter((batch) => batch.status !== "Zakljucen");
  document.querySelector("#activeBatchList").innerHTML = active.length
    ? active.map((batch) => {
      const recipe = recipeById(batch.recipeId);
      return `
        <div class="list-item">
          <div><strong>${batch.code}</strong><span>${recipe?.name ?? "Neznan recept"} - ${batch.brewDate}</span></div>
          <span class="status ok">${batch.status}</span>
        </div>
      `;
    }).join("")
    : `<div class="empty">Trenutno ni aktivnih batchev.</div>`;
}

function saveIngredient(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const name = data.get("name").trim();
  const existing = state.ingredients.find((item) => item.name.trim().toLowerCase() === name.toLowerCase());

  if (existing) {
    existing.type = data.get("type");
    existing.stock = roundMoney(existing.stock + Number(data.get("stock")));
    existing.unit = data.get("unit");
    existing.price = roundMoney(data.get("price"));
    existing.minStock = roundMoney(data.get("minStock"));
  } else {
    state.ingredients.push({
      id: uid("ing"),
      name,
      type: data.get("type"),
      stock: roundMoney(data.get("stock")),
      unit: data.get("unit"),
      price: roundMoney(data.get("price")),
      minStock: roundMoney(data.get("minStock"))
    });
  }
  event.currentTarget.reset();
  saveState();
  renderAll();
}

function savePackaging(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  state.packaging.push({
    id: uid("pkg"),
    name: data.get("name").trim(),
    type: data.get("type"),
    stock: Number(data.get("stock")),
    unit: "pcs",
    price: Number(data.get("price")),
    minStock: Number(data.get("minStock"))
  });
  event.currentTarget.reset();
  saveState();
  renderAll();
}

function upsertInventoryItem(kind, name, type, unit, qty, price) {
  const list = kind === "packaging" ? state.packaging : state.ingredients;
  const normalized = name.trim().toLowerCase();
  let item = list.find((entry) => entry.name.trim().toLowerCase() === normalized);

  if (item) {
    item.type = type;
    item.stock = kind === "packaging" ? item.stock + qty : roundMoney(item.stock + qty);
    item.unit = kind === "packaging" ? "pcs" : unit;
    item.price = kind === "packaging" ? price : roundMoney(price);
  } else {
    item = {
      id: uid(kind === "packaging" ? "pkg" : "ing"),
      name: name.trim(),
      type,
      stock: kind === "packaging" ? qty : roundMoney(qty),
      unit: kind === "packaging" ? "pcs" : unit,
      price: kind === "packaging" ? price : roundMoney(price),
      minStock: 0
    };
    list.push(item);
  }

  return item;
}

function upsertIngredientFromImport(name, type, unit) {
  const normalized = name.trim().toLowerCase();
  let ingredient = state.ingredients.find((item) =>
    item.name.trim().toLowerCase() === normalized && item.type === type
  );

  if (!ingredient) {
    ingredient = {
      id: uid("ing"),
      name: name.trim(),
      type,
      stock: 0,
      unit,
      price: 0,
      minStock: 0
    };
    state.ingredients.push(ingredient);
  }

  return ingredient;
}

function renderInventory() {
  const search = document.querySelector("#inventorySearch").value?.toLowerCase() ?? "";
  const rows = state.ingredients
    .filter((item) => `${item.name} ${item.type}`.toLowerCase().includes(search))
    .map((item) => {
      const statusClass = item.stock === 0 ? "danger" : item.stock <= item.minStock ? "low" : "ok";
      const statusText = item.stock === 0 ? "Ni zaloge" : item.stock <= item.minStock ? "Nizko" : "OK";
      item.price = twoDecimals(item.price);
      return `
        <tr>
          <td><strong>${item.name}</strong></td>
          <td>${item.type}</td>
          <td><input class="price-edit" type="number" step="0.01" min="0" value="${twoDecimals(item.stock)}" aria-label="Zaloga ${item.name}" onchange="updateIngredientStock('${item.id}', this.value)"> ${item.unit}</td>
          <td><input class="price-edit" type="number" step="0.01" min="0" value="${item.price}" aria-label="Cena ${item.name}" onchange="updateIngredientPrice('${item.id}', this.value)"> €/${item.unit}</td>
          <td>
            <div class="stock-status">
              <span class="status ${statusClass}">${statusText}</span>
              <label>
                Min.
                <input class="price-edit" type="number" step="0.01" min="0" value="${twoDecimals(item.minStock)}" aria-label="Minimalna zaloga ${item.name}" onchange="updateIngredientMinStock('${item.id}', this.value)">
              </label>
            </div>
          </td>
          <td>
            <div class="row-actions">
              <button class="secondary small danger-action" type="button" onclick="deleteIngredient('${item.id}')">Izbrisi</button>
            </div>
          </td>
        </tr>
      `;
    });

  document.querySelector("#inventoryTable").innerHTML = rows.join("") || `
    <tr><td colspan="6">Ni sestavin za prikaz.</td></tr>
  `;
}

function renderIngredientSuggestions() {
  document.querySelector("#ingredientNameSuggestions").innerHTML = state.ingredients
    .map((item) => `<option value="${item.name}">${item.type}</option>`)
    .join("");
}

function renderPurchaseSuggestions() {
  document.querySelector("#purchaseIngredientSuggestions").innerHTML = state.ingredients
    .map((item) => `<option value="${item.name}">${item.type}</option>`)
    .join("");
  document.querySelector("#purchasePackagingSuggestions").innerHTML = state.packaging
    .map((item) => `<option value="${item.name}">${item.type}</option>`)
    .join("");
}

function purchaseSuggestionListId(line, index, context) {
  return `purchaseSuggestions-${context}-${index}`;
}

function purchaseSuggestionOptions(line) {
  const list = line.kind === "packaging" ? state.packaging : state.ingredients;
  return list
    .filter((item) => !line.type || item.type === line.type)
    .map((item) => `<option value="${escapeAttribute(item.name)}">${item.type}</option>`)
    .join("");
}

function renderPackaging() {
  const search = document.querySelector("#packagingSearch").value?.toLowerCase() ?? "";
  const rows = state.packaging
    .filter((item) => `${item.name} ${item.type}`.toLowerCase().includes(search))
    .map((item) => {
      const statusClass = item.stock === 0 ? "danger" : item.stock <= item.minStock ? "low" : "ok";
      const statusText = item.stock === 0 ? "Ni zaloge" : item.stock <= item.minStock ? "Nizko" : "OK";
      return `
        <tr>
          <td><strong>${item.name}</strong></td>
          <td>${item.type}</td>
          <td><input class="price-edit" type="number" step="1" min="0" value="${item.stock}" aria-label="Zaloga ${item.name}" onchange="updatePackagingStock('${item.id}', this.value)"> kos</td>
          <td><input class="price-edit" type="number" step="0.01" min="0" value="${item.price}" aria-label="Cena ${item.name}" onchange="updatePackagingPrice('${item.id}', this.value)"> €/kos</td>
          <td>
            <div class="stock-status">
              <span class="status ${statusClass}">${statusText}</span>
              <label>
                Min.
                <input class="price-edit" type="number" step="1" min="0" value="${item.minStock}" aria-label="Minimalna zaloga ${item.name}" onchange="updatePackagingMinStock('${item.id}', this.value)">
              </label>
            </div>
          </td>
          <td>
            <div class="row-actions">
              <button class="secondary small danger-action" type="button" onclick="deletePackaging('${item.id}')">Izbrisi</button>
            </div>
          </td>
        </tr>
      `;
    });

  document.querySelector("#packagingTable").innerHTML = rows.join("") || `
    <tr><td colspan="6">Ni embalaze za prikaz.</td></tr>
  `;
}

function groupedInventoryRows(items, rowRenderer) {
  const byType = items.reduce((groups, item) => {
    const type = item.type || "Drugo";
    if (!groups.has(type)) groups.set(type, []);
    groups.get(type).push(item);
    return groups;
  }, new Map());

  return [...byType.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "sl"))
    .flatMap(([type, group]) => [
      `<tr class="type-row"><td colspan="6">${type}</td></tr>`,
      ...group
        .sort((a, b) => a.name.localeCompare(b.name, "sl"))
        .map(rowRenderer)
    ]);
}

function renderIngredientRow(item) {
  const statusClass = item.stock === 0 ? "danger" : item.stock <= item.minStock ? "low" : "ok";
  const statusText = item.stock === 0 ? "Ni zaloge" : item.stock <= item.minStock ? "Nizko" : "OK";
  return `
    <tr>
      <td><strong>${item.name}</strong></td>
      <td>${item.type}</td>
      <td><input class="price-edit" type="number" step="0.01" min="0" value="${twoDecimals(item.stock)}" aria-label="Zaloga ${item.name}" onchange="updateIngredientStock('${item.id}', this.value)"> ${item.unit}</td>
      <td><input class="price-edit" type="number" step="0.01" min="0" value="${twoDecimals(item.price)}" aria-label="Cena ${item.name}" onchange="updateIngredientPrice('${item.id}', this.value)"> EUR/${item.unit}</td>
      <td>
        <div class="stock-status">
          <span class="status ${statusClass}">${statusText}</span>
          <label>
            Min.
            <input class="price-edit" type="number" step="0.01" min="0" value="${twoDecimals(item.minStock)}" aria-label="Minimalna zaloga ${item.name}" onchange="updateIngredientMinStock('${item.id}', this.value)">
          </label>
        </div>
      </td>
      <td>
        <div class="row-actions">
          <button class="secondary small danger-action" type="button" onclick="deleteIngredient('${item.id}')">Izbrisi</button>
        </div>
      </td>
    </tr>
  `;
}

function renderPackagingRow(item) {
  const statusClass = item.stock === 0 ? "danger" : item.stock <= item.minStock ? "low" : "ok";
  const statusText = item.stock === 0 ? "Ni zaloge" : item.stock <= item.minStock ? "Nizko" : "OK";
  return `
    <tr>
      <td><strong>${item.name}</strong></td>
      <td>${item.type}</td>
      <td><input class="price-edit" type="number" step="1" min="0" value="${item.stock}" aria-label="Zaloga ${item.name}" onchange="updatePackagingStock('${item.id}', this.value)"> kos</td>
      <td><input class="price-edit" type="number" step="0.01" min="0" value="${twoDecimals(item.price)}" aria-label="Cena ${item.name}" onchange="updatePackagingPrice('${item.id}', this.value)"> EUR/kos</td>
      <td>
        <div class="stock-status">
          <span class="status ${statusClass}">${statusText}</span>
          <label>
            Min.
            <input class="price-edit" type="number" step="1" min="0" value="${item.minStock}" aria-label="Minimalna zaloga ${item.name}" onchange="updatePackagingMinStock('${item.id}', this.value)">
          </label>
        </div>
      </td>
      <td>
        <div class="row-actions">
          <button class="secondary small danger-action" type="button" onclick="deletePackaging('${item.id}')">Izbrisi</button>
        </div>
      </td>
    </tr>
  `;
}

function renderInventory() {
  const search = document.querySelector("#inventorySearch").value?.toLowerCase() ?? "";
  const items = state.ingredients.filter((item) => `${item.name} ${item.type}`.toLowerCase().includes(search));
  const rows = groupedInventoryRows(items, renderIngredientRow);
  document.querySelector("#inventoryTable").innerHTML = rows.join("") || `
    <tr><td colspan="6">Ni sestavin za prikaz.</td></tr>
  `;
}

function renderPackaging() {
  const search = document.querySelector("#packagingSearch").value?.toLowerCase() ?? "";
  const items = state.packaging.filter((item) => `${item.name} ${item.type}`.toLowerCase().includes(search));
  const rows = groupedInventoryRows(items, renderPackagingRow);
  document.querySelector("#packagingTable").innerHTML = rows.join("") || `
    <tr><td colspan="6">Ni embalaze za prikaz.</td></tr>
  `;
}

function updateIngredientPrice(id, value) {
  const ingredient = ingredientById(id);
  const price = Number(value);
  if (!ingredient || !Number.isFinite(price) || price < 0) {
    renderInventory();
    return;
  }
  ingredient.price = roundMoney(price);
  saveState();
  renderAll();
}

function updateIngredientStock(id, value) {
  const ingredient = ingredientById(id);
  const stock = Number(value);
  if (!ingredient || !Number.isFinite(stock) || stock < 0) {
    renderInventory();
    return;
  }
  ingredient.stock = roundMoney(stock);
  saveState();
  renderAll();
}

function updatePackagingStock(id, value) {
  const item = packagingById(id);
  const stock = Number(value);
  if (!item || !Number.isFinite(stock) || stock < 0) {
    renderPackaging();
    return;
  }
  item.stock = stock;
  saveState();
  renderAll();
}

function updatePackagingPrice(id, value) {
  const item = packagingById(id);
  const price = Number(value);
  if (!item || !Number.isFinite(price) || price < 0) {
    renderPackaging();
    return;
  }
  item.price = price;
  saveState();
  renderAll();
}

function updateIngredientMinStock(id, value) {
  const ingredient = ingredientById(id);
  const minStock = Number(value);
  if (!ingredient || !Number.isFinite(minStock) || minStock < 0) {
    renderInventory();
    return;
  }
  ingredient.minStock = roundMoney(minStock);
  saveState();
  renderAll();
}

function updatePackagingMinStock(id, value) {
  const item = packagingById(id);
  const minStock = Number(value);
  if (!item || !Number.isFinite(minStock) || minStock < 0) {
    renderPackaging();
    return;
  }
  item.minStock = minStock;
  saveState();
  renderAll();
}

function deletePackaging(id) {
  const item = packagingById(id);
  if (!confirm(`Izbrisem embalazo "${item.name}" iz zalog?`)) return;
  state.packaging = state.packaging.filter((packaging) => packaging.id !== id);
  saveState();
  renderAll();
}

function deleteIngredient(id) {
  const ingredient = ingredientById(id);
  const usedInRecipes = state.recipes.filter((recipe) =>
    recipe.lines.some((line) => line.ingredientId === id)
  );
  const warning = usedInRecipes.length
    ? `\n\nTa sestavina je uporabljena v receptih: ${usedInRecipes.map((recipe) => recipe.name).join(", ")}. Ce jo izbrises, bo odstranjena tudi iz teh receptov.`
    : "";

  if (!confirm(`Izbrisem sestavino "${ingredient.name}" iz zalog?${warning}`)) return;

  state.ingredients = state.ingredients.filter((item) => item.id !== id);
  state.recipes = state.recipes.map((recipe) => ({
    ...recipe,
    lines: recipe.lines.filter((line) => line.ingredientId !== id)
  }));
  recipeDraftLines = recipeDraftLines.filter((line) => line.ingredientId !== id);
  recipeEditDraftLines = recipeEditDraftLines.filter((line) => line.ingredientId !== id);
  saveState();
  renderAll();
}

function addRecipeLine(line = { type: state.ingredients[0]?.type ?? "Slad", ingredientId: "", name: "", qty: 0 }) {
  recipeDraftLines.push(line);
  renderRecipeLines();
}

function renderRecipeLines() {
  if (recipeDraftLines.length === 0) {
    recipeDraftLines.push({ type: state.ingredients[0]?.type ?? "Slad", ingredientId: "", name: "", qty: 0 });
  }

  const list = document.querySelector("#recipeLineList");
  list.innerHTML = "";
  recipeDraftLines.forEach((line, index) => {
    const template = document.querySelector("#recipeLineTemplate").content.cloneNode(true);
    const ingredient = ingredientForRecipeLine(line);
    const selectedType = line.type || ingredient?.type || state.ingredients[0]?.type || "";
    const ingredientsForType = state.ingredients.filter((item) => item.type === selectedType);
    recipeDraftLines[index].type = selectedType;
    recipeDraftLines[index].ingredientId = ingredient?.id ?? "";
    recipeDraftLines[index].name = line.name || ingredient?.name || "";

    const typeSelect = template.querySelector(".line-type");
    const nameInput = template.querySelector(".line-ingredient");
    const listId = `recipeIngredientSuggestions-${index}`;
    typeSelect.innerHTML = ingredientTypes().map((type) => `
      <option value="${type}" ${type === selectedType ? "selected" : ""}>${type}</option>
    `).join("");
    nameInput.value = recipeDraftLines[index].name;
    nameInput.setAttribute("list", listId);
    template.querySelector(".line-type").addEventListener("change", (event) => {
      const nextType = event.target.value;
      recipeDraftLines[index].type = nextType;
      recipeDraftLines[index].ingredientId = "";
      renderRecipeLines();
    });
    template.querySelector(".line-qty").value = line.qty || "";
    nameInput.addEventListener("input", (event) => {
      updateRecipeDraftLineName(index, event.target.value);
    });
    template.querySelector(".line-qty").addEventListener("input", (event) => {
      recipeDraftLines[index].qty = Number(event.target.value);
    });
    template.querySelector(".line-remove").addEventListener("click", () => {
      recipeDraftLines.splice(index, 1);
      renderRecipeLines();
    });
    const suggestions = document.createElement("datalist");
    suggestions.id = listId;
    suggestions.innerHTML = recipeIngredientSuggestionOptions(selectedType);
    template.querySelector(".recipe-line").append(suggestions);
    list.append(template);
  });
}

function updateRecipeDraftLineName(index, name) {
  const line = recipeDraftLines[index];
  if (!line) return;
  const normalized = name.trim().toLowerCase();
  const match = state.ingredients.find((item) =>
    item.type === line.type && item.name.trim().toLowerCase() === normalized
  ) ?? state.ingredients.find((item) => item.name.trim().toLowerCase() === normalized);
  line.name = name;
  line.ingredientId = match?.id ?? "";
  if (match) line.type = match.type;
}

function normalizeRecipeLines(lines) {
  return lines
    .filter((line) => (line.ingredientId || line.name?.trim()) && Number(line.qty) > 0)
    .map((line) => {
      const ingredient = ingredientForRecipeLine(line);
      return {
        ingredientId: ingredient?.id ?? line.ingredientId ?? "",
        name: line.name?.trim() || ingredient?.name || "",
        type: line.type || ingredient?.type || "",
        qty: Number(line.qty)
      };
    });
}

function recipeIngredientSuggestionOptions(type) {
  return state.ingredients
    .filter((item) => !type || item.type === type)
    .map((item) => `<option value="${escapeAttribute(item.name)}">${item.unit}</option>`)
    .join("");
}

function addPurchaseLine(line = { kind: "ingredient", type: "Slad", name: "", qty: 0, unit: "kg", price: 0 }) {
  purchaseDraftLines.push(line);
  renderPurchaseLines();
}

function renderPurchaseLines() {
  if (purchaseDraftLines.length === 0) addPurchaseLine();

  const list = document.querySelector("#purchaseLineList");
  list.innerHTML = "";
  purchaseDraftLines.forEach((line, index) => {
    const template = document.querySelector("#purchaseLineTemplate").content.cloneNode(true);
    const kind = template.querySelector(".purchase-kind");
    const type = template.querySelector(".purchase-type");
    const name = template.querySelector(".purchase-name");
    const qty = template.querySelector(".purchase-qty");
    const unit = template.querySelector(".purchase-unit");
    const price = template.querySelector(".purchase-price");
    const listId = purchaseSuggestionListId(line, index, "new");

    kind.value = line.kind;
    type.innerHTML = purchaseTypes(line.kind).map((value) => `<option value="${value}" ${value === line.type ? "selected" : ""}>${value}</option>`).join("");
    name.value = line.name;
    name.setAttribute("list", listId);
    qty.value = line.qty || "";
    unit.value = line.unit || "kg";
    unit.disabled = line.kind === "packaging";
    price.value = line.price ? roundMoney(line.price).toFixed(2) : "";

    kind.addEventListener("change", (event) => {
      purchaseDraftLines[index].kind = event.target.value;
      purchaseDraftLines[index].type = purchaseTypes(event.target.value)[0];
      purchaseDraftLines[index].unit = event.target.value === "packaging" ? "pcs" : "kg";
      renderPurchaseLines();
    });
    type.addEventListener("change", (event) => {
      purchaseDraftLines[index].type = event.target.value;
      renderPurchaseLines();
    });
    name.addEventListener("input", (event) => {
      purchaseDraftLines[index].name = event.target.value;
      syncPurchaseLineFromName(index);
    });
    qty.addEventListener("input", (event) => purchaseDraftLines[index].qty = Number(event.target.value));
    unit.addEventListener("change", (event) => purchaseDraftLines[index].unit = event.target.value);
    price.addEventListener("input", (event) => purchaseDraftLines[index].price = Number(event.target.value));
    price.addEventListener("change", (event) => {
      purchaseDraftLines[index].price = roundMoney(event.target.value);
      event.target.value = purchaseDraftLines[index].price ? purchaseDraftLines[index].price.toFixed(2) : "";
    });
    template.querySelector(".purchase-remove").addEventListener("click", () => {
      purchaseDraftLines.splice(index, 1);
      renderPurchaseLines();
    });
    const suggestions = document.createElement("datalist");
    suggestions.id = listId;
    suggestions.innerHTML = purchaseSuggestionOptions(line);
    template.querySelector(".purchase-line").append(suggestions);
    list.append(template);
  });
}

function purchaseTypes(kind) {
  return kind === "packaging"
    ? ["Steklenica", "Zamasek", "Nalepka", "Paket", "Drugo"]
    : ["Slad", "Hmelj", "Kvas", "Dodatek"];
}

function syncPurchaseLineFromName(index) {
  const line = purchaseDraftLines[index];
  const match = findInventoryMatchByName(line.name);
  if (!match) return;
  line.kind = match.kind;
  line.type = match.item.type;
  line.unit = match.kind === "packaging" ? "pcs" : match.item.unit;
  if (!line.price) line.price = match.item.price;
  renderPurchaseLines();
}

function parsePurchaseTextToLines() {
  const textArea = document.querySelector("#purchaseText");
  const parsed = parsePurchaseText(textArea.value);
  if (!parsed.length) {
    setPurchaseTextStatus("Nisem prepoznal nobene postavke. Preveri, da imajo vrstice obliko: Naziv - 100 kom x 1 7.10 EUR ali Naziv - 100g x 1 7.10 EUR", true);
    return;
  }

  purchaseDraftLines = parsed;
  renderPurchaseLines();
  setPurchaseTextStatus(`Prebranih postavk: ${parsed.length}`, false);
}

function parsePurchaseText(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && line.toLowerCase() !== "product")
    .map(parsePurchaseTextLine)
    .filter(Boolean);
}

function parsePurchaseTextLine(line) {
  const match = line.match(/^(.+?)\s+([0-9]+(?:[.,][0-9]+)?)\s*(kg|g|l|ml|kom|kos|pc|pcs)?\s*[\u00d7x]\s*([0-9]+(?:[.,][0-9]+)?)\s+([0-9]+(?:[.,][0-9]+)?)\s*(?:\u20ac|eur)?/i);
  if (!match) return null;

  const rawName = match[1].replace(/\s+-\s*$/, "").trim();
  const packAmount = Number(match[2].replace(",", "."));
  const packUnit = match[3]?.toLowerCase() ?? "";
  const packCount = Number(match[4].replace(",", "."));
  const lineTotal = Number(match[5].replace(",", "."));
  const existing = findInventoryMatchByName(rawName);
  const kind = existing?.kind ?? guessPurchaseKind(rawName, packUnit);
  const type = existing?.item.type ?? (kind === "packaging" ? guessPackagingType(rawName) : guessIngredientType(rawName));
  const unit = resolvePurchaseUnit(existing, type, packUnit, packAmount);
  const totalQty = resolvePurchaseQty(existing, type, packAmount, packUnit, packCount);
  const price = totalQty > 0 ? roundMoney(lineTotal / totalQty) : 0;

  return {
    kind,
    type,
    name: rawName,
    qty: totalQty,
    unit,
    price
  };
}

function guessPurchaseKind(name, packUnit) {
  if (isPiecePurchaseUnit(packUnit)) return "packaging";
  const value = name.toLowerCase();
  if (value.includes("zamas") || value.includes("zama") || value.includes("steklen") || value.includes("nalep") || value.includes("karton") || value.includes("paket")) {
    return "packaging";
  }
  return "ingredient";
}

function resolvePurchaseUnit(existing, type, packUnit, packAmount) {
  if (existing?.kind === "packaging") return "pcs";
  if (type === "Kvas") return "pcs";
  if (packUnit) return normalizedPurchaseUnit(packUnit);
  if (existing?.item?.unit) return existing.item.unit;
  if (packAmount >= 10) return "kg";
  return "kg";
}

function resolvePurchaseQty(existing, type, packAmount, packUnit, packCount) {
  if (existing?.kind === "packaging") return packAmount * packCount;
  if (type === "Kvas") return packCount;
  if (packUnit) return normalizePurchaseQty(packAmount, packUnit, packCount);

  const existingUnit = existing?.item?.unit;
  if (existingUnit === "kg" || existingUnit === "l") {
    return (packAmount >= 10 ? packAmount / 1000 : packAmount) * packCount;
  }
  if (existingUnit === "pcs") {
    return packAmount * packCount;
  }
  return packAmount * packCount;
}

function normalizePurchaseQty(amount, unit, count) {
  if (unit === "g") return amount * count / 1000;
  if (unit === "ml") return amount * count / 1000;
  return amount * count;
}

function normalizedPurchaseUnit(unit) {
  if (isPiecePurchaseUnit(unit)) return "pcs";
  if (unit === "g" || unit === "kg") return "kg";
  if (unit === "ml" || unit === "l") return "l";
  return "pcs";
}

function isPiecePurchaseUnit(unit) {
  return ["kom", "kos", "pc", "pcs"].includes(unit);
}

function guessIngredientType(name) {
  const value = name.toLowerCase();
  if (value.includes("safale") || value.includes("kvas") || value.includes("yeast")) return "Kvas";
  if (value.includes("kosmic") || value.includes("kosmi") || value.includes("flakes")) return "Dodatek";
  if (value.includes("weyermann") || value.includes("malt") || value.includes("slad") || value.includes("carapils") || value.includes("wheat") || value.includes("psenic") || value.includes("pšeni")) return "Slad";
  return "Hmelj";
}

function setPurchaseTextStatus(message, isError) {
  const status = document.querySelector("#purchaseTextStatus");
  status.textContent = message;
  status.classList.toggle("danger-text", isError);
}

function savePurchase(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const lines = purchaseDraftLines
    .filter((line) => line.name.trim() && Number(line.qty) > 0)
    .map((line) => ({
      kind: line.kind,
      type: line.type,
      name: line.name.trim(),
      qty: Number(line.qty),
      unit: line.kind === "packaging" ? "pcs" : line.unit,
      price: roundMoney(line.price)
    }));

  if (!lines.length) {
    alert("Dodaj vsaj eno postavko nabave.");
    return;
  }

  adjustInventoryByPurchaseLines(lines, 1);
  state.purchases.unshift({
    id: uid("pur"),
    supplier: data.get("supplier").trim(),
    orderNo: data.get("orderNo").trim(),
    date: data.get("date"),
    url: data.get("url").trim(),
    lines,
    total: lines.reduce((sum, line) => sum + line.qty * line.price, 0)
  });

  purchaseDraftLines = [];
  purchaseEditingId = null;
  purchaseEditDraftLines = [];
  event.currentTarget.reset();
  event.currentTarget.date.value = new Date().toISOString().slice(0, 10);
  saveState();
  renderAll();
}

function adjustInventoryByPurchaseLines(lines, direction) {
  lines.forEach((line) => {
    if (direction > 0) {
      upsertInventoryItem(line.kind, line.name, line.type, line.unit, Number(line.qty || 0), roundMoney(line.price));
      return;
    }

    const list = line.kind === "packaging" ? state.packaging : state.ingredients;
    const item = list.find((entry) => entry.name.trim().toLowerCase() === line.name.trim().toLowerCase());
    if (item) {
      item.stock = Math.max(0, item.stock - Number(line.qty || 0));
    }
  });
}

function normalizePurchaseLines(lines) {
  return lines
    .filter((line) => line.name.trim() && Number(line.qty) > 0)
    .map((line) => ({
      kind: line.kind,
      type: line.type,
      name: line.name.trim(),
      qty: Number(line.qty),
      unit: line.kind === "packaging" ? "pcs" : line.unit,
      price: roundMoney(line.price)
    }));
}

function renderPurchases() {
  document.querySelector("#purchaseList").innerHTML = state.purchases.length
    ? state.purchases.map((purchase) => purchase.id === purchaseEditingId ? renderPurchaseEditor(purchase) : `
      <article class="card">
        <h4>${purchase.supplier}</h4>
        <dl>
          <dt>Racun</dt><dd>${purchase.orderNo}</dd>
          <dt>Datum</dt><dd>${purchase.date}</dd>
          <dt>Skupaj</dt><dd>${money(purchase.total)}</dd>
        </dl>
        <details class="recipe-ingredients">
          <summary>Postavke (${purchase.lines.length})</summary>
          <ul class="ingredient-lines">
            ${purchase.lines.map((line) => `
              <li><strong>${line.name}</strong><span>${number(line.qty)} ${line.unit} × ${money(line.price)}</span></li>
            `).join("")}
          </ul>
        </details>
        <div class="card-actions">
          ${purchase.url ? `<a class="secondary small link-button" href="${purchase.url}" target="_blank" rel="noreferrer">Odpri narocilo</a>` : ""}
          <button class="secondary small" type="button" onclick="editPurchase('${purchase.id}')">Uredi</button>
          <button class="secondary small danger-action" type="button" onclick="deletePurchase('${purchase.id}')">Izbrisi</button>
        </div>
      </article>
    `).join("")
    : `<div class="empty">Ni shranjenih nabav.</div>`;
}

function renderPurchaseEditor(purchase) {
  return `
    <article class="card edit-card">
      <div class="panel-header compact">
        <h4>Urejanje nabavnice</h4>
      </div>
      <div class="edit-grid">
        <label>
          Dobavitelj
          <input id="editPurchaseSupplier" value="${escapeAttribute(purchase.supplier)}">
        </label>
        <label>
          Racun
          <input id="editPurchaseOrderNo" value="${escapeAttribute(purchase.orderNo)}">
        </label>
        <label>
          Datum
          <input id="editPurchaseDate" type="date" value="${purchase.date}">
        </label>
        <label>
          URL
          <input id="editPurchaseUrl" type="url" value="${escapeAttribute(purchase.url)}">
        </label>
      </div>
      <div class="recipe-lines">
        <div class="line-header">
          <strong>Postavke</strong>
          <button class="secondary small" type="button" onclick="addPurchaseEditLine()">Dodaj postavko</button>
        </div>
        ${purchaseEditDraftLines.map((line, index) => renderPurchaseEditLine(line, index)).join("")}
      </div>
      <div class="card-actions">
        <button class="primary small" type="button" onclick="savePurchaseEdit('${purchase.id}')">Shrani spremembe</button>
        <button class="secondary small" type="button" onclick="cancelPurchaseEdit()">Preklici</button>
      </div>
    </article>
  `;
}

function renderPurchaseEditLine(line, index) {
  const types = purchaseTypes(line.kind);
  const listId = purchaseSuggestionListId(line, index, "edit");
  return `
    <div class="purchase-line">
      <select aria-label="Tip zaloge" onchange="updatePurchaseEditLine(${index}, 'kind', this.value)">
        <option value="ingredient" ${line.kind === "ingredient" ? "selected" : ""}>Sestavina</option>
        <option value="packaging" ${line.kind === "packaging" ? "selected" : ""}>Embalaza</option>
      </select>
      <select aria-label="Tip" onchange="updatePurchaseEditLine(${index}, 'type', this.value)">
        ${types.map((type) => `<option value="${type}" ${type === line.type ? "selected" : ""}>${type}</option>`).join("")}
      </select>
      <input list="${listId}" value="${escapeAttribute(line.name)}" placeholder="Naziv" oninput="updatePurchaseEditLine(${index}, 'name', this.value)">
      <datalist id="${listId}">${purchaseSuggestionOptions(line)}</datalist>
      <input type="number" step="0.01" min="0" value="${line.qty || ""}" placeholder="Kolicina" oninput="updatePurchaseEditLine(${index}, 'qty', this.value)">
      <select aria-label="Enota" ${line.kind === "packaging" ? "disabled" : ""} onchange="updatePurchaseEditLine(${index}, 'unit', this.value)">
        ${["kg", "g", "pcs", "l"].map((unit) => `<option value="${unit}" ${unit === (line.unit || "kg") ? "selected" : ""}>${unit === "pcs" ? "kos" : unit}</option>`).join("")}
      </select>
      <input type="number" step="0.01" min="0" value="${line.price ? roundMoney(line.price).toFixed(2) : ""}" placeholder="Cena/enoto" oninput="updatePurchaseEditLine(${index}, 'price', this.value)" onchange="roundPurchaseEditLinePrice(${index}, this.value)">
      <button class="ghost icon-btn purchase-remove" type="button" aria-label="Odstrani" onclick="removePurchaseEditLine(${index})">X</button>
    </div>
  `;
}

function editPurchase(id) {
  const purchase = state.purchases.find((item) => item.id === id);
  if (!purchase) return;
  purchaseEditingId = id;
  purchaseEditDraftLines = structuredClone(purchase.lines);
  renderPurchases();
}

function cancelPurchaseEdit() {
  purchaseEditingId = null;
  purchaseEditDraftLines = [];
  renderPurchases();
}

function addPurchaseEditLine() {
  purchaseEditDraftLines.push({ kind: "ingredient", type: "Slad", name: "", qty: 0, unit: "kg", price: 0 });
  renderPurchases();
}

function removePurchaseEditLine(index) {
  purchaseEditDraftLines.splice(index, 1);
  renderPurchases();
}

function updatePurchaseEditLine(index, field, value) {
  const line = purchaseEditDraftLines[index];
  if (!line) return;
  if (field === "kind") {
    line.kind = value;
    line.type = purchaseTypes(value)[0];
    line.unit = value === "packaging" ? "pcs" : "kg";
    renderPurchases();
    return;
  }
  if (field === "type") {
    line.type = value;
    renderPurchases();
    return;
  }
  if (field === "name") {
    line.name = value;
    syncPurchaseEditLineFromName(index);
    return;
  }
  if (field === "qty" || field === "price") {
    line[field] = Number(value);
    return;
  }
  line[field] = value;
}

function syncPurchaseEditLineFromName(index) {
  const line = purchaseEditDraftLines[index];
  const match = findInventoryMatchByName(line.name);
  if (!match) return;
  line.kind = match.kind;
  line.type = match.item.type;
  line.unit = match.kind === "packaging" ? "pcs" : match.item.unit;
  if (!line.price) line.price = match.item.price;
  renderPurchases();
}

function roundPurchaseEditLinePrice(index, value) {
  const line = purchaseEditDraftLines[index];
  if (!line) return;
  line.price = roundMoney(value);
  renderPurchases();
}

function savePurchaseEdit(id) {
  const purchase = state.purchases.find((item) => item.id === id);
  if (!purchase) return;

  const lines = normalizePurchaseLines(purchaseEditDraftLines);
  if (!lines.length) {
    alert("Nabavnica mora imeti vsaj eno postavko.");
    return;
  }

  adjustInventoryByPurchaseLines(purchase.lines, -1);
  adjustInventoryByPurchaseLines(lines, 1);

  purchase.supplier = document.querySelector("#editPurchaseSupplier").value.trim();
  purchase.orderNo = document.querySelector("#editPurchaseOrderNo").value.trim();
  purchase.date = document.querySelector("#editPurchaseDate").value;
  purchase.url = document.querySelector("#editPurchaseUrl").value.trim();
  purchase.lines = lines;
  purchase.total = lines.reduce((sum, line) => sum + line.qty * line.price, 0);

  purchaseEditingId = null;
  purchaseEditDraftLines = [];
  saveState();
  renderAll();
}

function deletePurchase(id) {
  const purchase = state.purchases.find((item) => item.id === id);
  if (!purchase) return;
  if (!confirm("Izbrisem zapis nabave in odstejem njegove postavke iz zaloge?")) return;

  adjustInventoryByPurchaseLines(purchase.lines, -1);

  state.purchases = state.purchases.filter((purchase) => purchase.id !== id);
  saveState();
  renderAll();
}

function ingredientTypes() {
  const preferred = ["Slad", "Hmelj", "Kvas", "Dodatek", "Embalaža"];
  const available = [...new Set(state.ingredients.map((item) => item.type))];
  return [
    ...preferred,
    ...available.filter((type) => !preferred.includes(type)).sort()
  ];
}

function importBeerXmlFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    importBeerXml(String(reader.result || ""));
    event.target.value = "";
  };
  reader.onerror = () => {
    setBeerXmlStatus("Datoteke nisem mogel prebrati.", true);
    event.target.value = "";
  };
  reader.readAsText(file);
}

function readBeerXmlFileBytesFallback(file, input) {
  const reader = new FileReader();
  reader.onload = () => {
    const bytes = new Uint8Array(reader.result || []);
    importBeerXml(decodeXmlFile(bytes));
    input.value = "";
  };
  reader.onerror = () => {
    setBeerXmlStatus("Datoteke nisem mogel prebrati.", true);
    input.value = "";
  };
  reader.readAsArrayBuffer(file);
}

function decodeXmlFile(bytes) {
  const header = new TextDecoder("windows-1252").decode(bytes.slice(0, 300));
  const encoding = header.match(/encoding\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase() || "utf-8";
  const label = encoding.includes("8859") || encoding.includes("latin") ? "windows-1252" : encoding;
  try {
    return new TextDecoder(label).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

function importBeerXmlText() {
  const textArea = document.querySelector("#beerXmlText");
  importBeerXml(textArea.value);
}

function importBeerXml(xmlText) {
  if (!xmlText.trim()) {
    setBeerXmlStatus("Prilepi BeerXML vsebino ali izberi XML datoteko.", true);
    return;
  }

  let imported = parseBeerXmlText(xmlText);
  if (!imported.lines.length) {
    const documentXml = new DOMParser().parseFromString(xmlText, "application/xml");
    if (documentXml.querySelector("parsererror")) {
      setBeerXmlStatus("Uvoz ni uspel. Vsebina ni veljaven XML.", true);
      return;
    }

    const recipeNode = descendantsByName(documentXml, "recipe")[0];
    if (!recipeNode) {
      setBeerXmlStatus("V XML datoteki nisem nasel elementa RECIPE.", true);
      return;
    }

    imported = { recipeFound: true, ...parseBeerXmlRecipe(recipeNode) };
  }

  if (!imported.lines.length) {
    setBeerXmlStatus(`Recept "${imported.name}" je najden, ampak brez prepoznanih sestavin. Najdeno: slad ${imported.counts.fermentables}, hmelj ${imported.counts.hops}, kvas ${imported.counts.yeasts}, dodatki ${imported.counts.miscs}.`, true);
    return;
  }

  state.recipes.push({
    id: uid("rec"),
    name: imported.name,
    yieldLiters: imported.yieldLiters,
    abv: imported.abv,
    laborHours: 6,
    laborRate: 18,
    overhead: 35,
    lines: imported.lines
  });

  document.querySelector("#beerXmlText").value = "";
  saveState();
  renderAll();
  switchView("recipes");
  setBeerXmlStatus(`Uvozen recept: ${imported.name}`, false);
}

function emptyImportCounts() {
  return { fermentables: 0, hops: 0, yeasts: 0, miscs: 0 };
}

function parseBeerXmlDocument(documentXml, xmlText) {
  const recipeNode = descendantsByName(documentXml, "recipe")[0];
  if (!recipeNode) {
    return parseBeerXmlText(xmlText);
  }
  return { recipeFound: true, ...parseBeerXmlRecipe(recipeNode) };
}

function setBeerXmlStatus(message, isError) {
  const status = document.querySelector("#beerXmlStatus");
  status.textContent = message;
  status.classList.toggle("danger-text", isError);
}

function parseBeerXmlRecipe(recipeNode) {
  const text = (name, fallback = "") => childText(recipeNode, name, fallback);
  const numeric = (name, fallback = 0) => {
    const value = Number(text(name).replace(",", "."));
    return Number.isFinite(value) ? value : fallback;
  };
  const lines = [];

  descendantsByName(recipeNode, "fermentable").forEach((node) => {
    const name = childText(node, "name");
    const amount = Number(childText(node, "amount").replace(",", "."));
    if (!name || !Number.isFinite(amount) || amount <= 0) return;
    const ingredient = upsertIngredientFromImport(name, "Slad", "kg");
    lines.push({ ingredientId: ingredient.id, qty: amount });
  });

  descendantsByName(recipeNode, "hop").forEach((node) => {
    const name = childText(node, "name");
    const amount = Number(childText(node, "amount").replace(",", "."));
    if (!name || !Number.isFinite(amount) || amount <= 0) return;
    const ingredient = upsertIngredientFromImport(name, "Hmelj", "kg");
    lines.push({ ingredientId: ingredient.id, qty: amount });
  });

  descendantsByName(recipeNode, "yeast").forEach((node) => {
    const name = childText(node, "name");
    const amountValue = childText(node, "amount");
    const amount = amountValue ? Number(amountValue.replace(",", ".")) : 1;
    if (!name || !Number.isFinite(amount) || amount <= 0) return;
    const ingredient = upsertIngredientFromImport(name, "Kvas", "pcs");
    lines.push({ ingredientId: ingredient.id, qty: amount });
  });

  descendantsByName(recipeNode, "misc").forEach((node) => {
    const name = childText(node, "name");
    const amount = Number(childText(node, "amount").replace(",", "."));
    const amountIsWeight = childText(node, "amount_is_weight").toUpperCase() === "TRUE";
    if (!name || !Number.isFinite(amount) || amount <= 0) return;
    const ingredient = upsertIngredientFromImport(name, "Dodatek", amountIsWeight ? "kg" : "l");
    lines.push({ ingredientId: ingredient.id, qty: amount });
  });

  return {
    name: text("name", "Uvozen recept"),
    yieldLiters: numeric("batch_size", 20),
    abv: numeric("est_abv", 0),
    lines,
    counts: {
      fermentables: descendantsByName(recipeNode, "fermentable").length,
      hops: descendantsByName(recipeNode, "hop").length,
      yeasts: descendantsByName(recipeNode, "yeast").length,
      miscs: descendantsByName(recipeNode, "misc").length
    }
  };
}

function parseBeerXmlText(xmlText) {
  const recipeBlock = extractBlock(xmlText, "recipe") || xmlText;
  const recipeFound = Boolean(extractBlock(xmlText, "recipe")) || /<[^>]*recipe[^>]*>/i.test(xmlText);
  const fermentables = extractBlocks(recipeBlock, "fermentable");
  const hops = extractBlocks(recipeBlock, "hop");
  const yeasts = extractBlocks(recipeBlock, "yeast");
  const miscs = extractBlocks(recipeBlock, "misc");
  const lines = [];

  fermentables.forEach((block) => {
    const name = tagText(block, "name");
    const amount = Number(tagText(block, "amount").replace(",", "."));
    if (!name || !Number.isFinite(amount) || amount <= 0) return;
    const ingredient = upsertIngredientFromImport(name, "Slad", "kg");
    lines.push({ ingredientId: ingredient.id, qty: amount });
  });

  hops.forEach((block) => {
    const name = tagText(block, "name");
    const amount = Number(tagText(block, "amount").replace(",", "."));
    if (!name || !Number.isFinite(amount) || amount <= 0) return;
    const ingredient = upsertIngredientFromImport(name, "Hmelj", "kg");
    lines.push({ ingredientId: ingredient.id, qty: amount });
  });

  yeasts.forEach((block) => {
    const name = tagText(block, "name");
    const amountText = tagText(block, "amount");
    const amount = amountText ? Number(amountText.replace(",", ".")) : 1;
    if (!name || !Number.isFinite(amount) || amount <= 0) return;
    const ingredient = upsertIngredientFromImport(name, "Kvas", "pcs");
    lines.push({ ingredientId: ingredient.id, qty: amount });
  });

  miscs.forEach((block) => {
    const name = tagText(block, "name");
    const amount = Number(tagText(block, "amount").replace(",", "."));
    const amountIsWeight = tagText(block, "amount_is_weight").toUpperCase() === "TRUE";
    if (!name || !Number.isFinite(amount) || amount <= 0) return;
    const ingredient = upsertIngredientFromImport(name, "Dodatek", amountIsWeight ? "kg" : "l");
    lines.push({ ingredientId: ingredient.id, qty: amount });
  });

  return {
    recipeFound,
    name: tagText(recipeBlock, "name") || "Uvozen recept",
    yieldLiters: Number(tagText(recipeBlock, "batch_size").replace(",", ".")) || 20,
    abv: Number(tagText(recipeBlock, "est_abv").replace(",", ".")) || 0,
    lines,
    counts: {
      fermentables: fermentables.length,
      hops: hops.length,
      yeasts: yeasts.length,
      miscs: miscs.length
    }
  };
}

function firstXmlTag(xmlText) {
  return xmlText.match(/<\s*([A-Za-z_][\w:.-]*)\b/)?.[1] || "";
}

function tagPattern(name) {
  const compact = name.replace(/_/g, "[-_]?");
  return `(?:[\\w.-]+:)?${compact}`;
}

function extractBlock(xmlText, name) {
  return xmlText.match(new RegExp(`<\\s*${tagPattern(name)}\\b[^>]*>[\\s\\S]*?<\\s*/\\s*${tagPattern(name)}\\s*>`, "i"))?.[0] || "";
}

function extractBlocks(xmlText, name) {
  return [...xmlText.matchAll(new RegExp(`<\\s*${tagPattern(name)}\\b[^>]*>[\\s\\S]*?<\\s*/\\s*${tagPattern(name)}\\s*>`, "gi"))].map((match) => match[0]);
}

function tagText(xmlText, name) {
  const match = xmlText.match(new RegExp(`<\\s*${tagPattern(name)}\\b[^>]*>([\\s\\S]*?)<\\s*/\\s*${tagPattern(name)}\\s*>`, "i"));
  return decodeXmlText(match?.[1] || "");
}

function decodeXmlText(value) {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = value.trim();
  return textarea.value.trim();
}

function nodeNameMatches(node, name) {
  const normalized = name.toLowerCase().replace(/_/g, "");
  const local = (node.localName || node.nodeName || "").toLowerCase().replace(/_/g, "");
  return local === normalized;
}

function descendantsByName(root, name) {
  return [...root.getElementsByTagName("*")].filter((node) => nodeNameMatches(node, name));
}

function childText(root, name, fallback = "") {
  const child = [...root.children].find((node) => nodeNameMatches(node, name));
  return child?.textContent?.trim() || fallback;
}

function saveRecipe(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const lines = normalizeRecipeLines(recipeDraftLines);

  if (!lines.length) {
    alert("Dodaj vsaj eno sestavino recepta.");
    return;
  }

  state.recipes.push({
    id: uid("rec"),
    name: data.get("name").trim(),
    yieldLiters: Number(data.get("yieldLiters")),
    abv: Number(data.get("abv")),
    laborHours: Number(data.get("laborHours")),
    laborRate: Number(data.get("laborRate")),
    overhead: Number(data.get("overhead")),
    lines
  });

  recipeDraftLines = [];
  event.currentTarget.reset();
  event.currentTarget.laborHours.value = 6;
  event.currentTarget.laborRate.value = 18;
  event.currentTarget.overhead.value = 35;
  saveState();
  renderAll();
}

function renderRecipes() {
  document.querySelector("#recipeList").innerHTML = state.recipes.length
    ? state.recipes.map((recipe) => recipe.id === recipeEditingId ? renderRecipeEditor(recipe) : (() => {
      const total = recipeCost(recipe);
      const perLiter = total / recipe.yieldLiters;
      const ingredients = recipe.lines.map((line, index) => {
        const ingredient = ingredientForRecipeLine(line);
        const lineName = ingredient?.name ?? line.name ?? "Rocna sestavina";
        const unit = ingredient?.unit ?? "";
        return `
          <li>
            <strong>${lineName}</strong>
            <span><input class="price-edit" type="number" step="0.01" min="0" value="${line.qty}" aria-label="Kolicina ${lineName}" onchange="updateRecipeLineQty('${recipe.id}', ${index}, this.value)"> ${unit}</span>
          </li>
        `;
      }).join("");
      return `
        <article class="card">
          <h4>${recipe.name}</h4>
          <dl>
            <dt>Kolicina</dt><dd>${number(recipe.yieldLiters, 0)} l</dd>
            <dt>ABV</dt><dd>${number(recipe.abv, 1)} %</dd>
            <dt>Delovni cas</dt><dd><input class="price-edit" type="number" step="0.25" min="0" value="${recipe.laborHours || 0}" aria-label="Delovni cas ${recipe.name}" onchange="updateRecipeCostField('${recipe.id}', 'laborHours', this.value)"> h</dd>
            <dt>Cena dela/h</dt><dd><input class="price-edit" type="number" step="0.01" min="0" value="${recipe.laborRate || 0}" aria-label="Cena dela ${recipe.name}" onchange="updateRecipeCostField('${recipe.id}', 'laborRate', this.value)"> €/h</dd>
            <dt>Rezija</dt><dd><input class="price-edit" type="number" step="0.01" min="0" value="${recipe.overhead || 0}" aria-label="Rezija ${recipe.name}" onchange="updateRecipeCostField('${recipe.id}', 'overhead', this.value)"> €</dd>
            <dt>Strosek batcha</dt><dd>${money(total)}</dd>
            <dt>Cena/l</dt><dd>${money(perLiter)}</dd>
            <dt>0.5 l steklenica</dt><dd>${money(perLiter * 0.5)}</dd>
            <dt>30 l sod</dt><dd>${money(perLiter * 30)}</dd>
          </dl>
          <details class="recipe-ingredients">
            <summary>Sestavine (${recipe.lines.length})</summary>
            <ul class="ingredient-lines">${ingredients}</ul>
          </details>
          <div class="card-actions">
            <button class="secondary small" type="button" onclick="duplicateRecipe('${recipe.id}')">Kopiraj</button>
            <button class="secondary small" type="button" onclick="editRecipeIngredients('${recipe.id}')">Uredi sestavine</button>
            <button class="secondary small" type="button" onclick="deleteRecipe('${recipe.id}')">Izbrisi</button>
          </div>
        </article>
      `;
    })()).join("")
    : `<div class="empty">Dodaj recept, da lahko ustvarjas batche.</div>`;
}

function renderRecipeEditor(recipe) {
  return `
    <article class="card edit-card">
      <div class="panel-header compact">
        <h4>Urejanje sestavin: ${recipe.name}</h4>
      </div>
      <div class="recipe-lines">
        <div class="line-header">
          <strong>Sestavine recepta</strong>
          <button class="secondary small" type="button" onclick="addRecipeEditLine()">Dodaj sestavino</button>
        </div>
        ${recipeEditDraftLines.map((line, index) => renderRecipeEditLine(line, index)).join("")}
      </div>
      <div class="card-actions">
        <button class="primary small" type="button" onclick="saveRecipeIngredientsEdit('${recipe.id}')">Shrani spremembe</button>
        <button class="secondary small" type="button" onclick="cancelRecipeIngredientsEdit()">Preklici</button>
      </div>
    </article>
  `;
}

function renderRecipeEditLine(line, index) {
  const ingredient = ingredientForRecipeLine(line);
  const selectedType = line.type || ingredient?.type || "Slad";
  const listId = `recipeEditIngredientSuggestions-${index}`;
  return `
    <div class="recipe-line">
      <select class="line-type" aria-label="Tip sestavine" onchange="updateRecipeEditLine(${index}, 'type', this.value)">
        ${ingredientTypes().map((type) => `<option value="${type}" ${type === selectedType ? "selected" : ""}>${type}</option>`).join("")}
      </select>
      <input class="line-ingredient" list="${listId}" placeholder="Naziv sestavine" value="${escapeAttribute(line.name || ingredient?.name || "")}" oninput="updateRecipeEditLine(${index}, 'name', this.value)">
      <datalist id="${listId}">${recipeIngredientSuggestionOptions(selectedType)}</datalist>
      <input class="line-qty" type="number" step="0.01" min="0" placeholder="Kolicina" value="${line.qty || ""}" oninput="updateRecipeEditLine(${index}, 'qty', this.value)">
      <button class="ghost icon-btn line-remove" type="button" aria-label="Odstrani" onclick="removeRecipeEditLine(${index})">X</button>
    </div>
  `;
}

function editRecipeIngredients(id) {
  const recipe = recipeById(id);
  if (!recipe) return;
  recipeEditingId = id;
  recipeEditDraftLines = structuredClone(recipe.lines).map((line) => {
    const ingredient = ingredientForRecipeLine(line);
    return {
      ingredientId: ingredient?.id ?? line.ingredientId ?? "",
      name: line.name || ingredient?.name || "",
      type: line.type || ingredient?.type || "Slad",
      qty: Number(line.qty || 0)
    };
  });
  renderRecipes();
}

function cancelRecipeIngredientsEdit() {
  recipeEditingId = null;
  recipeEditDraftLines = [];
  renderRecipes();
}

function addRecipeEditLine() {
  recipeEditDraftLines.push({ type: "Slad", ingredientId: "", name: "", qty: 0 });
  renderRecipes();
}

function removeRecipeEditLine(index) {
  recipeEditDraftLines.splice(index, 1);
  renderRecipes();
}

function updateRecipeEditLine(index, field, value) {
  const line = recipeEditDraftLines[index];
  if (!line) return;
  if (field === "type") {
    line.type = value;
    line.ingredientId = "";
    renderRecipes();
    return;
  }
  if (field === "name") {
    updateRecipeEditLineName(index, value);
    return;
  }
  if (field === "qty") {
    line.qty = Number(value);
  }
}

function updateRecipeEditLineName(index, name) {
  const line = recipeEditDraftLines[index];
  if (!line) return;
  const normalized = name.trim().toLowerCase();
  const match = state.ingredients.find((item) =>
    item.type === line.type && item.name.trim().toLowerCase() === normalized
  ) ?? state.ingredients.find((item) => item.name.trim().toLowerCase() === normalized);
  line.name = name;
  line.ingredientId = match?.id ?? "";
  if (match) {
    line.type = match.type;
    renderRecipes();
  }
}

function saveRecipeIngredientsEdit(id) {
  const recipe = recipeById(id);
  if (!recipe) return;
  const lines = normalizeRecipeLines(recipeEditDraftLines);
  if (!lines.length) {
    alert("Recept mora imeti vsaj eno sestavino.");
    return;
  }
  recipe.lines = lines;
  recipeEditingId = null;
  recipeEditDraftLines = [];
  saveState();
  renderAll();
}

function updateRecipeCostField(id, field, value) {
  const recipe = recipeById(id);
  const allowedFields = ["laborHours", "laborRate", "overhead"];
  const numericValue = Number(value);
  if (!recipe || !allowedFields.includes(field) || !Number.isFinite(numericValue) || numericValue < 0) {
    renderRecipes();
    return;
  }
  recipe[field] = numericValue;
  saveState();
  renderAll();
}

function updateRecipeLineQty(recipeId, lineIndex, value) {
  const recipe = recipeById(recipeId);
  const qty = Number(value);
  if (!recipe || !recipe.lines[lineIndex] || !Number.isFinite(qty) || qty < 0) {
    renderRecipes();
    return;
  }
  recipe.lines[lineIndex].qty = qty;
  saveState();
  renderAll();
}

function renderProductForm() {
  const form = document.querySelector("#productForm");
  if (!form) return;
  fillBatchSelect("#productBatchSelect", form.batchId.value);
  fillPackagingSelect("#productBottleSelect", "Steklenica", form.bottleItemId.value);
  fillPackagingSelect("#productCapSelect", "Zamasek", form.capItemId.value);
  fillPackagingSelect("#productLabelSelect", "Nalepka", form.labelItemId.value);
}

function fillBatchSelect(selector, selectedId) {
  const select = document.querySelector(selector);
  if (!select) return;
  select.innerHTML = state.batches.map((batch) => {
    const recipe = recipeById(batch.recipeId);
    return `<option value="${batch.id}" ${batch.id === selectedId ? "selected" : ""}>${batch.code} - ${recipe?.name ?? "Neznan recept"}</option>`;
  }).join("") || `<option value="">Ni batcha</option>`;
}

function productCost(product) {
  const batch = batchById(product.batchId);
  const bottle = packagingById(product.bottleItemId);
  const cap = packagingById(product.capItemId);
  const label = packagingById(product.labelItemId);
  const beerLiters = productBeerLiters(product);
  const beerCost = batch ? (batch.costSnapshot / batch.liters) * beerLiters : 0;
  const bottleCost = bottle?.price ?? 0;
  const capCost = cap?.price ?? 0;
  const labelCost = label?.price ?? 0;
  return {
    batch,
    bottle,
    cap,
    label,
    beerCost,
    bottleCost,
    capCost,
    labelCost,
    total: roundMoney(beerCost + bottleCost + capCost + labelCost)
  };
}

function productBeerLiters(product) {
  if (product.beerLiters !== undefined) return Number(product.beerLiters) || 0;
  return (Number(product.beerMl) || 0) / 1000;
}

function parseDecimalInput(value) {
  return Number(String(value ?? "").replace(",", "."));
}

function saveProduct(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const beerAmount = Number(data.get("beerAmount") || data.get("beerMl")) || 0.33;
  const beerLiters = beerAmount > 10 ? beerAmount / 1000 : beerAmount;
  const product = {
    id: uid("prd"),
    name: data.get("name").trim(),
    batchId: data.get("batchId"),
    bottleItemId: data.get("bottleItemId"),
    beerLiters,
    beerMl: beerLiters * 1000,
    capItemId: data.get("capItemId"),
    labelItemId: data.get("labelItemId"),
    availableQty: Number(data.get("availableQty")) || 0
  };
  if (!hasEnoughPackagingForProduct(product)) {
    alert("Zaloga izbrane embalaze ne zadosca za ustvarjanje toliko izdelkov.");
    return;
  }
  adjustPackagingForProduct(product, -1);
  state.products.unshift(product);
  event.currentTarget.reset();
  event.currentTarget.beerAmount.value = 0.33;
  event.currentTarget.availableQty.value = 0;
  saveState();
  renderAll();
}

function hasEnoughPackagingForProduct(product) {
  return productPackagingDeltas(product).every(({ item, qty }) => item && item.stock >= qty);
}

function adjustPackagingForProduct(product, direction) {
  productPackagingDeltas(product).forEach(({ item, qty }) => {
    if (item) item.stock = Math.max(0, item.stock + direction * qty);
  });
}

function productPackagingDeltas(product) {
  const qty = Math.max(0, Number(product.availableQty) || 0);
  return [
    { item: packagingById(product.bottleItemId), qty },
    { item: packagingById(product.capItemId), qty },
    { item: packagingById(product.labelItemId), qty }
  ];
}

function renderProducts() {
  const list = document.querySelector("#productList");
  if (!list) return;
  list.innerHTML = state.products.length
    ? state.products.map((product) => {
      const cost = productCost(product);
      const recipe = recipeById(cost.batch?.recipeId);
      return `
        <article class="card">
          <h4>${product.name}</h4>
          <dl>
            <dt>Pivo</dt><dd>${cost.batch?.code ?? "Ni batcha"}</dd>
            <dt>Na voljo</dt><dd>${number(product.availableQty, 0)} kos</dd>
            <dt>Lastna cena</dt><dd>${money(cost.total)}</dd>
          </dl>
          <details class="recipe-ingredients">
            <summary>Izracun cene izdelka</summary>
            <dl class="sales-summary">
              <dt>Recept</dt><dd>${recipe?.name ?? "Neznan recept"}</dd>
              <dt>Pivo ${number(productBeerLiters(product), 2)} l</dt><dd>${money(cost.beerCost)}</dd>
              <dt>${cost.bottle?.name ?? "Steklenica"}</dt><dd>${money(cost.bottleCost)}</dd>
              <dt>${cost.cap?.name ?? "Zamasek"}</dt><dd>${money(cost.capCost)}</dd>
              <dt>${cost.label?.name ?? "Nalepka"}</dt><dd>${money(cost.labelCost)}</dd>
              <dt>Skupaj</dt><dd>${money(cost.total)}</dd>
            </dl>
          </details>
          <div class="card-actions">
            <button class="secondary small danger-action" type="button" onclick="deleteProduct('${product.id}')">Izbrisi</button>
          </div>
        </article>
      `;
    }).join("")
    : `<div class="empty">Ni ustvarjenih izdelkov.</div>`;
}

function deleteProduct(id) {
  const product = state.products.find((item) => item.id === id);
  if (!product) return;
  const usedInOpenOrders = state.orders.some((order) =>
    !order.paid && order.lines.some((line) => line.productId === id)
  );
  const warning = usedInOpenOrders
    ? "\n\nIzdelek je uporabljen v odprtih narocilih. Ta narocila bodo ostala, vendar izdelek ne bo vec na seznamu izdelkov."
    : "";
  if (!confirm(`Izbrisem izdelek "${product.name}"?${warning}`)) return;
  if (Number(product.availableQty || 0) > 0 && confirm("Zelis ob izbrisu povrniti embalazo za se razpolozljive komade izdelka v zalogo?")) {
    adjustPackagingForProduct(product, 1);
  }
  state.products = state.products.filter((item) => item.id !== id);
  orderDraftLines = orderDraftLines.filter((line) => line.productId !== id);
  saveState();
  renderAll();
}

function addOrderLine(line = defaultOrderLine()) {
  orderDraftLines.push(line);
  renderOrderLines();
}

function defaultOrderLine() {
  return {
    productId: state.products[0]?.id ?? "",
    productQty: 1,
    packageItemId: packagingByType("Paket")[0]?.id ?? "",
    packageQty: 1,
    offeredPrice: 0
  };
}

function renderOrderLines() {
  const list = document.querySelector("#orderLineList");
  if (!list) return;
  const form = document.querySelector("#orderForm");
  form.date.value ||= new Date().toISOString().slice(0, 10);
  if (orderDraftLines.length === 0) orderDraftLines.push(defaultOrderLine());
  list.innerHTML = "";
  orderDraftLines.forEach((line, index) => {
    const template = document.querySelector("#orderLineTemplate").content.cloneNode(true);
    const productSelect = template.querySelector(".order-product");
    const productQty = template.querySelector(".order-product-qty");
    const packageSelect = template.querySelector(".order-package");
    const packageQty = template.querySelector(".order-package-qty");
    const suggestedPrice = template.querySelector(".order-suggested-price");
    const price = template.querySelector(".order-price");
    const calc = orderLineCalculation(line, orderMarginValue());

    productSelect.innerHTML = state.products.map((product) =>
      `<option value="${product.id}" ${product.id === line.productId ? "selected" : ""}>${product.name} (${number(product.availableQty, 0)} kos)</option>`
    ).join("") || `<option value="">Najprej ustvari izdelek</option>`;
    packageSelect.innerHTML = packagingByType("Paket").map((item) =>
      `<option value="${item.id}" ${item.id === line.packageItemId ? "selected" : ""}>${item.name}</option>`
    ).join("") || `<option value="">Brez embalaze</option>`;
    productQty.value = line.productQty || "";
    packageQty.value = line.packageQty ?? 1;
    suggestedPrice.value = `${money(calc.suggestedPrice)} predlog`;
    price.value = line.offeredPrice ? roundMoney(line.offeredPrice).toFixed(2) : "";
    price.placeholder = calc.suggestedPrice ? `${roundMoney(calc.suggestedPrice).toFixed(2)} predlog` : "Ponujena cena";

    productSelect.addEventListener("change", (event) => updateOrderDraftLine(index, "productId", event.target.value));
    productQty.addEventListener("input", (event) => {
      updateOrderDraftLine(index, "productQty", parseDecimalInput(event.target.value));
      updateOrderLineSuggestion(index);
    });
    packageSelect.addEventListener("change", (event) => updateOrderDraftLine(index, "packageItemId", event.target.value));
    packageQty.addEventListener("input", (event) => {
      updateOrderDraftLine(index, "packageQty", parseDecimalInput(event.target.value));
      updateOrderLineSuggestion(index);
    });
    price.addEventListener("input", (event) => updateOrderDraftLine(index, "offeredPrice", parseDecimalInput(event.target.value)));
    price.addEventListener("change", (event) => {
      orderDraftLines[index].offeredPrice = roundMoney(event.target.value);
      event.target.value = orderDraftLines[index].offeredPrice ? orderDraftLines[index].offeredPrice.toFixed(2) : "";
    });
    template.querySelector(".order-remove").addEventListener("click", () => {
      orderDraftLines.splice(index, 1);
      renderOrderLines();
    });
    list.append(template);
  });
}

function preventOrderEnterSubmit(event) {
  if (event.key === "Enter" && event.target?.tagName !== "TEXTAREA") {
    event.preventDefault();
  }
}

function updateOrderDraftLine(index, field, value) {
  if (!orderDraftLines[index]) return;
  orderDraftLines[index][field] = value;
  if (["productId", "packageItemId"].includes(field)) renderOrderLines();
}

function updateOrderSuggestedPrices() {
  orderDraftLines.forEach((_, index) => updateOrderLineSuggestion(index));
}

function updateOrderLineSuggestion(index) {
  const line = orderDraftLines[index];
  const row = document.querySelectorAll("#orderLineList .order-line")[index];
  if (!line || !row) return;
  const calc = orderLineCalculation(line, orderMarginValue());
  const output = row.querySelector(".order-suggested-price");
  const price = row.querySelector(".order-price");
  if (output) output.value = `${money(calc.suggestedPrice)} predlog`;
  if (price && !price.value) price.placeholder = calc.suggestedPrice ? `${roundMoney(calc.suggestedPrice).toFixed(2)} predlog` : "Ponujena cena";
}

function orderMarginValue() {
  return parseDecimalInput(document.querySelector("#orderForm")?.margin?.value) || 0;
}

function orderLineCalculation(line, marginOverride) {
  const product = state.products.find((item) => item.id === line.productId);
  const packageItem = packagingById(line.packageItemId);
  const productQty = Math.max(1, Number(line.productQty) || 1);
  const packageQty = Math.max(0, Number(line.packageQty) || 0);
  const margin = marginOverride ?? Number(line.margin) ?? 0;
  const productUnitCost = product ? productCost(product).total : 0;
  const packageCost = (packageItem?.price ?? 0) * packageQty;
  const baseCost = productUnitCost * productQty + packageCost;
  const suggestedPrice = roundMoney(productUnitCost * productQty * (1 + margin / 100) + packageCost);
  const offeredPrice = roundMoney(line.offeredPrice || suggestedPrice);
  return { product, packageItem, productQty, packageQty, margin, productUnitCost, packageCost, baseCost, suggestedPrice, offeredPrice };
}

function normalizeOrderLines(lines, margin) {
  return lines
    .filter((line) => line.productId && Number(line.productQty) > 0)
    .map((line) => {
      const calc = orderLineCalculation(line, margin);
      return {
        productId: line.productId,
        productQty: calc.productQty,
        packageItemId: line.packageItemId,
        packageQty: calc.packageQty,
        productUnitCost: roundMoney(calc.productUnitCost),
        packageCost: roundMoney(calc.packageCost),
        suggestedPrice: calc.suggestedPrice,
        offeredPrice: calc.offeredPrice
      };
    });
}

function saveOrder(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const margin = parseDecimalInput(data.get("margin")) || 0;
  const lines = normalizeOrderLines(orderDraftLines, margin);
  if (!lines.length) {
    alert("Dodaj vsaj eno postavko narocila.");
    return;
  }
  state.orders.unshift({
    id: uid("ord"),
    customer: data.get("customer").trim(),
    date: data.get("date"),
    margin,
    paid: false,
    lines,
    total: lines.reduce((sum, line) => sum + line.offeredPrice, 0)
  });
  orderDraftLines = [];
  event.currentTarget.reset();
  event.currentTarget.date.value = new Date().toISOString().slice(0, 10);
  event.currentTarget.margin.value = 35;
  saveState();
  renderAll();
}

function renderOrders() {
  const list = document.querySelector("#orderList");
  if (!list) return;
  list.innerHTML = state.orders.length
    ? state.orders.map((order) => `
      <article class="card">
        <h4>${order.customer}</h4>
        <dl>
          <dt>Datum</dt><dd>${order.date}</dd>
          <dt>Skupaj</dt><dd>${money(order.total)}</dd>
          <dt>Status</dt><dd>${order.paid ? "Placano" : "Odprto"}</dd>
        </dl>
        <details class="recipe-ingredients" open>
          <summary>Postavke (${order.lines.length})</summary>
          <ul class="ingredient-lines">
            ${order.lines.map((line) => {
              const calc = orderLineCalculation(line, order.margin);
              return `<li><strong>${calc.product?.name ?? "Izdelek"}</strong><span>${line.productQty} kos, ${line.packageQty} embalaze, ${money(line.offeredPrice)}</span></li>`;
            }).join("")}
          </ul>
        </details>
        <div class="card-actions">
          <label class="checkbox-row">
            <input type="checkbox" ${order.paid ? "checked" : ""} onchange="toggleOrderPaid('${order.id}', this.checked)">
            Placano in odpisi embalazo
          </label>
          <button class="secondary small danger-action" type="button" onclick="deleteOrder('${order.id}')">Izbrisi</button>
        </div>
      </article>
    `).join("")
    : `<div class="empty">Ni shranjenih narocil.</div>`;
  document.querySelector("#salesResult").innerHTML = renderBeerWarnings();
}

function renderBeerWarnings() {
  const low = state.batches
    .map((batch) => ({ batch, remaining: remainingBatchLiters(batch.id) }))
    .filter(({ batch, remaining }) => remaining <= Math.max(10, batch.liters * 0.2));
  return low.length
    ? `<div class="sales-block"><h4>Opozorila piva</h4>${low.map(({ batch, remaining }) => `<p class="danger-text">${batch.code}: preostane ${number(remaining, 1)} l.</p>`).join("")}</div>`
    : `<div class="empty">Trenutno ni opozoril za zalogo piva.</div>`;
}

function orderPackagingDeltas(order) {
  const deltas = new Map();
  order.lines.forEach((line) => {
    const calc = orderLineCalculation(line, order.margin);
    const id = calc.packageItem?.id;
    if (id) deltas.set(id, (deltas.get(id) || 0) + Number(line.packageQty || 0));
  });
  return deltas;
}

function adjustStockForOrder(order, direction) {
  orderPackagingDeltas(order).forEach((qty, id) => {
    const item = packagingById(id);
    if (item) item.stock = Math.max(0, item.stock + direction * qty);
  });
  order.lines.forEach((line) => {
    const product = state.products.find((item) => item.id === line.productId);
    if (product) product.availableQty = Math.max(0, Number(product.availableQty || 0) + direction * Number(line.productQty || 0));
  });
}

function toggleOrderPaid(id, paid) {
  const order = state.orders.find((item) => item.id === id);
  if (!order || order.paid === paid) return;
  adjustStockForOrder(order, paid ? -1 : 1);
  order.paid = paid;
  saveState();
  renderAll();
}

function deleteOrder(id) {
  const order = state.orders.find((item) => item.id === id);
  if (!order) return;
  if (!confirm("Izbrisem narocilo?")) return;
  if (order.paid) adjustStockForOrder(order, 1);
  state.orders = state.orders.filter((item) => item.id !== id);
  saveState();
  renderAll();
}

function remainingBatchLiters(batchId) {
  const batch = batchById(batchId);
  if (!batch) return 0;
  const soldLiters = state.orders
    .filter((order) => order.paid)
    .flatMap((order) => order.lines)
    .filter((line) => state.products.find((product) => product.id === line.productId)?.batchId === batchId)
    .reduce((sum, line) => {
      const product = state.products.find((item) => item.id === line.productId);
      return sum + Number(line.productQty || 0) * productBeerLiters(product || {});
    }, 0);
  return Math.max(0, batch.liters - soldLiters);
}

function renderEconomics() {
  const metrics = document.querySelector("#economicsMetrics");
  const batchList = document.querySelector("#batchEconomicsList");
  if (!metrics || !batchList) return;
  const spent = state.purchases.reduce((sum, purchase) => sum + Number(purchase.total || 0), 0);
  const earned = state.orders.filter((order) => order.paid).reduce((sum, order) => sum + Number(order.total || 0), 0);
  const openOrders = state.orders.filter((order) => !order.paid).reduce((sum, order) => sum + Number(order.total || 0), 0);
  const inventoryValue = [...state.ingredients, ...state.packaging].reduce((sum, item) => sum + Number(item.stock || 0) * Number(item.price || 0), 0);
  metrics.innerHTML = [
    metric("Porabljen denar", money(spent)),
    metric("Zasluzeno", money(earned)),
    metric("Odprta narocila", money(openOrders)),
    metric("Vrednost zalog", money(inventoryValue))
  ].join("");

  batchList.innerHTML = state.batches.length
    ? state.batches.map(renderBatchEconomicsCard).join("")
    : `<div class="empty">Ni batchev za ekonomski pregled.</div>`;
}

function renderBatchEconomicsCard(batch) {
  const recipe = recipeById(batch.recipeId);
  const components = batchCostComponents(recipe, batch);
  const total = components.reduce((sum, item) => sum + item.value, 0) || 1;
  const salesValue = batchSalesValue(batch.id);
  const remaining = remainingBatchLiters(batch.id);
  return `
    <article class="card">
      <h4>${batch.code}</h4>
      <dl>
        <dt>Recept</dt><dd>${recipe?.name ?? "Neznan recept"}</dd>
        <dt>Strosek batcha</dt><dd>${money(batch.costSnapshot)}</dd>
        <dt>Placana prodaja</dt><dd>${money(salesValue)}</dd>
        <dt>Preostanek piva</dt><dd>${number(remaining, 1)} l</dd>
      </dl>
      <div class="cost-stack" aria-label="Sestava stroska batcha">
        ${components.map((item) => `<span style="height:${Math.max(6, item.value / total * 100)}%" title="${item.label}: ${money(item.value)}"></span>`).join("")}
      </div>
      <ul class="ingredient-lines">
        ${components.map((item) => `<li><strong>${item.label}</strong><span>${money(item.value)}</span></li>`).join("")}
      </ul>
    </article>
  `;
}

function batchCostComponents(recipe, batch) {
  if (!recipe) return [{ label: "Skupaj", value: batch.costSnapshot || 0 }];
  const ratio = scalingRatio(recipe, batch.liters, batch.scalingMode);
  const ingredients = recipeIngredientCost(recipe, batch.liters, batch.scalingMode);
  const labor = (recipe.laborHours || 0) * (recipe.laborRate || 0) * ratio;
  const overhead = (recipe.overhead || 0) * ratio;
  return [
    { label: "Sestavine", value: ingredients },
    { label: "Delo", value: labor },
    { label: "Rezija", value: overhead }
  ];
}

function batchSalesValue(batchId) {
  return state.orders
    .filter((order) => order.paid)
    .flatMap((order) => order.lines)
    .filter((line) => state.products.find((product) => product.id === line.productId)?.batchId === batchId)
    .reduce((sum, line) => sum + Number(line.offeredPrice || 0), 0);
}

function handleSalesChange(event) {
  renderSales();
}

function renderSales() {
  const form = document.querySelector("#salesForm");
  const batchSelect = document.querySelector("#salesBatchSelect");
  const selectedBatchId = form.batchId.value;
  batchSelect.innerHTML = state.batches.map((batch) => {
    const recipe = recipeById(batch.recipeId);
    return `<option value="${batch.id}">${batch.code} - ${recipe?.name ?? "Neznan recept"}</option>`;
  }).join("");

  fillPackagingSelect("#salesBottleSelect", "Steklenica", form.bottleItemId.value);
  fillPackagingSelect("#salesCapSelect", "Zamasek", form.capItemId.value);
  fillPackagingSelect("#salesLabelSelect", "Nalepka", form.labelItemId.value);
  fillPackagingSelect("#packageTypeSelect", "Paket", form.packageItemId.value);

  const batch = batchById(selectedBatchId) || state.batches[0];
  if (batch && form.batchId.value !== batch.id) {
    form.batchId.value = batch.id;
  }

  if (!batch) {
    document.querySelector("#salesResult").innerHTML = `<div class="empty">Najprej ustvari batch, potem lahko izracunas ceno steklenice in paketa.</div>`;
    return;
  }

  const recipe = recipeById(batch.recipeId);
  const bottle = packagingById(form.bottleItemId.value) || packagingByType("Steklenica")[0];
  const cap = packagingById(form.capItemId.value) || packagingByType("Zamasek")[0];
  const label = packagingById(form.labelItemId.value) || packagingByType("Nalepka")[0];
  const packageItem = packagingById(form.packageItemId.value) || packagingByType("Paket")[0];
  const bottleMl = Number(form.bottleMl.value) || 330;
  const bottleLiters = bottleMl / 1000;
  const margin = Number(form.margin.value) || 0;
  const bottlesPerPackage = Math.max(1, Number(form.bottlesPerPackage.value) || 1);
  const beerCostPerLiter = batch.costSnapshot / batch.liters;
  const beerCostPerBottle = beerCostPerLiter * bottleLiters;
  const bottleCost = bottle?.price ?? 0;
  const capCost = cap?.price ?? 0;
  const labelCost = label?.price ?? 0;
  const packageCost = packageItem?.price ?? 0;
  const packagingPerBottle = bottleCost + capCost + labelCost;
  const totalBottleCost = beerCostPerBottle + packagingPerBottle;
  const autoBottlePrice = totalBottleCost * (1 + margin / 100);
  const bottlePrice = Number(form.manualBottlePrice.value) || autoBottlePrice;
  const packageBaseCost = totalBottleCost * bottlesPerPackage + packageCost;
  const autoPackagePrice = packageBaseCost * (1 + margin / 100);
  const packagePrice = Number(form.manualPackagePrice.value) || autoPackagePrice;

  document.querySelector("#salesResult").innerHTML = `
    <div class="sales-block">
      <h4>Cena steklenice za batch</h4>
      <dl class="sales-summary">
        <dt>Batch</dt><dd>${batch.code}</dd>
        <dt>Recept</dt><dd>${recipe?.name ?? "Neznan recept"}</dd>
        <dt>Cena piva/l</dt><dd>${money(beerCostPerLiter)}</dd>
        <dt>Pivo v steklenici</dt><dd>${money(beerCostPerBottle)}</dd>
        <dt>${bottle?.name ?? "Steklenica"}</dt><dd>${money(bottleCost)}</dd>
        <dt>${cap?.name ?? "Zamasek"}</dt><dd>${money(capCost)}</dd>
        <dt>${label?.name ?? "Nalepka"}</dt><dd>${money(labelCost)}</dd>
        <dt>Lastna cena steklenice</dt><dd>${money(totalBottleCost)}</dd>
        <dt>Prodajna cena steklenice</dt><dd>${money(bottlePrice)}</dd>
      </dl>
    </div>
    <div class="sales-block">
      <h4>Cena paketa iz batcha</h4>
      <dl class="sales-summary">
        <dt>Vrsta embalaze</dt><dd>${packageItem?.name ?? "Brez embalaze"}</dd>
        <dt>Steklenic v paketu</dt><dd>${number(bottlesPerPackage, 0)}</dd>
        <dt>Steklenice skupaj</dt><dd>${money(totalBottleCost * bottlesPerPackage)}</dd>
        <dt>Embalaza paketa</dt><dd>${money(packageCost)}</dd>
        <dt>Lastna cena paketa</dt><dd>${money(packageBaseCost)}</dd>
        <dt>Prodajna cena paketa</dt><dd>${money(packagePrice)}</dd>
      </dl>
    </div>
  `;
}

function fillPackagingSelect(selector, type, selectedId) {
  const select = document.querySelector(selector);
  const items = packagingByType(type);
  select.innerHTML = items.length
    ? items.map((item) => `
      <option value="${item.id}" ${item.id === selectedId ? "selected" : ""}>${item.name} (${money(item.price)})</option>
    `).join("")
    : `<option value="">Ni zaloge tipa ${type}</option>`;
  if (selectedId && items.some((item) => item.id === selectedId)) {
    select.value = selectedId;
  }
}

function duplicateRecipe(id) {
  const recipe = recipeById(id);
  state.recipes.push({ ...structuredClone(recipe), id: uid("rec"), name: `${recipe.name} kopija` });
  saveState();
  renderAll();
}

function deleteRecipe(id) {
  if (!confirm("Izbrisem recept?")) return;
  state.recipes = state.recipes.filter((recipe) => recipe.id !== id);
  saveState();
  renderAll();
}

function renderBatchForm() {
  const select = document.querySelector("#batchRecipeSelect");
  select.innerHTML = state.recipes.map((recipe) => `
    <option value="${recipe.id}">${recipe.name}</option>
  `).join("");
  document.querySelector("#batchForm").brewDate.value ||= new Date().toISOString().slice(0, 10);
}

function saveBatch(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const recipe = recipeById(data.get("recipeId"));
  const liters = Number(data.get("liters"));
  const consumeStock = data.get("consumeStock") === "on";
  const scalingMode = data.get("scalingMode") || "scale";

  if (!recipe) {
    alert("Najprej dodaj recept.");
    return;
  }

  if (consumeStock && !hasEnoughStock(recipe, liters, scalingMode)) {
    alert("Zaloge ne zadoscajo za ta batch. Povecaj zalogo ali zmanjsaj kolicino.");
    return;
  }

  const consumedLines = consumeStock ? consumeIngredients(recipe, liters, scalingMode) : [];

  state.batches.push({
    id: uid("bat"),
    code: data.get("code").trim(),
    recipeId: recipe.id,
    liters,
    status: data.get("status"),
    brewDate: data.get("brewDate"),
    scalingMode,
    costSnapshot: recipeCost(recipe, liters, scalingMode),
    stockConsumed: consumeStock,
    stockLines: consumedLines,
    tasks: createTasks(data.get("brewDate"))
  });

  event.currentTarget.reset();
  event.currentTarget.brewDate.value = new Date().toISOString().slice(0, 10);
  event.currentTarget.consumeStock.checked = true;
  event.currentTarget.scalingMode.value = "scale";
  saveState();
  renderAll();
}

function consumeIngredients(recipe, liters, scalingMode = "scale") {
  const lines = batchIngredientUsage(recipe, liters, scalingMode);
  lines.forEach((line) => {
    const ingredient = ingredientById(line.ingredientId);
    if (ingredient) ingredient.stock = Math.max(0, ingredient.stock - line.qty);
  });
  return lines;
}

function restoreBatchIngredients(batch) {
  const recipe = recipeById(batch.recipeId);
  const lines = batch.stockLines?.length
    ? batch.stockLines
    : recipe
      ? batchIngredientUsage(recipe, batch.liters, batch.scalingMode)
      : [];

  if (!lines.length) {
    alert("Zaloge ne morem povrniti, ker recept ali zapis porabljenih sestavin ni vec na voljo.");
    return false;
  }

  lines.forEach((line) => {
    const ingredient = ingredientById(line.ingredientId);
    if (ingredient) ingredient.stock += Number(line.qty || 0);
  });
  return true;
}

function batchIngredientUsage(recipe, liters, scalingMode = "scale") {
  const ratio = scalingRatio(recipe, liters, scalingMode);
  return recipe.lines
    .map((line) => {
      const ingredient = ingredientForRecipeLine(line);
      return {
        ingredientId: ingredient?.id ?? "",
        name: line.name || ingredient?.name || "",
        qty: Number(line.qty || 0) * ratio
      };
    })
    .filter((line) => line.ingredientId);
}

function createTasks(brewDate) {
  return [
    { name: "Priprava vode in mletja", date: offsetDate(brewDate, -1), done: false },
    { name: "Varjenje in hlajenje pivine", date: brewDate, done: false },
    { name: "Kontrola fermentacije", date: offsetDate(brewDate, 2), done: false },
    { name: "Meritev FG in diacetilni pocitek", date: offsetDate(brewDate, 7), done: false },
    { name: "Hladno zorenje", date: offsetDate(brewDate, 10), done: false },
    { name: "Pakiranje in etikete", date: offsetDate(brewDate, 17), done: false }
  ];
}

function offsetDate(date, days) {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

function renderBatches() {
  document.querySelector("#batchList").innerHTML = state.batches.length
    ? state.batches.map((batch) => {
      const recipe = recipeById(batch.recipeId);
      const perLiter = batch.costSnapshot / batch.liters;
      return `
        <article class="card">
          <h4>${batch.code}</h4>
          <dl>
            <dt>Recept</dt><dd>${recipe?.name ?? "Izbrisan recept"}</dd>
            <dt>Status</dt><dd>${batch.status}</dd>
            <dt>Datum</dt><dd>${batch.brewDate}</dd>
            <dt>Litri</dt><dd>${number(batch.liters, 0)} l</dd>
            <dt>Kolicine</dt><dd>${batch.scalingMode === "fixed" ? "Kot v receptu" : "Skalirane"}</dd>
            <dt>Strosek</dt><dd>${money(batch.costSnapshot)}</dd>
            <dt>Cena/l</dt><dd>${money(perLiter)}</dd>
          </dl>
          <div class="card-actions">
            <button class="secondary small" type="button" onclick="advanceBatch('${batch.id}')">Naslednja faza</button>
            <button class="secondary small" type="button" onclick="deleteBatch('${batch.id}')">Izbrisi</button>
          </div>
        </article>
      `;
    }).join("")
    : `<div class="empty">Ni ustvarjenih batchev.</div>`;
}

function advanceBatch(id) {
  const stages = ["Planiran", "Varjenje", "Fermentacija", "Hladno zorenje", "Pakiranje", "Zakljucen"];
  const batch = state.batches.find((item) => item.id === id);
  const nextIndex = Math.min(stages.indexOf(batch.status) + 1, stages.length - 1);
  batch.status = stages[nextIndex];
  saveState();
  renderAll();
}

function deleteBatch(id) {
  const batch = state.batches.find((item) => item.id === id);
  if (!batch) return;
  if (!confirm("Izbrisem batch?")) return;

  if (batch.stockConsumed && confirm("Zelis ob izbrisu povrniti porabljene kolicine sestavin v zalogo?")) {
    const restored = restoreBatchIngredients(batch);
    if (!restored) return;
  }

  state.batches = state.batches.filter((batch) => batch.id !== id);
  saveState();
  renderAll();
}

function renderAutomation() {
  const steps = [
    ["Planiranje recepta", "Recept sam izracuna strosek sestavin, dela, rezije, ceno na liter, steklenico in sod."],
    ["Kontrola zalog", "Ob kreiranju batcha aplikacija preveri, ali so vse sestavine na voljo."],
    ["Odpis sestavin", "Ce je vklopljen avtomatski odpis, se sestavine sorazmerno odstejejo od zaloge."],
    ["Koledar nalog", "Za vsak batch nastanejo naloge za pripravo, fermentacijo, zorenje in pakiranje."],
    ["Opozorila", "Pregled prikaze sestavine pod minimalno zalogo in aktivne batche."],
    ["Prenos podatkov", "Celotno evidenco lahko izvozis ali uvozis kot JSON datoteko."]
  ];

  document.querySelector("#automationList").innerHTML = steps.map((step, index) => `
    <div class="automation-step">
      <div class="step-number">${index + 1}</div>
      <div><h4>${step[0]}</h4><p>${step[1]}</p></div>
    </div>
  `).join("");

  const tasks = state.batches.flatMap((batch) => batch.tasks.map((task, index) => ({ ...task, batchId: batch.id, batchCode: batch.code, index })))
    .sort((a, b) => a.date.localeCompare(b.date));

  document.querySelector("#taskList").innerHTML = tasks.length
    ? tasks.map((task) => `
      <div class="list-item">
        <div><strong>${task.name}</strong><span>${task.batchCode} - ${task.date}</span></div>
        <label class="checkbox-row">
          <input type="checkbox" ${task.done ? "checked" : ""} onchange="toggleTask('${task.batchId}', ${task.index})">
          Opravljeno
        </label>
      </div>
    `).join("")
    : `<div class="empty">Ko ustvaris batch, se tukaj ustvarijo naloge.</div>`;
}

function toggleTask(batchId, index) {
  const batch = state.batches.find((item) => item.id === batchId);
  batch.tasks[index].done = !batch.tasks[index].done;
  saveState();
  renderAutomation();
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `mikropivovarna-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      state = {
        ingredients: imported.ingredients ?? [],
        packaging: imported.packaging ?? [],
        recipes: imported.recipes ?? [],
        batches: imported.batches ?? [],
        purchases: imported.purchases ?? [],
        products: imported.products ?? [],
        orders: imported.orders ?? []
      };
      state = normalizeState(state);
      saveState();
      renderAll();
    } catch {
      alert("Datoteka ni veljaven JSON izvoz aplikacije.");
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}
