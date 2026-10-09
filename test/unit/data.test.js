const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadBundle } = require("../helpers/load-bundle");
const { makeEntry } = require("../fixtures/entries");

function payload(overrides = {}) {
  return {
    category: "MQL5",
    title: "Title",
    symptom: "symptom",
    tried: "tried",
    rootCause: "root cause",
    fix: "fix",
    lesson: "lesson",
    ...overrides,
  };
}

function ids(entries) {
  return Array.from(entries, (entry) => entry.id);
}

// ── Reads ────────────────────────────────────────────────────────────────

test("getEntries returns the current store reference", () => {
  const app = loadBundle();
  const sample = [makeEntry({ id: "a" })];
  app.__test.setEntriesState(sample);
  assert.equal(app.getEntries(), sample);
});

test("findEntryIndexById finds an entry by id", () => {
  const app = loadBundle();
  app.__test.setEntriesState([makeEntry({ id: "a" }), makeEntry({ id: "b" })]);
  assert.equal(app.findEntryIndexById("b"), 1);
});

test("findEntryIndexById returns -1 when the id is absent", () => {
  const app = loadBundle();
  app.__test.setEntriesState([makeEntry({ id: "a" })]);
  assert.equal(app.findEntryIndexById("missing"), -1);
});

test("findEntryIndexById compares ids as strings", () => {
  const app = loadBundle();
  app.__test.setEntriesState([makeEntry({ id: 1 })]);
  assert.equal(app.findEntryIndexById("1"), 0);
});

test("findEntryById returns the matching entry", () => {
  const app = loadBundle();
  const entry = makeEntry({ id: "a" });
  app.__test.setEntriesState([entry]);
  assert.equal(app.findEntryById("a"), entry);
});

test("findEntryById returns undefined when not found", () => {
  const app = loadBundle();
  app.__test.setEntriesState([makeEntry({ id: "a" })]);
  assert.equal(app.findEntryById("missing"), undefined);
});

// ── fetchEntries ─────────────────────────────────────────────────────────

test("fetchEntries replaces the store with the response array", async () => {
  const app = loadBundle();
  const before = app.getEntries();
  app.__axios.on("get", { data: [makeEntry({ id: "a" }), makeEntry({ id: "b" })] });

  const result = await app.fetchEntries();

  assert.deepEqual(ids(result), ["a", "b"]);
  assert.equal(app.getEntries(), result);
  assert.notEqual(app.getEntries(), before);
});

test("fetchEntries calls GET on the configured API URL", async () => {
  const app = loadBundle();
  app.__axios.on("get", { data: [] });
  await app.fetchEntries();

  assert.equal(app.__axios.calls.length, 1);
  assert.equal(app.__axios.calls[0].method, "get");
  assert.equal(app.__axios.calls[0].url, app.__test.getApiUrl());
});

test("fetchEntries throws an unexpectedShape error for a non-array body", async () => {
  const app = loadBundle();
  app.__test.setEntriesState([makeEntry({ id: "a" })]);
  app.__axios.on("get", { data: { not: "an array" } });

  await assert.rejects(
    () => app.fetchEntries(),
    (error) => {
      assert.equal(error.unexpectedShape, true);
      assert.match(error.message, /Unexpected response shape/);
      return true;
    },
  );
  assert.deepEqual(ids(app.getEntries()), []);
});

test("fetchEntries propagates a request failure", async () => {
  const app = loadBundle();
  app.__axios.fail("get", new Error("network down"));
  await assert.rejects(() => app.fetchEntries(), /network down/);
});

// ── createEntry ──────────────────────────────────────────────────────────

test("createEntry posts the payload with a client-generated timestamp", async () => {
  const app = loadBundle();
  app.__test.setEntriesState([]);
  app.__axios.on("post", { data: makeEntry({ id: "new-1", title: "Created" }) });

  await app.createEntry(payload({ title: "Created" }));

  const call = app.__axios.calls[0];
  assert.equal(call.method, "post");
  assert.equal(call.url, app.__test.getApiUrl());
  assert.equal(call.body.title, "Created");
  assert.match(call.body.timestamp, /^\d{4}-\d{2}-\d{2}T/);
});

test("createEntry appends the server response to the store", async () => {
  const app = loadBundle();
  app.__test.setEntriesState([makeEntry({ id: "a" })]);

  const created = makeEntry({ id: "new-1" });
  app.__axios.on("post", { data: created });
  const result = await app.createEntry(payload());

  assert.equal(result, created);
  assert.deepEqual(ids(app.getEntries()), ["a", "new-1"]);
});

test("createEntry propagates a request failure without changing the store", async () => {
  const app = loadBundle();
  app.__test.setEntriesState([makeEntry({ id: "a" })]);
  app.__axios.fail("post", new Error("boom"));

  await assert.rejects(() => app.createEntry(payload()), /boom/);
  assert.deepEqual(ids(app.getEntries()), ["a"]);
});

// ── updateEntry ──────────────────────────────────────────────────────────

test("updateEntry preserves the stored id and timestamp", async () => {
  const app = loadBundle();
  app.__test.setEntriesState([
    makeEntry({ id: "a", timestamp: "2020-01-01T00:00:00Z", title: "Old" }),
  ]);
  app.__axios.on("put", { data: makeEntry({ id: "a", title: "New" }) });

  await app.updateEntry("a", payload({ title: "New" }));

  const call = app.__axios.calls[0];
  assert.equal(call.method, "put");
  assert.equal(call.url, `${app.__test.getApiUrl()}/a`);
  assert.equal(call.body.id, "a");
  assert.equal(call.body.timestamp, "2020-01-01T00:00:00Z");
});

test("updateEntry keeps a numeric id type and uses it in the URL", async () => {
  const app = loadBundle();
  app.__test.setEntriesState([makeEntry({ id: 7, timestamp: "2020-01-01T00:00:00Z" })]);
  app.__axios.on("put", { data: makeEntry({ id: 7, title: "New" }) });

  await app.updateEntry("7", payload({ title: "New" }));

  assert.equal(app.__axios.calls[0].body.id, 7);
  assert.equal(app.__axios.calls[0].url, `${app.__test.getApiUrl()}/7`);
});

test("updateEntry replaces the entry in the store", async () => {
  const app = loadBundle();
  app.__test.setEntriesState([makeEntry({ id: "a", title: "Old" })]);

  const updated = makeEntry({ id: "a", title: "New" });
  app.__axios.on("put", { data: updated });
  const result = await app.updateEntry("a", payload({ title: "New" }));

  assert.equal(result, updated);
  assert.equal(app.getEntries()[0], updated);
});

// ── deleteEntry ──────────────────────────────────────────────────────────

test("deleteEntry removes the matching entry from the store", async () => {
  const app = loadBundle();
  app.__test.setEntriesState([makeEntry({ id: "a" }), makeEntry({ id: "b" })]);
  app.__axios.on("delete", { data: {} });

  await app.deleteEntry("a");

  assert.equal(app.__axios.calls[0].method, "delete");
  assert.equal(app.__axios.calls[0].url, `${app.__test.getApiUrl()}/a`);
  assert.deepEqual(ids(app.getEntries()), ["b"]);
});

test("deleteEntry leaves the store unchanged for an unknown id", async () => {
  const app = loadBundle();
  app.__test.setEntriesState([makeEntry({ id: "a" })]);
  app.__axios.on("delete", { data: {} });

  await app.deleteEntry("missing");

  assert.deepEqual(ids(app.getEntries()), ["a"]);
});
