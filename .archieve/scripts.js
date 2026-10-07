// ── Application State ────────────────────────────────────────────────────
let activeEntry = null;
let editingEntry = null;
let searchTerm = "";
let categoryFilterValue = "ALL";
let sortOption = "default";

// ── DOM References ───────────────────────────────────────────────────────
const consoleContainer = document.getElementById("console-container");
const consoleOutput = document.getElementById("console-output");
const clearConsoleBtn = document.getElementById("clearConsoleBtn");
const listView = document.getElementById("listView");
const detailView = document.getElementById("detailView");
const detailCard = document.getElementById("detailCard");
const entriesList = document.getElementById("entriesList");
const entryModalElement = document.getElementById("entryModal");
const logForm = document.getElementById("logForm");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const sortSelect = document.getElementById("sortSelect");
const refreshBtn = document.getElementById("refreshBtn");
const themeToggleBtn = document.getElementById("themeToggleBtn");

// ── Console Output Panel ─────────────────────────────────────────────────
const CONSOLE_MAX_LINES = 100;

function logMessage(kind, text) {
  if (!consoleOutput) return; // guard if HTML hasn't loaded yet

  const line = document.createElement("div");
  line.className = `console-line console-line--${kind}`;
  line.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;

  consoleOutput.appendChild(line);

  // FIFO trim — drop oldest lines once we exceed the cap
  while (consoleOutput.childElementCount > CONSOLE_MAX_LINES) {
    consoleOutput.firstElementChild.remove();
  }

  consoleContainer.hidden = false;
  consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

function clearConsole() {
  if (!consoleOutput) return;
  consoleOutput.innerHTML = "";
  consoleContainer.hidden = true;
}

// ── Dialog Helpers ───────────────────────────────────────────────────────
function showToast(message, icon = "success") {
  if (typeof Swal === "undefined") return;

  Swal.fire({
    toast: true,
    position: "top-end",
    icon,
    title: message,
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true,
  });
}

function showErrorDialog(title, message) {
  if (typeof Swal === "undefined") return;

  Swal.fire({
    icon: "error",
    title,
    text: message,
  });
}

function describeRequestError(error) {
  if (error && error.response) {
    const status = error.response.status;
    if (status >= 500)
      return `Server error (${status}). Please try again later.`;
    if (status === 404) return "The requested entry was not found (404).";
    if (status >= 400) return `Request failed with status ${status}.`;
    return `Unexpected response (${status}).`;
  }

  if (error && error.code === "ECONNABORTED") return "The request timed out.";
  if (error && error.request)
    return "Network error. Is the JSON Server running?";
  return error && error.message ? error.message : "Unknown error.";
}

// ── Date Formatter Helper (as specified in Wireframe) ────────────────────
function formatDate(isoString) {
  if (!isoString) return "";
  const dateObj = new Date(isoString);
  if (Number.isNaN(dateObj.getTime())) return "";
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `[${year}-${month}-${day}]`;
}

// ── HTML Sanitization ────────────────────────────────────────────────────
const HTML_ESCAPE_MAP = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

// Time: O(n), Space: O(n)
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char]);
}

// ── Theme ────────────────────────────────────────────────────────────────
const THEME_KEY = "theme";
const THEME_CYCLE = ["light", "dark", "system"];
const THEME_ICONS = {
  light: "bi-sun",
  dark: "bi-moon-stars",
  system: "bi-circle-half",
};

function getStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return THEME_CYCLE.includes(stored) ? stored : "system";
  } catch (err) {
    console.warn("Unable to read theme preference:", err);
    return "system";
  }
}

function resolveTheme(preference) {
  if (preference === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return preference;
}

function updateThemeToggle(preference) {
  if (!themeToggleBtn) return;

  const icon = themeToggleBtn.querySelector("i");
  if (icon) {
    icon.className = `bi ${THEME_ICONS[preference]}`;
  }

  themeToggleBtn.title = `Theme: ${preference}`;
  themeToggleBtn.setAttribute(
    "aria-label",
    `Theme: ${preference}. Switch theme.`,
  );
}

function applyTheme(preference) {
  document.documentElement.setAttribute(
    "data-bs-theme",
    resolveTheme(preference),
  );
  updateThemeToggle(preference);
}

function setTheme(preference) {
  try {
    localStorage.setItem(THEME_KEY, preference);
  } catch (err) {
    console.warn("Unable to persist theme preference:", err);
  }
  applyTheme(preference);
}

function cycleTheme() {
  const current = getStoredTheme();
  const nextIndex = (THEME_CYCLE.indexOf(current) + 1) % THEME_CYCLE.length;
  setTheme(THEME_CYCLE[nextIndex]);
}

// ── Mobile View-State Toggle Helper ──────────────────────────────────────
const MOBILE_BREAKPOINT_PX = 768;
const RESIZE_DEBOUNCE_MS = 150;
const SEARCH_DEBOUNCE_MS = 150;

let isMobileLayout = null;

function showDetailViewMobile() {
  if (window.innerWidth < MOBILE_BREAKPOINT_PX) {
    listView.classList.add("d-none");
    detailView.classList.remove("d-none");
  }
}

function showListViewMobile() {
  listView.classList.remove("d-none");
  detailView.classList.add("d-none");
}

function applyResponsiveLayout() {
  const nextIsMobile = window.innerWidth < MOBILE_BREAKPOINT_PX;

  if (nextIsMobile === isMobileLayout) return;
  isMobileLayout = nextIsMobile;

  if (nextIsMobile) {
    showListViewMobile();
  } else {
    listView.classList.remove("d-none");
    detailView.classList.remove("d-none");
  }
}

function focusDetailPane() {
  if (isMobileLayout && detailCard !== null) {
    detailCard.focus();
  }
}

function focusListViewPane() {
  if (isMobileLayout && listView !== null) {
    listView.focus();
  }
}

// ── List State Helpers ───────────────────────────────────────────────────
function clearEntriesList() {
  if (typeof bootstrap !== "undefined") {
    entriesList
      .querySelectorAll('[data-bs-toggle="tooltip"]')
      .forEach((tooltipTrigger) => {
        const tooltipInstance = bootstrap.Tooltip.getInstance(tooltipTrigger);
        if (tooltipInstance) {
          tooltipInstance.dispose();
        }
      });
  }

  entriesList.innerHTML = "";
}

function renderListMessage(message) {
  clearEntriesList();

  const placeholder = document.createElement("p");
  placeholder.className = "text-muted text-center my-4";
  placeholder.textContent = message;
  entriesList.appendChild(placeholder);
}

// ── Filter and Sort ──────────────────────────────────────────────────────
function populateCategoryOptions() {
  const selectedCategory = categoryFilter.value;

  categoryFilter.innerHTML = "";
  const allOption = document.createElement("option");
  allOption.value = "ALL";
  allOption.textContent = "All Categories";
  categoryFilter.appendChild(allOption);

  const formCategorySelect = document.getElementById("category");
  formCategorySelect.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select Category";
  placeholder.disabled = true;
  placeholder.selected = true;
  formCategorySelect.appendChild(placeholder);

  CATEGORY_OPTIONS.forEach((category) => {
    const filterOption = document.createElement("option");
    filterOption.value = category;
    filterOption.textContent = category;
    categoryFilter.appendChild(filterOption);

    const formOption = document.createElement("option");
    formOption.value = category;
    formOption.textContent = category;
    formCategorySelect.appendChild(formOption);
  });

  categoryFilter.value = CATEGORY_OPTIONS.includes(selectedCategory)
    ? selectedCategory
    : "ALL";
}

// Time: O(n log n), Space: O(n)
function filterAndSortEntries(entries, options) {
  const query = options.searchTerm.trim().toLowerCase();

  const filtered = entries.filter((entry) => {
    if (options.category !== "ALL" && entry.category !== options.category)
      return false;
    if (query === "") return true;
    return [entry.title, entry.symptom, entry.fix].some((field) =>
      String(field).toLowerCase().includes(query),
    );
  });

  return sortEntries(filtered, options.sort);
}

// Time: O(n log n), Space: O(n)
function sortEntries(entries, sort) {
  const sorted = [...entries];

  if (sort === "date-desc") {
    return sorted.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
  if (sort === "date-asc") {
    return sorted.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }
  if (sort === "title-asc") {
    return sorted.sort((a, b) =>
      String(a.title).localeCompare(String(b.title)),
    );
  }
  if (sort === "category-asc") {
    return sorted.sort((a, b) =>
      String(a.category).localeCompare(String(b.category)),
    );
  }
  return sorted;
}

function applyFilters() {
  const allEntries = getEntries();

  if (allEntries.length === 0) {
    renderListMessage("No entries yet");
    return;
  }

  const visibleEntries = filterAndSortEntries(allEntries, {
    searchTerm,
    category: categoryFilterValue,
    sort: sortOption,
  });

  if (visibleEntries.length === 0) {
    renderListMessage("No matching entries");
    return;
  }

  renderEntriesList(visibleEntries);
}

// ── Fetch and Render Log Entries ─────────────────────────────────────────
async function refreshEntries() {
  logMessage("info", `Fetching entries from ${API_URL}`);
  renderListMessage("Loading…");

  try {
    await fetchEntries();

    const n = getEntries().length;
    logMessage("success", `Loaded ${n} ${n === 1 ? "entry" : "entries"}`);
    populateCategoryOptions();
    applyFilters();
  } catch (err) {
    if (err.unexpectedShape) {
      logMessage("warn", err.message);
      populateCategoryOptions();
      applyFilters();
      return;
    }

    logMessage("error", `Failed to load entries: ${err.message}`);
    console.error("Failed to load entries:", err);
    renderListMessage(describeRequestError(err));
  }
}

function renderEntriesList(entries) {
  clearEntriesList();

  if (!Array.isArray(entries)) {
    logMessage(
      "warn",
      `renderEntriesList expected an array, got ${typeof entries}`,
    );
    renderListMessage("No entries yet");
    return;
  }

  const allEntries = getEntries();

  entries.forEach((item) => {
    const card = document.createElement("div");
    card.className =
      "card shadow-sm cursor-pointer border-start border-4 border-primary";
    card.style.cursor = "pointer";
    card.dataset.entryId = item.id;
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", `View entry: ${item.title}`);

    if (activeEntry !== null && item.id === activeEntry.id) {
      card.classList.add("active-card");
    }

    card.innerHTML = `
      <div class="card-body p-3">
        <div class="d-flex justify-content-between align-items-center mb-1">
          <span class="badge bg-secondary">${escapeHtml(item.category)}</span>
          <span class="small text-muted">Record ${allEntries.indexOf(item) + 1}/${allEntries.length} · ${formatDate(item.timestamp)}</span>
        </div>
        <h3 class="h6 card-title mb-1 fw-bold">${escapeHtml(item.title)}</h3>
        <div class="d-flex justify-content-between align-items-center mt-2">
          <span class="small text-primary">Tap to view details</span>
          <div class="d-flex align-items-center gap-2">
            <div class="card-actions d-flex align-items-center gap-1">
              <button type="button" class="btn btn-outline-primary btn-sm card-edit-btn" title="Edit Entry" data-bs-toggle="tooltip" data-bs-title="Edit Entry" aria-label="Edit Entry"><i class="bi bi-pencil"></i></button>
              <button type="button" class="btn btn-outline-danger btn-sm card-delete-btn" title="Delete Entry" data-bs-toggle="tooltip" data-bs-title="Delete Entry" aria-label="Delete Entry"><i class="bi bi-trash3"></i></button>
            </div>
            <i class="bi bi-chevron-right text-muted" aria-hidden="true"></i>
          </div>
        </div>
      </div>
    `;

    card.addEventListener("click", (event) => {
      if (event.target.closest(".card-actions")) return;
      renderDetailedView(item);
    });

    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (event.target.closest(".card-actions")) return;
      event.preventDefault();
      renderDetailedView(item);
    });

    entriesList.appendChild(card);

    card.querySelector(".card-delete-btn").addEventListener("click", () => {
      handleDeleteEntry(item);
    });

    card.querySelector(".card-edit-btn").addEventListener("click", () => {
      openEditForm(item);
    });

    // Buttons are created on the fly, so initialize their tooltips after insertion
    if (typeof bootstrap !== "undefined") {
      card
        .querySelectorAll('[data-bs-toggle="tooltip"]')
        .forEach((tooltipTrigger) => {
          new bootstrap.Tooltip(tooltipTrigger);
        });
    }
  });
}

function renderDetailedView(entry) {
  activeEntry = entry;
  const detailContainer = document.getElementById("detailContent");
  const actionGroup = document.getElementById("detailActionGroup");
  const allEntries = getEntries();
  const recordPosition = allEntries.indexOf(entry) + 1;

  actionGroup.classList.remove("d-none");
  detailContainer.innerHTML = `
    <div class="mb-3">
      <span class="text-muted small">Entry ID: ${escapeHtml(entry.id)}</span><br/>
      <span class="badge bg-primary me-2">${escapeHtml(entry.category)}</span>
      <span class="text-muted small">Timestamp: ${formatDate(entry.timestamp)}</span>
      <span class="text-muted small ms-2">Record ${recordPosition}/${allEntries.length}</span>
    </div>
    <h2 class="h4 fw-bold mb-3">${formatDate(entry.timestamp)} ${escapeHtml(entry.title)}</h2>

    <div class="mb-2"><strong>Symptom:</strong><p class="text-secondary mb-1">${escapeHtml(entry.symptom)}</p></div>
    <div class="mb-2"><strong>Tried:</strong><p class="text-secondary mb-1">${escapeHtml(entry.tried)}</p></div>
    <div class="mb-2"><strong>Root Cause:</strong><p class="text-secondary mb-1">${escapeHtml(entry.rootCause)}</p></div>
    <div class="mb-2"><strong>Fix:</strong><p class="text-secondary mb-1">${escapeHtml(entry.fix)}</p></div>
    <div class="mb-2"><strong>Lesson:</strong><p class="text-secondary mb-1">${escapeHtml(entry.lesson)}</p></div>
  `;

  highlightActiveCard(entry.id);
  showDetailViewMobile();
  focusDetailPane();
}

function highlightActiveCard(entryId) {
  entriesList.querySelectorAll(".card").forEach((card) => {
    card.classList.toggle(
      "active-card",
      card.dataset.entryId === String(entryId),
    );
  });
}

// ── CRUD: Delete ─────────────────────────────────────────────────────────
async function confirmDelete(entryLabel) {
  if (typeof Swal === "undefined") {
    return window.confirm(`Delete "${entryLabel}"? This cannot be undone.`);
  }

  const result = await Swal.fire({
    title: "Delete entry?",
    text: `"${entryLabel}" will be permanently removed.`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Delete",
    confirmButtonColor: "#dc3545",
    cancelButtonText: "Cancel",
    reverseButtons: true,
  });

  return result.isConfirmed;
}

function resetDetailView() {
  activeEntry = null;
  highlightActiveCard(null);
  document.getElementById("detailActionGroup").classList.add("d-none");
  document.getElementById("detailContent").innerHTML = `
    <p class="text-muted text-center my-5">Select an entry from the list to view full details.</p>
  `;
}

async function handleDeleteEntry(entry) {
  const entryId = entry.id;

  logMessage("info", `Deleting entry ${entryId}`);

  const confirmed = await confirmDelete(entry.title);
  if (!confirmed) {
    logMessage("info", `Deleting entry cancel ${entryId}`);
    return;
  }

  try {
    await deleteEntry(entryId);

    resetDetailView();
    applyFilters();

    showListViewMobile();
    logMessage("success", `Deleted entry ${entryId}`);
    showToast("Entry deleted");
  } catch (err) {
    logMessage("error", `Failed to delete entry: ${err.message}`);
    console.error("Failed to delete entry:", err);
    showErrorDialog("Delete failed", describeRequestError(err));
    applyFilters();
  }
}

// ── Entry Modal (Bootstrap when available, manual fallback otherwise) ────
function getEntryModal() {
  if (
    typeof bootstrap === "undefined" ||
    typeof bootstrap.Modal === "undefined"
  )
    return null;
  return bootstrap.Modal.getOrCreateInstance(entryModalElement);
}

function showEntryModal() {
  const entryModal = getEntryModal();
  if (entryModal !== null) {
    entryModal.show();
    return;
  }

  entryModalElement.classList.add("show");
  entryModalElement.style.display = "block";
  entryModalElement.setAttribute("aria-modal", "true");
  entryModalElement.removeAttribute("aria-hidden");
  document.body.classList.add("modal-open");
  document.body.style.overflow = "hidden";

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop fade show";
  backdrop.id = "entryModalBackdrop";
  document.body.appendChild(backdrop);
}

function hideEntryModal() {
  const entryModal = getEntryModal();
  if (entryModal !== null) {
    entryModal.hide();
    return;
  }

  entryModalElement.classList.remove("show");
  entryModalElement.style.display = "none";
  entryModalElement.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  document.body.style.overflow = "";

  const backdrop = document.getElementById("entryModalBackdrop");
  if (backdrop !== null) {
    backdrop.remove();
  }

  resetEntryForm();
}

function resetEntryForm() {
  editingEntry = null;
  logForm.reset();
  document.getElementById("entryId").value = "";
}

// ── CRUD: Edit ───────────────────────────────────────────────────────────
function populateEntryForm(entry) {
  document.getElementById("entryId").value = entry.id;
  document.getElementById("category").value = entry.category;
  document.getElementById("title").value = entry.title;
  document.getElementById("symptom").value = entry.symptom;
  document.getElementById("tried").value = entry.tried;
  document.getElementById("rootCause").value = entry.rootCause;
  document.getElementById("fix").value = entry.fix;
  document.getElementById("lesson").value = entry.lesson;
  document.getElementById("formModalTitle").textContent = "Edit Entry";
}

function collectEntryFormPayload() {
  return {
    category: document.getElementById("category").value.trim(),
    title: document.getElementById("title").value.trim(),
    symptom: document.getElementById("symptom").value.trim(),
    tried: document.getElementById("tried").value.trim(),
    rootCause: document.getElementById("rootCause").value.trim(),
    fix: document.getElementById("fix").value.trim(),
    lesson: document.getElementById("lesson").value.trim(),
  };
}

function validateEntryPayload(payload) {
  return Object.values(payload).every((value) => value.length > 0);
}

function openEditForm(entry) {
  editingEntry = entry;
  populateEntryForm(entry);
  showEntryModal();
}

// ── CRUD: Create ─────────────────────────────────────────────────────────
function openCreateForm() {
  resetEntryForm();
  document.getElementById("formModalTitle").textContent = "Create New Entry";
  showEntryModal();
}

async function handleEntryFormSubmit(event) {
  event.preventDefault();

  const isCreate = editingEntry === null;
  const payload = collectEntryFormPayload();

  if (!validateEntryPayload(payload)) {
    if (typeof Swal !== "undefined") {
      Swal.fire({
        icon: "warning",
        title: "Missing fields",
        text: "All fields are required.",
      });
    }
    return;
  }

  try {
    if (isCreate) {
      const createdEntry = await createEntry(payload);
      hideEntryModal();
      applyFilters();
      logMessage("success", `Created entry ${createdEntry.id}`);
      showToast("Entry created");
      return;
    }

    const updatedEntryId = editingEntry.id;
    const updatedEntry = await updateEntry(editingEntry.id, payload);

    hideEntryModal();
    applyFilters();
    renderDetailedView(updatedEntry);
    logMessage("success", `Updated entry ${updatedEntryId}`);
    showToast("Entry updated");
  } catch (err) {
    const action = isCreate ? "create" : "update";
    logMessage("error", `Failed to ${action} entry: ${err.message}`);
    console.error(`Failed to ${action} entry:`, err);
    showErrorDialog(
      isCreate ? "Create failed" : "Update failed",
      describeRequestError(err),
    );
  }
}

// ── Keyboard Helpers ─────────────────────────────────────────────────────
function isTypingTarget(target) {
  if (!(target instanceof HTMLElement)) return false;

  const tagName = target.tagName;
  return (
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT" ||
    target.isContentEditable
  );
}

// ── DOM Event Listeners ──────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  applyTheme(getStoredTheme());
  themeToggleBtn.addEventListener("click", cycleTheme);
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      if (getStoredTheme() === "system") {
        applyTheme("system");
      }
    });

  refreshEntries();
  applyResponsiveLayout();

  document.getElementById("backToListBtn").addEventListener("click", () => {
    showListViewMobile();
    focusListViewPane();
  });
  clearConsoleBtn.addEventListener("click", clearConsole);

  document.getElementById("deleteEntryBtn").addEventListener("click", () => {
    if (activeEntry !== null) {
      handleDeleteEntry(activeEntry);
    }
  });

  document.getElementById("editEntryBtn").addEventListener("click", () => {
    if (activeEntry !== null) {
      openEditForm(activeEntry);
    }
  });

  document
    .getElementById("openFormBtn")
    .addEventListener("click", openCreateForm);

  // Search / category / sort / refresh controls
  let searchTimeoutId = null;
  searchInput.addEventListener("input", () => {
    if (searchTimeoutId !== null) {
      clearTimeout(searchTimeoutId);
    }
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

  logForm.addEventListener("submit", handleEntryFormSubmit);
  entryModalElement.addEventListener("hidden.bs.modal", resetEntryForm);

  // Manual dismiss handlers cover the case where Bootstrap JS is unavailable
  entryModalElement.addEventListener("click", (event) => {
    if (event.target.closest('[data-bs-dismiss="modal"]')) {
      hideEntryModal();
    }
  });
  //"entryModalBackdrop" is the string ID of a specific HTML element, likely representing the dark, semi-transparent background
  //  (backdrop) that appears behind a pop-up window (modal)
  document.addEventListener("click", (event) => {
    if (event.target.id === "entryModalBackdrop") {
      hideEntryModal();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (entryModalElement.classList.contains("show")) {
        hideEntryModal();
      } else {
        resetDetailView();
        showListViewMobile();
      }
      return;
    }

    if (
      event.key === "n" &&
      !entryModalElement.classList.contains("show") &&
      !isTypingTarget(event.target)
    ) {
      openCreateForm();
    }
  });

  // Responsive window resize watch (debounced, handles both grow and shrink)
  let resizeTimeoutId = null;
  window.addEventListener("resize", () => {
    if (resizeTimeoutId !== null) {
      clearTimeout(resizeTimeoutId);
    }
    resizeTimeoutId = setTimeout(applyResponsiveLayout, RESIZE_DEBOUNCE_MS);
  });
});
