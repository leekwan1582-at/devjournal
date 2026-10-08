// ── Configuration ────────────────────────────────────────────────────────
const API_URL =
  document.querySelector('meta[name="api-url"]')?.content ||
  "http://localhost:3000/entries";

// Single source of truth for category options (form and filter are built from this)
const CATEGORY_OPTIONS = [
  "MQL5",
  "Data Pipeline",
  "Backtesting",
  "Infrastructure",
  "JavaScript",
];

// Axios instance with a timeout so a hung server surfaces as a handled error
const api = axios.create({ timeout: 8000 });

// ── Application State ────────────────────────────────────────────────────
let entriesState = [];

// ── Data Layer ───────────────────────────────────────────────────────────
// Owns the entries array. All reads go through getEntries() because
// fetchEntries() replaces the array, so callers must not hold on to it.

function getEntries() {
  return entriesState;
}

// Time: O(n), Space: O(1)
function findEntryIndexById(id) {
  return entriesState.findIndex((entry) => String(entry.id) === String(id));
}

// Time: O(n), Space: O(1)
function findEntryById(id) {
  const index = findEntryIndexById(id);
  return index === -1 ? undefined : entriesState[index];
}

async function fetchEntries() {
  const { data } = await api.get(API_URL);

  if (!Array.isArray(data)) {
    entriesState = [];
    const shapeError = new Error(
      `Unexpected response shape (expected array, got ${typeof data})`,
    );
    shapeError.unexpectedShape = true;
    throw shapeError;
  }

  entriesState = data;
  return entriesState;
}

async function createEntry(payload) {
  const response = await api.post(API_URL, {
    ...payload,
    timestamp: new Date().toISOString(),
  });
  entriesState.push(response.data);
  return response.data;
}

async function updateEntry(id, payload) {
  const index = findEntryIndexById(id);
  const existing = index !== -1 ? entriesState[index] : undefined;

  // Reuse the stored id and timestamp so PUT keeps the original id type and creation time
  const body = { ...payload, id: existing ? existing.id : id };
  if (existing?.timestamp) {
    body.timestamp = existing.timestamp;
  }

  const response = await api.put(`${API_URL}/${body.id}`, body);

  if (index !== -1) {
    entriesState[index] = response.data;
  }

  return response.data;
}

async function deleteEntry(id) {
  await api.delete(`${API_URL}/${id}`);

  const index = findEntryIndexById(id);
  if (index !== -1) {
    entriesState.splice(index, 1);
  }
}
