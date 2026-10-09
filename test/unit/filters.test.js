const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadBundle } = require("../helpers/load-bundle");
const { entries } = require("../fixtures/entries");

const app = loadBundle();

// Results are created inside the vm context (a different realm), so copy them
// into host arrays before deep comparisons.
function ids(options) {
  return Array.from(
    app
      .filterAndSortEntries(entries, {
        searchTerm: "",
        category: "ALL",
        sort: "default",
        ...options,
      })
      .map((entry) => entry.id),
  );
}

function sortedIds(sort) {
  return Array.from(app.sortEntries(entries, sort).map((entry) => entry.id));
}

test("sortEntries('default') returns a copy in the original order", () => {
  const result = app.sortEntries(entries, "default");
  assert.deepEqual(Array.from(result, (entry) => entry.id), entries.map((entry) => entry.id));
  assert.notEqual(result, entries);
});

test("sortEntries sorts by date descending", () => {
  assert.deepEqual(sortedIds("date-desc"), ["b", "c", "a"]);
});

test("sortEntries sorts by date ascending", () => {
  assert.deepEqual(sortedIds("date-asc"), ["a", "c", "b"]);
});

test("sortEntries sorts by title ascending", () => {
  assert.deepEqual(sortedIds("title-asc"), ["b", "a", "c"]);
});

test("sortEntries sorts by category ascending", () => {
  assert.deepEqual(sortedIds("category-asc"), ["b", "a", "c"]);
});

test("sortEntries does not mutate the input array", () => {
  const before = entries.map((entry) => entry.id);
  app.sortEntries(entries, "date-desc");
  assert.deepEqual(
    entries.map((entry) => entry.id),
    before,
  );
});

test("filterAndSortEntries filters by category", () => {
  assert.deepEqual(ids({ category: "MQL5" }), ["a", "c"]);
});

test("filterAndSortEntries searches the title case-insensitively", () => {
  assert.deepEqual(ids({ searchTerm: "alpha" }), ["b"]);
});

test("filterAndSortEntries searches the symptom", () => {
  assert.deepEqual(ids({ searchTerm: "crash" }), ["a"]);
});

test("filterAndSortEntries searches the fix", () => {
  assert.deepEqual(ids({ searchTerm: "lazy" }), ["b"]);
});

test("filterAndSortEntries combines category and search", () => {
  assert.deepEqual(ids({ category: "MQL5", searchTerm: "gamma" }), ["c"]);
});

test("filterAndSortEntries returns an empty array when nothing matches", () => {
  assert.deepEqual(ids({ searchTerm: "zzz" }), []);
});

test("filterAndSortEntries trims the search term", () => {
  assert.deepEqual(ids({ searchTerm: "  alpha  " }), ["b"]);
});
