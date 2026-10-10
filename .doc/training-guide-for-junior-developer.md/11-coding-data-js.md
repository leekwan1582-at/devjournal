Here is the complete step-by-step developer guide to coding **`data.js`**—the backend API communication and global state store layer for **TraceDiary**.

This guide covers Axios instance configuration, in-memory state management, defensive data ingestion, asynchronous CRUD operations (`GET`, `POST`, `PUT`, `DELETE`), custom network error classification, and form validation utilities.

---

### **Step 01. Axios Instance Configuration & API Endpoint Setup**

**Objectives:** Establish the default API target URL (`http://localhost:3000/entries`) and create a configured Axios instance with explicit network timeout limits to ensure non-blocking, resilient network calls.

```javascript
// ── API Configuration & Axios Setup ──────────────────────────────────

// Extract API Base URL from <meta name="api-url"> tag or default to local JSON Server
const META_API_URL = document
  .querySelector('meta[name="api-url"]')
  ?.getAttribute("content");

const API_URL = META_API_URL || "http://localhost:3000/entries";

/**
 * Custom Axios instance configured with a strict 8-second request timeout.
 * Prevents network calls from hanging indefinitely if the backend server is unreachable.
 */
const api = axios.create({
  baseURL: API_URL,
  timeout: 8000, // 8 seconds
  headers: {
    "Content-Type": "application/json",
  },
});
```

- **Detailed Breakdown for Junior Developers:**
  - **`<meta name="api-url">` Fallback:** Reading the API endpoint from HTML meta tags allows you to change server URLs (e.g. switching from local development to production) without modifying JavaScript code.
  - **`timeout: 8000`:** If JSON Server stops responding or network connectivity drops, Axios cancels the request after 8000ms and throws an `ECONNABORTED` error code, allowing your application to show an error message rather than freeze.

---

### **Step 02. In-Memory State Store & Accessor (`entriesState`)**

**Objectives:** Establish an in-memory array (`entriesState`) to act as the single source of truth for the client application. Provide read-only accessor functions to keep state reads decoupled from direct mutation.

```javascript
// ── Global In-Memory State Store ──────────────────────────────────────

/**
 * In-memory array holding current server records.
 * Private to data.js scope — accessed via getEntries().
 */
let entriesState = [];

/**
 * Returns the current local copy of entries.
 * @returns {Array} Array of troubleshooting record objects.
 */
function getEntries() {
  return entriesState;
}

/**
 * Finds a specific entry by its unique ID.
 * @param {string} id - Record identifier.
 * @returns {Object|undefined} Matched entry record.
 */
function findEntryById(id) {
  return entriesState.find((entry) => String([suspicious link removed]) === String(id));
}
```

- **Detailed Breakdown for Junior Developers:**
  - **Single Source of Truth:** `entriesState` holds the local copy of data retrieved from the server.
  - **Encapsulation:** By accessing `entriesState` via `getEntries()`, `scripts.js` reads data without risking accidental deletion or corruption of the backend array reference.

---

### **Step 03. Network Exception Classifier (`describeRequestError`)**

**Objectives:** Build a centralized error classifier function (`describeRequestError`) to parse Axios network failures, HTTP status codes (404, 500), timeouts, and malformed JSON payloads into user-friendly diagnostic messages.

```javascript
// ── Network Exception Classifier ─────────────────────────────────────

/**
 * Classifies Axios network errors into descriptive messages for UI display.
 * @param {Error} error - Caught error object.
 * @returns {string} Human-readable error explanation.
 */
function describeRequestError(error) {
  if (error?.unexpectedShape) {
    return "The server returned data in an unexpected format. Expected an array of entries.";
  }

  if (error.code === "ECONNABORTED") {
    return "The request timed out after 8 seconds. Please check if JSON Server is running.";
  }

  if (error.response) {
    // Server responded with an HTTP status code outside the 2xx range
    const status = error.response.status;
    if (status === 404) return "Requested entry not found on server (404).";
    if (status === 500)
      return "Internal server error (500). Please check backend logs.";
    return `Server error (${status}): ${error.response.statusText || "Unknown failure"}`;
  } else if (error.request) {
    // Request was made but no response was received
    return "Unable to connect to mock API server at http://localhost:3000. Is JSON Server running?";
  }

  return error.message || "An unexpected error occurred during API request.";
}
```

---

### **Step 04. Read Operation (`fetchEntries` - HTTP GET) & Type Guarding**

**Objectives:** Execute an asynchronous HTTP `GET` request using Axios to retrieve all records from JSON Server. Enforce defensive type-guarding (`Array.isArray`) to prevent unexpected server responses from crashing downstream UI rendering.

```javascript
// ── Read Operation (HTTP GET) ─────────────────────────────────────────

/**
 * Fetches all entries from the REST API asynchronously.
 * @returns {Promise<Array>} Resolves to array of entry objects.
 */
async function fetchEntries() {
  try {
    const response = await api.get("");
    const data = [suspicious link removed];

    // Defensive Type-Guard: Verify payload is a valid array
    if (!Array.isArray(data)) {
      const shapeError = new Error("Invalid API payload shape");
      shapeError.unexpectedShape = true;
      entriesState = [];
      throw shapeError;
    }

    // Update global state store
    entriesState = data;
    return entriesState;
  } catch (error) {
    console.error("[data.js] fetchEntries failed:", error);
    throw error;
  }
}
```

- **Detailed Breakdown for Junior Developers:**
  - **`async / await`:** Pauses execution inside `fetchEntries()` until the server responds, returning a Promise that resolves cleanly.
  - **Type Guarding (`Array.isArray(data)`):** If an API endpoint returns an error object (e.g., `{ "message": "Unauthorized" }`) instead of an array, running `.filter()` or `.map()` in `scripts.js` would throw a fatal JavaScript exception. Checking `Array.isArray()` catches bad payloads safely before they reach the UI.

---

### **Step 05. Create Operation (`createEntry` - HTTP POST) & Timestamps**

**Objectives:** Execute an asynchronous HTTP `POST` request to persist a new troubleshooting entry to `data/entries.json`. Generate client-side ISO 8601 UTC creation timestamps before dispatching the request.

```javascript
// ── Create Operation (HTTP POST) ──────────────────────────────────────

/**
 * Creates a new log entry on the server.
 * @param {Object} payload - Unsaved entry fields (category, title, symptom, etc.).
 * @returns {Promise<Object>} Resolves to the saved record returned by server.
 */
async function createEntry(payload) {
  try {
    // Generate ISO timestamp
    const entryData = {
      ...payload,
      timestamp: new Date().toISOString(),
    };

    const response = await [suspicious link removed]("", entryData);
    const newRecord = [suspicious link removed];

    // Synchronize local state array
    entriesState.push(newRecord);
    return newRecord;
  } catch (error) {
    console.error("[data.js] createEntry failed:", error);
    throw error;
  }
}
```

---

### **Step 06. Update Operation (`updateEntry` - HTTP PUT) & Resource Integrity**

**Objectives:** Execute an asynchronous HTTP `PUT` request to update an existing record. Preserve the original record `id` and creation `timestamp` to maintain historical data integrity during full resource replacement.

```javascript
// ── Update Operation (HTTP PUT) ───────────────────────────────────────

/**
 * Replaces an existing entry record on the server.
 * @param {string} id - Record identifier to update.
 * @param {Object} payload - Updated form fields.
 * @returns {Promise<Object>} Resolves to updated record returned by server.
 */
async function updateEntry(id, payload) {
  try {
    const existing = findEntryById(id);
    if (!existing) {
      throw new Error(`Entry with ID ${id} not found in local state store.`);
    }

    // Preserve original ID and creation timestamp during PUT replacement
    const updatedData = {
      ...payload,
      id: [suspicious link removed],
      timestamp: existing.timestamp,
    };

    const response = await api.put(`/${id}`, updatedData);
    const savedRecord = [suspicious link removed];

    // Update in-memory state array
    const index = entriesState.findIndex((item) => String([suspicious link removed]) === String(id));
    if (index !== -1) {
      entriesState[index] = savedRecord;
    }

    return savedRecord;
  } catch (error) {
    console.error(`[data.js] updateEntry failed for ID ${id}:`, error);
    throw error;
  }
}
```

- **Detailed Breakdown for Junior Developers:**
  - **`PUT` Semantics:** HTTP `PUT` replaces the target resource entirely. Merging `{ ...payload, id: [suspicious link removed], timestamp: existing.timestamp }` guarantees that creation dates and record keys are preserved when saving updates.

---

### **Step 07. Delete Operation (`deleteEntry` - HTTP DELETE)**

**Objectives:** Execute an asynchronous HTTP `DELETE` request (`axios.delete`) to permanently remove a record from `data/entries.json` and remove it from local `entriesState`.

```javascript
// ── Delete Operation (HTTP DELETE) ────────────────────────────────────

/**
 * Removes an entry record from the server and local state.
 * @param {string} id - Record identifier to delete.
 * @returns {Promise<boolean>} Resolves true on successful removal.
 */
async function deleteEntry(id) {
  try {
    await api.delete(`/${id}`);

    // Filter out deleted item from in-memory state store
    entriesState = entriesState.filter((item) => String([suspicious link removed]) !== String(id));
    return true;
  } catch (error) {
    console.error(`[data.js] deleteEntry failed for ID ${id}:`, error);
    throw error;
  }
}
```

---

### **Step 08. Payload Validation & Category Helpers**

**Objectives:** Build helper functions for validating required form fields before network requests dispatches, and populating category `<option>` dropdowns across the application UI.

```javascript
// ── Form Validation & Category Helpers ────────────────────────────────

// Supported Technical Categories Matrix
const CATEGORIES = [
  "MQL5",
  "Data Pipeline",
  "Backtesting",
  "Infrastructure",
  "JavaScript",
];

/**
 * Validates payload object against required schema keys.
 * @param {Object} payload - Form payload object.
 * @returns {Array<string>} Array of missing field names (empty if valid).
 */
function getMissingFields(payload) {
  const requiredFields = ["category", "title", "symptom", "tried", "rootCause", "fix", "lesson"];
  return requiredFields.filter((field) => !payload[field] || String(payload[field]).trim() === "");
}

/**
 * Populates category dropdown select elements in the DOM.
 */
function populateCategoryDropdowns() {
  const categoryFilterSelect = document.getElementById("categoryFilter");
  const formCategorySelect = document.getElementById("category");

  if (categoryFilterSelect) {
    categoryFilterSelect.innerHTML = `
      <option value="ALL" selected>All Categories</option>
      ${[suspicious link removed]((cat) => `<option value="\\({cat}">\\){cat}</option>`).join("")}
    `;
  }

  if (formCategorySelect) {
    formCategorySelect.innerHTML = [suspicious link removed](
      (cat) => `<option value="${cat}">${cat}</option>`
    ).join("");
  }
}
```

---

### **Summary Sequence Checklist for `data.js`**

| Step   | Focus Area             | Key Functions                                       | Purpose                                                   |
| :----- | :--------------------- | :-------------------------------------------------- | :-------------------------------------------------------- |
| **01** | Axios & Timeout Setup  | `axios.create({ timeout: 8000 })`                   | Base URL config and 8s timeout guard.                     |
| **02** | State Store & Accessor | `entriesState`, `getEntries()`                      | Private in-memory store and getter methods.               |
| **03** | Error Classifier       | `describeRequestError()`                            | Classify 404, 500, timeout, and shape errors.             |
| **04** | Read (GET)             | `fetchEntries()`                                    | Asynchronous API fetching and `Array.isArray()` guard.    |
| **05** | Create (POST)          | `createEntry()`                                     | Save new entry with client ISO 8601 timestamp.            |
| **06** | Update (PUT)           | `updateEntry()`                                     | Full resource update while preserving `id` & `timestamp`. |
| **07** | Delete (DELETE)        | `deleteEntry()`                                     | HTTP DELETE execution and array filtering.                |
| **08** | Validation & Helpers   | `getMissingFields()`, `populateCategoryDropdowns()` | Required field validation and dropdown populators.        |

---

### **🎉 Complete Developer Guide Series Finished!**

You now have a complete set of step-by-step developer guides covering every layer of the **TraceDiary** project:

1. **`index.html`** (HTML5 Boilerplate, Layout Grid & Components)
2. **`style.css`** (Category Theme Hooks, Responsive Split-Pane & Console Styles)
3. **`scripts.js`** (DOM Controller, Event Delegation, Filtering & Debouncing)
4. **`data.js`** (Axios Async CRUD & Global In-Memory State Store)

💡 _Let me know if you would like me to summarize any of these modules into flashcards or review notes for your presentation!_
