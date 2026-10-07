// TraceDiary application logic: DOM, events, rendering, filters.
// State and API calls live in data.js (getEntries, findEntryById, fetchEntries, createEntry, updateEntry, deleteEntry).

// ── UI Constants ─────────────────────────────────────────────────────────
const SEARCH_DEBOUNCE_MS = 250;
const MAX_CONSOLE_LINES = 200;

const FORM_FIELDS = [
  "category",
  "title",
  "symptom",
  "tried",
  "rootCause",
  "fix",
  "lesson",
];
const SEARCH_FIELDS = ["title", "symptom", "fix"];

const FIELD_LABELS = {
  category: "Category",
  title: "Title",
  symptom: "Symptom",
  tried: "Tried",
  rootCause: "Root Cause",
  fix: "Fix",
  lesson: "Lesson",
};

const CATEGORY_ICONS = {
  MQL5: "bi-cpu",
  "Data Pipeline": "bi-diagram-3",
  Backtesting: "bi-graph-up-arrow",
  Infrastructure: "bi-hdd-network",
  Javascript: "bi-filetype-js",
};
const DEFAULT_CATEGORY_ICON = "bi-journal-text";

// Detail pane fields in display order; mono fields render as code blocks
const DETAIL_FIELDS = [
  { key: "symptom", icon: "bi-exclamation-triangle", mono: true },
  { key: "tried", icon: "bi-tools" },
  { key: "rootCause", icon: "bi-diagram-2" },
  { key: "fix", icon: "bi-check2-circle", mono: true },
  { key: "lesson", icon: "bi-bookmark-star" },
];

// Sort lookup: dates are ISO 8601 strings, so string comparison is chronological
const SORTERS = {
  "date-desc": (a, b) => String(b.timestamp).localeCompare(String(a.timestamp)),
  "date-asc": (a, b) => String(a.timestamp).localeCompare(String(b.timestamp)),
  "title-asc": (a, b) => String(a.title).localeCompare(String(b.title)),
  "category-asc": (a, b) =>
    String(a.category).localeCompare(String(b.category)),
};

const THEME_CYCLE = ["system", "light", "dark"];
const THEME_ICONS = {
  system: "bi-circle-half",
  light: "bi-sun-fill",
  dark: "bi-moon-stars-fill",
};

// ── UI State ─────────────────────────────────────────────────────────────
let activeEntryId = null;
let searchTerm = "";
let categoryFilterValue = "ALL";
let sortOption = "default";

// ── DOM References ───────────────────────────────────────────────────────
const listView = document.getElementById("listView");
const detailView = document.getElementById("detailView");
const detailCard = document.getElementById("detailCard");
const detailHeaderTitle = document.getElementById("detailHeaderTitle");
const detailActionGroup = document.getElementById("detailActionGroup");
const detailContent = document.getElementById("detailContent");
const entriesList = document.getElementById("entriesList");

const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const sortSelect = document.getElementById("sortSelect");
const refreshBtn = document.getElementById("refreshBtn");
const themeToggleBtn = document.getElementById("themeToggleBtn");

const backToListBtn = document.getElementById("backToListBtn");
const editEntryBtn = document.getElementById("editEntryBtn");
const deleteEntryBtn = document.getElementById("deleteEntryBtn");
const openFormBtn = document.getElementById("openFormBtn");

const entryModalElement = document.getElementById("entryModal");
const entryModal = new bootstrap.Modal(entryModalElement);
const formModalTitle = document.getElementById("formModalTitle");
const logForm = document.getElementById("logForm");
const entryIdInput = document.getElementById("entryId");
const formCategorySelect = document.getElementById("category");
const submitFormBtn = document.getElementById("submitFormBtn");

const consoleContainer = document.getElementById("console-container");
const consoleOutput = document.getElementById("console-output");
const clearConsoleBtn = document.getElementById("clearConsoleBtn");

const MOBILE_QUERY = window.matchMedia("(max-width: 767.98px)");
const THEME_MEDIA = window.matchMedia("(prefers-color-scheme: dark)");

// ── Helpers ──────────────────────────────────────────────────────────────

function escapeHtml(value) {
  const entities = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return String(value ?? "").replace(/[&<>"']/g, (char) => entities[char]);
}

function formatDate(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function isTypingTarget(element) {
  return Boolean(
    element.closest("input, textarea, select, [contenteditable='true']"),
  );
}

function categoryBadgeHtml(category, extraClasses = "") {
  const icon = CATEGORY_ICONS[category] ?? DEFAULT_CATEGORY_ICON;
  return (
    `<span class="badge badge-category ${extraClasses}">` +
    `<i class="bi ${icon} me-1" aria-hidden="true"></i>${escapeHtml(category)}</span>`
  );
}

function describeRequestError(error) {
  if (error.unexpectedShape) {
    return error.message;
  }
  if (error.response) {
    return `Server responded with ${error.response.status} ${error.response.statusText || ""}`.trim();
  }
  if (error.code === "ECONNABORTED") {
    return "The request timed out. Check that JSON Server is running.";
  }
  if (error.request) {
    return `Cannot reach the API at ${API_URL}. Start JSON Server and try again.`;
  }
  return error.message || "Unknown error";
}

// ── Console Panel ────────────────────────────────────────────────────────

function logMessage(level, message) {
  const line = document.createElement("div");
  line.className = `console-line console-line--${level}`;
  line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  consoleOutput.appendChild(line);

  while (consoleOutput.childElementCount > MAX_CONSOLE_LINES) {
    consoleOutput.firstElementChild.remove();
  }

  consoleContainer.hidden = false;
  consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

function clearConsole() {
  consoleOutput.replaceChildren();
  consoleContainer.hidden = true;
}

// ── Dialogs (SweetAlert2 with native fallbacks) ──────────────────────────

function showToast(title, icon = "success") {
  if (typeof Swal === "undefined") {
    return;
  }
  Swal.fire({
    toast: true,
    position: "top-end",
    icon,
    title,
    showConfirmButton: false,
    timer: 2500,
    timerProgressBar: true,
  });
}

function showErrorDialog(title, text) {
  if (typeof Swal === "undefined") {
    window.alert(`${title}\n${text}`);
    return;
  }
  Swal.fire({ icon: "error", title, text });
}

async function confirmDelete(entryTitle) {
  if (typeof Swal === "undefined") {
    return window.confirm(`Delete "${entryTitle}"? This cannot be undone.`);
  }
  const result = await Swal.fire({
    icon: "warning",
    title: "Delete this entry?",
    text: entryTitle,
    showCancelButton: true,
    confirmButtonText: "Delete",
    confirmButtonColor: "#dc3545",
  });
  return result.isConfirmed;
}

// ── Theme ────────────────────────────────────────────────────────────────

function getStoredTheme() {
  try {
    const stored = localStorage.getItem("theme");
    return THEME_CYCLE.includes(stored) ? stored : "system";
  } catch (err) {
    return "system";
  }
}

function storeTheme(preference) {
  try {
    localStorage.setItem("theme", preference);
  } catch (err) {
    console.warn("Theme preference could not be saved:", err);
  }
}

// Held in memory so the toggle still cycles when localStorage is blocked
let themePreference = getStoredTheme();

function applyTheme(preference) {
  const resolved =
    preference === "system"
      ? THEME_MEDIA.matches
        ? "dark"
        : "light"
      : preference;
  document.documentElement.setAttribute("data-bs-theme", resolved);

  const label = `Theme: ${preference}. Switch theme.`;
  themeToggleBtn.title = `Theme: ${preference}`;
  themeToggleBtn.setAttribute("aria-label", label);
  themeToggleBtn.querySelector("i").className = `bi ${THEME_ICONS[preference]}`;
}

function cycleTheme() {
  themePreference =
    THEME_CYCLE[
      (THEME_CYCLE.indexOf(themePreference) + 1) % THEME_CYCLE.length
    ];
  storeTheme(themePreference);
  applyTheme(themePreference);
}

// ── Responsive Layout (list and detail swap on mobile) ───────────────────

function showDetailViewMobile() {
  if (!MOBILE_QUERY.matches) {
    return;
  }
  listView.classList.add("d-none");
  detailView.classList.remove("d-none");
  window.scrollTo({ top: 0 });
}

function showListViewMobile() {
  if (!MOBILE_QUERY.matches) {
    return;
  }
  detailView.classList.add("d-none");
  listView.classList.remove("d-none");
}

function applyResponsiveLayout() {
  if (MOBILE_QUERY.matches) {
    showListViewMobile();
  } else {
    listView.classList.remove("d-none");
    detailView.classList.remove("d-none");
  }
}

// ── List Rendering ───────────────────────────────────────────────────────

function renderListMessage(message, isError = false) {
  const paragraph = document.createElement("p");
  paragraph.className = `text-center my-4 ${isError ? "text-danger" : "text-body-secondary"}`;
  if (isError) {
    paragraph.setAttribute("role", "alert");
  }
  paragraph.textContent = message;
  entriesList.replaceChildren(paragraph);
}

function createOption(value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
}

function populateCategoryOptions() {
  const placeholder = createOption("", "Select Category");
  placeholder.disabled = true;
  placeholder.defaultSelected = true; // form.reset() returns to the placeholder, not the first category

  categoryFilter.replaceChildren(createOption("ALL", "All Categories"));
  formCategorySelect.replaceChildren(placeholder);

  CATEGORY_OPTIONS.forEach((category) => {
    categoryFilter.append(createOption(category, category));
    formCategorySelect.append(createOption(category, category));
  });
}

// Time: O(n log n) for sorting, Space: O(n)
function sortEntries(entries, sort) {
  const sorted = [...entries];
  return SORTERS[sort] ? sorted.sort(SORTERS[sort]) : sorted;
}

// Time: O(n * f) for n entries and f search fields, then O(n log n) sort
function filterAndSortEntries(entries, options) {
  const query = options.searchTerm.trim().toLowerCase();

  const filtered = entries.filter((entry) => {
    if (options.category !== "ALL" && entry.category !== options.category) {
      return false;
    }
    return (
      query === "" ||
      SEARCH_FIELDS.some((field) =>
        String(entry[field] ?? "")
          .toLowerCase()
          .includes(query),
      )
    );
  });

  return sortEntries(filtered, options.sort);
}

function createEntryCard(item, position, total) {
  const card = document.createElement("div");
  card.className = "card entry-card";
  card.dataset.entryId = item.id;
  card.dataset.category = item.category;
  card.setAttribute("role", "button");
  card.setAttribute("tabindex", "0");
  card.setAttribute("aria-label", `Open entry: ${item.title}`);

  if (String(item.id) === String(activeEntryId)) {
    card.classList.add("active-card");
  }

  card.innerHTML = `
    <div class="card-body py-2">
      <div class="d-flex justify-content-between align-items-start gap-2">
        <div class="min-w-0">
          <div class="mb-1">${categoryBadgeHtml(item.category)}</div>
          <h3 class="h6 fw-bold mb-1 card-title-text">${escapeHtml(item.title)}</h3>
          <div class="small text-body-secondary">Record ${position}/${total} · ${escapeHtml(formatDate(item.timestamp))}</div>
        </div>
        <div class="card-actions d-flex align-items-center gap-2">
          <button type="button" class="btn btn-outline-primary btn-sm card-edit-btn" title="Edit Entry" aria-label="Edit entry: ${escapeHtml(item.title)}"><i class="bi bi-pencil" aria-hidden="true"></i></button>
          <button type="button" class="btn btn-outline-danger btn-sm card-delete-btn" title="Delete Entry" aria-label="Delete entry: ${escapeHtml(item.title)}"><i class="bi bi-trash3" aria-hidden="true"></i></button>
          <i class="bi bi-chevron-right text-body-secondary d-md-none" aria-hidden="true"></i>
        </div>
      </div>
    </div>`;

  return card;
}

// Time: O(n), Space: O(n)
function renderEntriesList(entries) {
  const allEntries = getEntries();
  const positions = new Map(
    allEntries.map((entry, index) => [entry, index + 1]),
  );
  const cards = entries.map((item) =>
    createEntryCard(item, positions.get(item), allEntries.length),
  );
  entriesList.replaceChildren(...cards);
}

function applyFilters() {
  if (getEntries().length === 0) {
    renderListMessage("No entries yet. Tap + to log your first bug.");
    return;
  }

  const visibleEntries = filterAndSortEntries(getEntries(), {
    searchTerm,
    category: categoryFilterValue,
    sort: sortOption,
  });

  if (visibleEntries.length === 0) {
    renderListMessage("No entries match your search or filter.");
    return;
  }

  renderEntriesList(visibleEntries);
}

function clearFilters() {
  searchTerm = "";
  categoryFilterValue = "ALL";
  searchInput.value = "";
  categoryFilter.value = "ALL";
}

// ── Detail Rendering ─────────────────────────────────────────────────────

function highlightActiveCard() {
  entriesList.querySelectorAll(".entry-card").forEach((card) => {
    card.classList.toggle(
      "active-card",
      String(card.dataset.entryId) === String(activeEntryId),
    );
  });
}

// Fills the detail pane without changing navigation or focus
function renderDetailContent(entry) {
  activeEntryId = entry.id;
  highlightActiveCard();

  const position = getEntries().indexOf(entry) + 1;

  const fieldsHtml = DETAIL_FIELDS.map(
    ({ key, icon, mono }) => `
    <section class="mb-3">
      <h3 class="h6 fw-bold mb-1"><i class="bi ${icon} me-2" aria-hidden="true"></i>${FIELD_LABELS[key]}</h3>
      <p class="detail-text mb-0 ${mono ? "log-text-block" : "text-body-secondary"}">${escapeHtml(entry[key])}</p>
    </section>`,
  ).join("");

  detailContent.dataset.category = entry.category;
  detailContent.innerHTML = `
    <div class="mb-3 d-flex flex-wrap align-items-center gap-2">
      ${categoryBadgeHtml(entry.category)}
      <span class="small text-body-secondary">Record ${position}/${getEntries().length} · ${escapeHtml(formatDate(entry.timestamp))}</span>
    </div>
    <h2 class="h4 fw-bold mb-3">${escapeHtml(entry.title)}</h2>
    ${fieldsHtml}`;

  detailHeaderTitle.textContent = `Entry ${entry.id}`;
  detailActionGroup.classList.remove("d-none");
}

// Opens an entry from the list: render, switch panes on mobile, move focus
function renderDetailedView(entry) {
  renderDetailContent(entry);
  showDetailViewMobile();
  if (MOBILE_QUERY.matches) {
    detailCard.focus();
  }
}

function resetDetailView() {
  activeEntryId = null;
  highlightActiveCard();
  delete detailContent.dataset.category;
  detailHeaderTitle.textContent = "TraceDiary Entry";
  detailActionGroup.classList.add("d-none");
  detailContent.innerHTML =
    '<p class="text-body-secondary text-center my-5">Select an entry from the list to view full details.</p>';
}

// Keeps the open detail pane in step after the data is reloaded
function syncActiveEntry() {
  if (activeEntryId === null) {
    return;
  }
  const entry = findEntryById(activeEntryId);
  if (entry) {
    renderDetailContent(entry);
  } else {
    resetDetailView();
    showListViewMobile();
  }
}

// ── Loading ──────────────────────────────────────────────────────────────

async function refreshEntries() {
  renderListMessage("Loading entries…");
  refreshBtn.disabled = true;

  try {
    await fetchEntries();
    logMessage(
      "success",
      `GET ${API_URL}: loaded ${getEntries().length} entries`,
    );
    syncActiveEntry();
    applyFilters();
  } catch (err) {
    logMessage("error", `GET ${API_URL} failed: ${describeRequestError(err)}`);
    renderListMessage(describeRequestError(err), true);
  } finally {
    refreshBtn.disabled = false;
  }
}

// ── Form ─────────────────────────────────────────────────────────────────

function collectEntryFormPayload() {
  const payload = {};
  FORM_FIELDS.forEach((name) => {
    payload[name] = document.getElementById(name).value.trim();
  });
  return payload;
}

function getMissingFields(payload) {
  return FORM_FIELDS.filter((name) => payload[name] === "");
}

function populateEntryForm(entry) {
  entryIdInput.value = entry.id;
  FORM_FIELDS.forEach((name) => {
    document.getElementById(name).value = entry[name] ?? "";
  });
}

function resetEntryForm() {
  logForm.reset();
  entryIdInput.value = "";
}

function openCreateForm() {
  resetEntryForm();
  formModalTitle.textContent = "Create New Entry";
  entryModal.show();
}

function openEditForm(entry) {
  populateEntryForm(entry);
  formModalTitle.textContent = "Edit Entry";
  entryModal.show();
}

async function handleEntryFormSubmit(event) {
  event.preventDefault();

  const editId = entryIdInput.value;
  const isCreate = editId === "";
  const payload = collectEntryFormPayload();
  const missingFields = getMissingFields(payload);

  if (missingFields.length > 0) {
    const names = missingFields.map((name) => FIELD_LABELS[name]).join(", ");
    logMessage("warn", `Validation failed. Missing: ${names}`);
    if (typeof Swal !== "undefined") {
      Swal.fire({
        icon: "warning",
        title: "Missing fields",
        text: `Fill in: ${names}`,
      });
    }
    return;
  }

  submitFormBtn.disabled = true; // blocks double submits while the request runs

  try {
    const saved = isCreate
      ? await createEntry(payload)
      : await updateEntry(editId, payload);

    entryModal.hide();
    if (isCreate) {
      clearFilters(); // make sure the new entry is visible in the list
    }
    applyFilters();
    if (!isCreate) {
      renderDetailContent(saved);
    }

    logMessage("success", `${isCreate ? "POST" : "PUT"} ok: entry ${saved.id}`);
    showToast(isCreate ? "Entry created" : "Entry updated");
  } catch (err) {
    const message = describeRequestError(err);
    logMessage("error", `${isCreate ? "POST" : "PUT"} failed: ${message}`);
    showErrorDialog(
      isCreate ? "Could not create entry" : "Could not update entry",
      message,
    );
  } finally {
    submitFormBtn.disabled = false;
  }
}

// ── Delete ───────────────────────────────────────────────────────────────

async function handleDeleteEntry(entry) {
  const confirmed = await confirmDelete(entry.title);
  if (!confirmed) {
    logMessage("info", `Delete cancelled for entry ${entry.id}`);
    return;
  }

  try {
    await deleteEntry(entry.id);

    if (String(entry.id) === String(activeEntryId)) {
      resetDetailView();
      showListViewMobile();
    }
    applyFilters();

    logMessage("success", `DELETE ok: entry ${entry.id}`);
    showToast("Entry deleted");
  } catch (err) {
    const message = describeRequestError(err);
    logMessage("error", `DELETE failed: ${message}`);
    showErrorDialog("Could not delete entry", message);
  }
}

// ── Event Wiring ─────────────────────────────────────────────────────────

function entryFromEvent(event) {
  const card = event.target.closest(".entry-card");
  return card ? findEntryById(card.dataset.entryId) : undefined;
}

function handleListClick(event) {
  const entry = entryFromEvent(event);
  if (!entry) {
    return;
  }
  if (event.target.closest(".card-edit-btn")) {
    openEditForm(entry);
  } else if (event.target.closest(".card-delete-btn")) {
    handleDeleteEntry(entry);
  } else {
    renderDetailedView(entry);
  }
}

function handleListKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }
  // Let the Edit and Delete buttons handle their own keys
  if (event.target.closest(".card-actions")) {
    return;
  }
  const entry = entryFromEvent(event);
  if (!entry) {
    return;
  }
  event.preventDefault(); // stops Space from scrolling the page
  renderDetailedView(entry);
}

function handleGlobalKeydown(event) {
  // Escape inside dialogs belongs to the dialog, not the page
  if (typeof Swal !== "undefined" && Swal.isVisible()) {
    return;
  }
  if (entryModalElement.classList.contains("show")) {
    return;
  }

  if (event.key === "Escape") {
    resetDetailView();
    showListViewMobile();
  } else if (
    event.key === "n" &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    !isTypingTarget(event.target)
  ) {
    openCreateForm();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  let searchTimeoutId = null;

  applyTheme(themePreference);
  populateCategoryOptions();
  applyResponsiveLayout();
  refreshEntries();

  // List: one delegated pair of listeners covers every card
  entriesList.addEventListener("click", handleListClick);
  entriesList.addEventListener("keydown", handleListKeydown);

  // Controls
  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimeoutId);
    searchTimeoutId = setTimeout(() => {
      searchTerm = searchInput.value;
      applyFilters();
    }, SEARCH_DEBOUNCE_MS);
  });

  categoryFilter.addEventListener("change", () => {
    categoryFilterValue = categoryFilter.value;
    applyFilters();
  });

  sortSelect.addEventListener("change", () => {
    sortOption = sortSelect.value;
    applyFilters();
  });

  refreshBtn.addEventListener("click", refreshEntries);
  themeToggleBtn.addEventListener("click", cycleTheme);
  clearConsoleBtn.addEventListener("click", clearConsole);

  // Detail pane
  backToListBtn.addEventListener("click", () => {
    showListViewMobile();
    listView.focus();
  });

  editEntryBtn.addEventListener("click", () => {
    const entry = findEntryById(activeEntryId);
    if (entry) {
      openEditForm(entry);
    }
  });

  deleteEntryBtn.addEventListener("click", () => {
    const entry = findEntryById(activeEntryId);
    if (entry) {
      handleDeleteEntry(entry);
    }
  });

  // Form
  openFormBtn.addEventListener("click", openCreateForm);
  logForm.addEventListener("submit", handleEntryFormSubmit);
  entryModalElement.addEventListener("hidden.bs.modal", resetEntryForm);

  // Page-level
  document.addEventListener("keydown", handleGlobalKeydown);
  MOBILE_QUERY.addEventListener("change", applyResponsiveLayout);
  THEME_MEDIA.addEventListener("change", () => {
    if (themePreference === "system") {
      applyTheme("system");
    }
  });
});
