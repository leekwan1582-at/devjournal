/**
 * @file TraceDiary application logic: DOM, events, rendering, filters.
 *       State and API calls live in data.js
 *       (getEntries, findEntryById, fetchEntries, createEntry, updateEntry, deleteEntry).
 * @module scripts
 */

// ── Type Definitions ─────────────────────────────────────────────────────

/**
 * A single TraceDiary log entry as stored by the API.
 * @typedef {Object} Entry
 * @property {string|number} id        Unique identifier.
 * @property {string}        category  One of CATEGORY_OPTIONS.
 * @property {string}        title
 * @property {string}        symptom
 * @property {string}        tried
 * @property {string}        rootCause
 * @property {string}        fix
 * @property {string}        lesson
 * @property {string}        timestamp ISO 8601 date-time string.
 */

/**
 * Payload collected from the entry form (all values trimmed).
 * @typedef {Object} EntryPayload
 * @property {string} category
 * @property {string} title
 * @property {string} symptom
 * @property {string} tried
 * @property {string} rootCause
 * @property {string} fix
 * @property {string} lesson
 */

/**
 * Current filter/sort state applied to the entry list.
 * @typedef {Object} FilterOptions
 * @property {string} searchTerm  Free-text query (may be empty).
 * @property {string} category    Category name or "ALL".
 * @property {string} sort        Key into SORTERS, or "default".
 */

/**
 * Minimal shape of an HTTP response as seen by axios error handling.
 * @typedef {Object} HttpResponse
 * @property {number} status
 * @property {string} [statusText]
 */

/**
 * Axios-style error augmented by the data layer.
 * @typedef {Error} RequestError
 * @property {boolean} [unexpectedShape]  Set by data.js when the response shape is wrong.
 * @property {HttpResponse} [response]    Present on HTTP errors.
 * @property {*} [request]                Present when the request was made but no response arrived.
 * @property {string} [code]              Axios error code (e.g. "ECONNABORTED").
 */

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
  JavaScript: "bi-filetype-js",
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
const aiReviewBtn = document.getElementById("aiReviewBtn");
const editEntryBtn = document.getElementById("editEntryBtn");
const deleteEntryBtn = document.getElementById("deleteEntryBtn");
const openFormBtn = document.getElementById("openFormBtn");

const entryModalElement = document.getElementById("entryModal");
let entryModal = null;
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

// ── Global Error Safety Net ──────────────────────────────────────────────
// Surface otherwise-unhandled errors in the on-screen console (and a dialog)
// instead of leaving them visible only in devtools.
window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  const message = reason && reason.message ? reason.message : String(reason);
  console.error("Unhandled promise rejection:", reason);
  logMessage("error", `Unhandled promise rejection: ${message}`);
  showErrorDialog("Unexpected error", message);
});

window.addEventListener("error", (event) => {
  if (!event.message) {
    return; // ignore resource-load errors (images, stylesheets), which have no message
  }
  console.error("Unexpected error:", event.error || event.message);
  logMessage("error", `Unexpected error: ${event.message}`);
  showErrorDialog("Unexpected error", event.message);
});

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Escape a value for safe insertion into HTML.
 * @param {*} value
 * @returns {string}
 */
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

/**
 * Format an ISO timestamp as a localized medium date + short time.
 * @param {string} isoString
 * @returns {string} Formatted date, or "Unknown date" if invalid.
 */
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

/**
 * @param {Element} element
 * @returns {boolean} True if the element is an editable input/textarea/select/contenteditable.
 */
function isTypingTarget(element) {
  return Boolean(
    element.closest("input, textarea, select, [contenteditable='true']"),
  );
}

/**
 * Render a category badge as HTML.
 * @param {string} category
 * @param {string} [extraClasses=""]
 * @returns {string}
 */
function categoryBadgeHtml(category, extraClasses = "") {
  const icon = CATEGORY_ICONS[category] ?? DEFAULT_CATEGORY_ICON;
  return (
    `<span class="badge badge-category ${extraClasses}">` +
    `<i class="bi ${icon} me-1" aria-hidden="true"></i>${escapeHtml(category)}</span>`
  );
}

/**
 * Turn an axios-style error into a human-readable message.
 *
 * Distinguishes between: shape errors from data.js (`unexpectedShape`),
 * HTTP responses, timeouts (`ECONNABORTED`), unreachable requests, and
 * everything else.
 *
 * @param {RequestError} error
 * @returns {string}
 */
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

/**
 * Append a timestamped line to the on-screen console.
 *
 * Trims the oldest lines once {@link MAX_CONSOLE_LINES} is exceeded,
 * unhides the console container, and auto-scrolls to the newest line.
 *
 * @param {"success"|"warn"|"error"|"info"} level  Drives the line's CSS class.
 * @param {string} message
 * @returns {void}
 */
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

/**
 * Empty the console output and hide the container.
 * @returns {void}
 */
function clearConsole() {
  consoleOutput.replaceChildren();
  consoleContainer.hidden = true;
}

// ── Dialogs (SweetAlert2 with native fallbacks) ──────────────────────────

/**
 * Show a top-end success toast via SweetAlert2.
 * No-op if Swal is unavailable.
 * @param {string} title
 * @param {string} [icon="success"]
 * @returns {void}
 */
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

/**
 * Show an error dialog via SweetAlert2, falling back to `window.alert`.
 * @param {string} title
 * @param {string} text
 * @returns {void}
 */
function showErrorDialog(title, text) {
  if (typeof Swal === "undefined") {
    window.alert(`${title}\n${text}`);
    return;
  }
  Swal.fire({ icon: "error", title, text });
}

/**
 * Ask the user to confirm deletion.
 *
 * Uses SweetAlert2 if available, otherwise `window.confirm`.
 *
 * @param {string} entryTitle  Shown in the confirmation text.
 * @returns {Promise<boolean>} True if the user confirmed.
 */
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

/**
 * Read the persisted theme preference from localStorage.
 * @returns {"system"|"light"|"dark"} Defaults to "system" if unset or storage is blocked.
 */
function getStoredTheme() {
  try {
    const stored = localStorage.getItem("theme");
    return THEME_CYCLE.includes(stored) ? stored : "system";
  } catch (err) {
    return "system";
  }
}

/**
 * Persist the theme preference to localStorage.
 * Swallows storage errors (private mode, quota, etc.).
 * @param {"system"|"light"|"dark"} preference
 * @returns {void}
 */
function storeTheme(preference) {
  try {
    localStorage.setItem("theme", preference);
  } catch (err) {
    console.warn("Theme preference could not be saved:", err);
  }
}

// Held in memory so the toggle still cycles when localStorage is blocked
let themePreference = getStoredTheme();

/**
 * Resolve a preference to a concrete theme and apply it to the document.
 *
 * "system" resolves via `prefers-color-scheme`. Also updates the toggle
 * button's icon, title, and aria-label.
 *
 * @param {"system"|"light"|"dark"} preference
 * @returns {void}
 */
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

/**
 * Advance to the next theme in {@link THEME_CYCLE}, persist it, and apply it.
 * @returns {void}
 */
function cycleTheme() {
  themePreference =
    THEME_CYCLE[
      (THEME_CYCLE.indexOf(themePreference) + 1) % THEME_CYCLE.length
    ];
  storeTheme(themePreference);
  applyTheme(themePreference);
}

// ── Responsive Layout (list and detail swap on mobile) ───────────────────

/**
 * On mobile only, hide the list view and show the detail view, then scroll to top.
 * @returns {void}
 */
function showDetailViewMobile() {
  if (!MOBILE_QUERY.matches) {
    return;
  }
  listView.classList.add("d-none");
  detailView.classList.remove("d-none");
  window.scrollTo({ top: 0 });
}

/**
 * On mobile only, hide the detail view and show the list view.
 * @returns {void}
 */
function showListViewMobile() {
  if (!MOBILE_QUERY.matches) {
    return;
  }
  detailView.classList.add("d-none");
  listView.classList.remove("d-none");
}

/**
 * Apply the correct list/detail visibility for the current viewport.
 * @returns {void}
 */
function applyResponsiveLayout() {
  if (MOBILE_QUERY.matches) {
    showListViewMobile();
  } else {
    listView.classList.remove("d-none");
    detailView.classList.remove("d-none");
  }
}

// ── List Rendering ───────────────────────────────────────────────────────

/**
 * Replace the list with a single status/error paragraph.
 * @param {string} message
 * @param {boolean} [isError=false]  Adds `text-danger` and `role="alert"`.
 * @returns {void}
 */
function renderListMessage(message, isError = false) {
  const paragraph = document.createElement("p");
  paragraph.className = `text-center my-4 ${isError ? "text-danger" : "text-body-secondary"}`;
  if (isError) {
    paragraph.setAttribute("role", "alert");
  }
  paragraph.textContent = message;
  entriesList.replaceChildren(paragraph);
}

/**
 * @param {string} value
 * @param {string} label
 * @returns {HTMLOptionElement}
 */
function createOption(value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
}

/**
 * Populate the category filter and form selects from {@link CATEGORY_OPTIONS}.
 * The form select gets a disabled placeholder that `form.reset()` returns to.
 * @returns {void}
 */
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

/**
 * Return a sorted copy of `entries` (original is not mutated).
 * Unknown sort keys fall through to the input order.
 * @param {Entry[]} entries
 * @param {string} sort  Key into {@link SORTERS}, or "default".
 * @returns {Entry[]}
 */
function sortEntries(entries, sort) {
  const sorted = [...entries];
  return SORTERS[sort] ? sorted.sort(SORTERS[sort]) : sorted;
}

/**
 * Filter entries by category and free-text search, then sort.
 *
 * Search is case-insensitive and matches any of {@link SEARCH_FIELDS}.
 * Time: O(n·f) for filtering, then O(n log n) for sorting.
 *
 * @param {Entry[]} entries
 * @param {FilterOptions} options
 * @returns {Entry[]}
 */
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

/**
 * Build an entry card with delegated-action buttons and a11y attributes.
 *
 * The card carries `data-entry-id` and `data-category`; it is focusable
 * (`tabindex="0"`, `role="button"`) and marked active if it matches
 * {@link activeEntryId}.
 *
 * @param {Entry} item
 * @param {number} position  1-based index of the entry in the unfiltered list.
 * @param {number} total     Total number of entries (unfiltered).
 * @returns {HTMLDivElement}
 */
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

/**
 * Replace the list DOM with cards for the given entries.
 *
 * Positions are computed against the full unfiltered list so a filtered
 * view still shows "Record 3/12" for the correct entry.
 *
 * @param {Entry[]} entries  Already filtered/sorted.
 * @returns {void}
 */
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

/**
 * Re-render the entry list using current filter/sort state.
 *
 * Handles the two empty states (no entries at all, no matches) and
 * delegates to {@link renderEntriesList} otherwise. If the currently open
 * entry is filtered out of the visible list, the detail pane is reset.
 *
 * @returns {void}
 * @see filterAndSortEntries
 * @see resetDetailView
 */
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

  if (
    activeEntryId !== null &&
    !visibleEntries.some((entry) => String(entry.id) === String(activeEntryId))
  ) {
    resetDetailView();
  }

  if (visibleEntries.length === 0) {
    renderListMessage("No entries match your search or filter.");
    return;
  }

  renderEntriesList(visibleEntries);
}

/**
 * Reset search and category filters to their defaults (does not re-render).
 * @returns {void}
 */
function clearFilters() {
  searchTerm = "";
  categoryFilterValue = "ALL";
  searchInput.value = "";
  categoryFilter.value = "ALL";
}

// ── Detail Rendering ─────────────────────────────────────────────────────

/**
 * Toggle the `active-card` class on list cards to match {@link activeEntryId}.
 * @returns {void}
 */
function highlightActiveCard() {
  entriesList.querySelectorAll(".entry-card").forEach((card) => {
    card.classList.toggle(
      "active-card",
      String(card.dataset.entryId) === String(activeEntryId),
    );
  });
}

/**
 * Fill the detail pane with an entry's data.
 *
 * Sets {@link activeEntryId}, highlights the matching list card, and
 * updates the header/actions. Does **not** change pane visibility or
 * move focus — use {@link renderDetailedView} for that.
 *
 * @param {Entry} entry
 * @returns {void}
 * @see renderDetailedView
 * @see resetDetailView
 */
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

/**
 * Open an entry from the list: fill the detail pane, swap panes on
 * mobile, and move focus to the detail card.
 *
 * @param {Entry} entry
 * @returns {void}
 * @see renderDetailContent
 */
function renderDetailedView(entry) {
  renderDetailContent(entry);
  showDetailViewMobile();
  if (MOBILE_QUERY.matches) {
    detailCard.focus();
  }
}

/**
 * Clear the detail pane back to its empty placeholder and deselect the list.
 * @returns {void}
 */
function resetDetailView() {
  activeEntryId = null;
  highlightActiveCard();
  delete detailContent.dataset.category;
  detailHeaderTitle.textContent = "TraceDiary Entry";
  detailActionGroup.classList.add("d-none");
  detailContent.innerHTML =
    '<p class="text-body-secondary text-center my-5">Select an entry from the list to view full details.</p>';
}

/**
 * Re-render the open detail pane after the underlying data has changed.
 *
 * If the active entry still exists, re-renders it; otherwise resets the
 * detail view and returns to the list on mobile. No-op if nothing is open.
 *
 * @returns {void}
 */
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

/**
 * Fetch all entries from the API and refresh the UI.
 *
 * Shows a loading message, disables the refresh button for the duration,
 * syncs any open detail pane, and re-applies filters. On error, logs
 * and renders the failure message in the list.
 *
 * @returns {Promise<void>} Resolves when the request settles (never rejects).
 */
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

/**
 * Read the form inputs into a trimmed payload keyed by field name.
 * @returns {EntryPayload}
 */
function collectEntryFormPayload() {
  const payload = {};
  FORM_FIELDS.forEach((name) => {
    const field = document.getElementById(name);
    payload[name] = field ? field.value.trim() : "";
  });
  return payload;
}

/**
 * @param {EntryPayload} payload
 * @returns {string[]} Names of fields whose value is empty.
 */
function getMissingFields(payload) {
  return FORM_FIELDS.filter((name) => payload[name] === "");
}

/**
 * Fill the entry form inputs from an existing entry.
 * @param {Entry} entry
 * @returns {void}
 */
function populateEntryForm(entry) {
  if (!entry) {
    throw new Error("populateEntryForm requires an entry");
  }
  entryIdInput.value = entry.id;
  FORM_FIELDS.forEach((name) => {
    const field = document.getElementById(name);
    if (field) {
      field.value = entry[name] ?? "";
    }
  });
}

/**
 * Reset the form to its pristine state and clear the hidden entry id.
 * @returns {void}
 */
function resetEntryForm() {
  logForm.reset();
  entryIdInput.value = "";
}

/**
 * Move focus out of the modal before Bootstrap sets `aria-hidden="true"`.
 *
 * Without this, Chrome logs "Blocked aria-hidden on an element because its
 * descendant retained focus" when the modal is dismissed while a control
 * inside it (e.g. the Cancel button) is focused.
 *
 * @returns {void}
 */
function blurEntryModalFocus() {
  const active = document.activeElement;
  if (active && entryModalElement.contains(active)) {
    active.blur();
  }
}

/**
 * Get the Bootstrap modal instance, creating it on first use.
 * @returns {Object|null} The modal instance, or null if Bootstrap is unavailable.
 */
function getEntryModal() {
  if (
    entryModal === null &&
    typeof bootstrap !== "undefined" &&
    typeof bootstrap.Modal !== "undefined"
  ) {
    entryModal = bootstrap.Modal.getOrCreateInstance(entryModalElement);
  }
  return entryModal;
}

/**
 * Open the modal in create mode.
 * @returns {void}
 */
function openCreateForm() {
  const modal = getEntryModal();
  if (modal === null) {
    logMessage("error", "Cannot open form: modal library unavailable");
    showErrorDialog("Form unavailable", "The entry form could not be opened.");
    return;
  }
  resetEntryForm();
  formModalTitle.textContent = "Create New Entry";
  modal.show();
}

/**
 * Open the modal in edit mode, pre-filled with `entry`.
 * @param {Entry} entry
 * @returns {void}
 */
function openEditForm(entry) {
  if (!entry) {
    logMessage("warn", "Edit requested but no entry is selected");
    showErrorDialog("Edit unavailable", "That entry could not be found.");
    return;
  }

  const modal = getEntryModal();
  if (modal === null) {
    logMessage("error", "Cannot open form: modal library unavailable");
    showErrorDialog("Form unavailable", "The entry form could not be opened.");
    return;
  }

  populateEntryForm(entry);
  formModalTitle.textContent = "Edit Entry";
  modal.show();
}

/**
 * Handle the entry form submission for both creating and updating entries.
 *
 * Determines create vs update from `entryIdInput.value`, validates required
 * fields, and either warns (and returns) or dispatches the appropriate API
 * call. On success: closes the modal, refreshes the list (clearing filters
 * on create so the new row is visible), updates the detail pane on edit,
 * and shows a toast. On failure: logs and shows an error dialog. The
 * submit button is disabled for the duration to prevent double submits.
 *
 * @param {SubmitEvent} event
 * @returns {Promise<void>} Never rejects; API errors are caught internally.
 * @see createEntry
 * @see updateEntry
 * @see collectEntryFormPayload
 * @see getMissingFields
 *
 * @example
 * logForm.addEventListener("submit", handleEntryFormSubmit);
 */
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

    const modal = getEntryModal();
    if (modal) {
      modal.hide();
    }
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

/**
 * Confirm and delete an entry, then refresh the list.
 *
 * If the deleted entry was open in the detail pane, the pane is reset
 * and (on mobile) the list is shown. Cancellations are logged and
 * otherwise no-op. API errors are logged and surfaced via
 * {@link showErrorDialog}.
 *
 * @param {Entry} entry
 * @returns {Promise<void>} Never rejects; API errors are caught internally.
 * @see confirmDelete
 * @see deleteEntry
 */
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

/**
 * Resolve the entry associated with a delegated list event.
 * @param {Event} event
 * @returns {Entry|undefined} The entry, or undefined if the event target is not inside an entry card.
 */
function entryFromEvent(event) {
  const card = event.target.closest(".entry-card");
  return card ? findEntryById(card.dataset.entryId) : undefined;
}

/**
 * Delegated click handler for the entry list.
 *
 * Edit-button clicks open the edit form; delete-button clicks start the
 * delete flow; any other click inside a card opens the detail view.
 *
 * @param {MouseEvent} event
 * @returns {void}
 */
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

/**
 * Delegated keyboard handler for the entry list.
 *
 * Enter/Space on a card opens the detail view. Keys originating from the
 * card's action buttons are ignored so the buttons can handle their own
 * activation.
 *
 * @param {KeyboardEvent} event
 * @returns {void}
 */
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

/**
 * Page-level keyboard shortcuts.
 *
 * - `Escape` — reset the detail view and return to the list on mobile.
 * - `n` — open the create form (unless a modifier key is held or the
 *   focus is in a typing target).
 *
 * Ignored while a SweetAlert2 dialog or the entry modal is open, so
 * their own Escape handling is not overridden.
 *
 * @param {KeyboardEvent} event
 * @returns {void}
 */
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

  // Create entry (floating action button)
  openFormBtn.addEventListener("click", openCreateForm);

  // Form submit (create / update)
  logForm.addEventListener("submit", handleEntryFormSubmit);

  // Move focus out before Bootstrap applies aria-hidden (a11y warning).
  entryModalElement.addEventListener("hide.bs.modal", blurEntryModalFocus);

  // Detail pane
  backToListBtn.addEventListener("click", () => {
    showListViewMobile();
    listView.focus();
  });

  deleteEntryBtn.addEventListener("click", () => {
    const entry = findEntryById(activeEntryId);
    if (entry) {
      handleDeleteEntry(entry);
    }
  });

  editEntryBtn.addEventListener("click", () => {
    const entry = findEntryById(activeEntryId);
    if (entry) {
      openEditForm(entry);
    }
  });

  aiReviewBtn.addEventListener("click", async () => {
    const entry = findEntryById(activeEntryId);
    if (!entry) {
      return;
    }
    aiReviewBtn.disabled = true;
    try {
      await requestAiReview(entry);
    } finally {
      aiReviewBtn.disabled = false;
    }
  });
});
