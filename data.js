// ── Configuration ────────────────────────────────────────────────────────
const API_URL = document.querySelector('meta[name="api-url"]')?.content
  || "http://localhost:3000/entries";

// Interim single source of truth for category options
const CATEGORY_OPTIONS = ["MQL5", "Data Pipeline", "Backtesting", "Infrastructure", "Javascript"];

// ── Application State ────────────────────────────────────────────────────
let entriesState = [];

// ── Data Layer ───────────────────────────────────────────────────────────
// Owns the entries array; all reads go through getEntries() so callers never
// capture a stale reference when the store is replaced.

function getEntries() {
  return entriesState;
}

// Time: O(n), Space: O(1)
function findEntryIndexById(id) {
  return entriesState.findIndex((entry) => String(entry.id) === String(id));
}

async function fetchEntries() {
  const response = await axios.get(API_URL);

  if (!Array.isArray(response.data)) {
    entriesState.length = 0;
    const shapeError = new Error(`Unexpected response shape (expected array, got ${typeof response.data})`);
    shapeError.unexpectedShape = true;
    throw shapeError;
  }

  entriesState.length = 0;
  entriesState.push(...response.data);
  return entriesState;
}

async function createEntry(payload) {
  const response = await axios.post(API_URL, { ...payload, timestamp: new Date().toISOString() });
  entriesState.push(response.data);
  return response.data;
}

async function updateEntry(id, payload) {
  const index = findEntryIndexById(id);
  const body = { ...payload, id };

  if (index !== -1 && entriesState[index].timestamp) {
    body.timestamp = entriesState[index].timestamp;
  }

  const response = await axios.put(`${API_URL}/${id}`, body);

  if (index !== -1) {
    entriesState[index] = response.data;
  }

  return response.data;
}

async function deleteEntry(id) {
  await axios.delete(`${API_URL}/${id}`);

  const index = findEntryIndexById(id);
  if (index !== -1) {
    entriesState.splice(index, 1);
  }
}
