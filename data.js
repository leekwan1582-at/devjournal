/**
 * @file Axios-backed data layer for TraceDiary: API configuration, the
 *       in-memory entries store, and CRUD operations over JSON Server.
 *
 *       UI concerns (rendering, events, filters, theme) live in scripts.js,
 *       which consumes the getEntries, findEntryById, fetchEntries,
 *       createEntry, updateEntry, and deleteEntry functions defined here.
 * @module data
 */

// ── Type Definitions ─────────────────────────────────────────────────────

/**
 * A single TraceDiary log entry as stored by the API.
 * @typedef {Object} Entry
 * @property {string|number} id         Unique identifier.
 * @property {string}        category   One of CATEGORY_OPTIONS.
 * @property {string}        title
 * @property {string}        symptom
 * @property {string}        tried
 * @property {string}        rootCause
 * @property {string}        fix
 * @property {string}        lesson
 * @property {string}        timestamp  ISO 8601 date-time string.
 */

/**
 * Editable fields captured from the entry form, all trimmed strings.
 * Excludes `id` and `timestamp`, which the data layer owns.
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
 * Minimal HTTP response shape as seen by axios error handling.
 * @typedef {Object} HttpResponse
 * @property {number} status
 * @property {string} [statusText]
 */

/**
 * Axios-style error produced by a request. {@link fetchEntries} additionally
 * sets `unexpectedShape` when the response body is not an array.
 * @typedef {Error} RequestError
 * @property {boolean}      [unexpectedShape]  Set when the response shape was wrong.
 * @property {HttpResponse} [response]         Present on HTTP error responses.
 * @property {*}            [request]          Present when sent but no response arrived.
 * @property {string}       [code]             Axios error code (e.g. "ECONNABORTED").
 */

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

/**
 * Get the current entries store.
 *
 * The array reference may change after {@link fetchEntries}, so callers
 * must not cache it across fetches.
 * @returns {Entry[]}
 * @see fetchEntries
 */
function getEntries() {
  return entriesState;
}

// Time: O(n), Space: O(1)
/**
 * Find the index of an entry by id.
 * @param {string|number} id
 * @returns {number} Index in the store, or -1 if not found.
 */
function findEntryIndexById(id) {
  return entriesState.findIndex((entry) => String(entry.id) === String(id));
}

// Time: O(n), Space: O(1)
/**
 * Find an entry by id.
 * @param {string|number} id
 * @returns {Entry|undefined}
 * @see findEntryIndexById
 */
function findEntryById(id) {
  const index = findEntryIndexById(id);
  return index === -1 ? undefined : entriesState[index];
}

/**
 * Load all entries from the API and replace the in-memory store.
 *
 * The store array is replaced (not mutated in place), so any reference
 * previously returned by {@link getEntries} becomes stale.
 * @returns {Promise<Entry[]>} The freshly loaded entries.
 * @throws {RequestError} On HTTP/network failure, or with `unexpectedShape`
 *         set when the response body is not an array.
 * @see getEntries
 */
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

/**
 * Create an entry via POST and append it to the store.
 *
 * The store gains a server-assigned `id` and a client-generated
 * `timestamp`; callers supply only the editable fields.
 * @param {EntryPayload} payload
 * @returns {Promise<Entry>} The created entry, including its id.
 * @throws {RequestError}
 * @see updateEntry
 */
async function createEntry(payload) {
  const response = await api.post(API_URL, {
    ...payload,
    timestamp: new Date().toISOString(),
  });
  entriesState.push(response.data);
  return response.data;
}

/**
 * Update an entry via PUT and replace it in the store.
 *
 * Reuses the stored `id` and `timestamp` so the update preserves the
 * original identifier type and creation time.
 * @param {string|number} id
 * @param {EntryPayload} payload
 * @returns {Promise<Entry>} The updated entry returned by the API.
 * @throws {RequestError}
 * @see createEntry
 */
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

/**
 * Delete an entry via DELETE and remove it from the store.
 * Silently leaves the store unchanged if the id is not present.
 * @param {string|number} id
 * @returns {Promise<void>} Resolves once the server confirms deletion.
 * @throws {RequestError}
 * @see createEntry
 */
async function deleteEntry(id) {
  await api.delete(`${API_URL}/${id}`);

  const index = findEntryIndexById(id);
  if (index !== -1) {
    entriesState.splice(index, 1);
  }
}
