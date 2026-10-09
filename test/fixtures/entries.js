/**
 * Shared test fixtures.
 */

/**
 * Build an Entry with sensible defaults.
 * @param {Object} [overrides]
 * @returns {Object}
 */
function makeEntry(overrides = {}) {
  return {
    id: "entry-000",
    timestamp: "2026-01-01T00:00:00Z",
    category: "MQL5",
    title: "Placeholder",
    symptom: "",
    tried: "",
    rootCause: "",
    fix: "",
    lesson: "",
    ...overrides,
  };
}

const entries = [
  makeEntry({
    id: "a",
    timestamp: "2026-01-01T00:00:00Z",
    category: "MQL5",
    title: "Beta",
    symptom: "crash loop",
    fix: "reinit",
  }),
  makeEntry({
    id: "b",
    timestamp: "2026-03-01T00:00:00Z",
    category: "Data Pipeline",
    title: "Alpha",
    symptom: "oom",
    fix: "lazy frame",
  }),
  makeEntry({
    id: "c",
    timestamp: "2026-02-01T00:00:00Z",
    category: "MQL5",
    title: "Gamma",
    symptom: "none",
    fix: "none",
  }),
];

module.exports = { makeEntry, entries };
